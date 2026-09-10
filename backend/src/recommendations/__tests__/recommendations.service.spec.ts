jest.mock('natural', () => ({
  TfIdf: jest.fn().mockImplementation(() => ({
    addDocument: jest.fn(),
    listTerms: jest.fn().mockReturnValue([]),
    tfidf: jest.fn().mockReturnValue(0),
  })),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { RecommendationsService } from '../recommendations.service';
import { PrismaService } from '../../prisma/prisma.service';
import { TracksService } from '../../tracks/tracks.service';
import { TfIdfEngine } from '../tfidf-engine';
import { QueryType } from '@prisma/client';

describe('RecommendationsService QA Test Suite', () => {
  let service: RecommendationsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    listenHistory: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    tracks: {
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
    searchQuery: {
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
    queryTrackResult: {
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
  };

  const mockTracksService = {
    ensureCategoryPopulated: jest.fn().mockResolvedValue({ trackCount: 50, fromCache: true }),
    searchTracks: jest.fn().mockResolvedValue({ tracks: [] }),
    getTrackDetails: jest.fn(),
  };

  const mockTfIdfEngine = {
    computeRecommendations: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: TracksService, useValue: mockTracksService },
        { provide: TfIdfEngine, useValue: mockTfIdfEngine },
      ],
    }).compile();

    service = module.get<RecommendationsService>(RecommendationsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  const now = new Date('2026-09-09T12:00:00Z');

  // Helper generating a user history record
  const makeHistoryItem = (id: string, artist: string, daysAgo: number, playCount: number, liked: boolean, queryResults: any[] = []) => ({
    id: `hist_${id}`,
    userId: 'user-uuid-1',
    trackId: id,
    playCount,
    liked,
    lastPlayedAt: new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000),
    track: {
      youtubeVideoId: id,
      title: `Song ${id}`,
      artist,
      artistName: artist,
      isEmbeddable: true,
      genre: ['Pop', 'Rock'],
      tags: ['Pop', 'Rock', 'Live'],
      thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      viewCount: BigInt(500000),
      likeCount: BigInt(25000),
      queryResults,
    },
  });

  describe('getRecommendations', () => {
    it('TC-REC-01: returns tracks matching top artist via artist expansion signal', async () => {
      // 12 history tracks, where 'Coldplay' is the dominant artist
      const history = [
        ...Array.from({ length: 10 }, (_, i) => makeHistoryItem(`session_${i}`, 'Other Artist', 1, 1, false)),
        makeHistoryItem('coldplay_hist_1', 'Coldplay', 12, 10, true),
        makeHistoryItem('coldplay_hist_2', 'Coldplay', 15, 8, true),
      ];

      (mockPrismaService.listenHistory.findMany as jest.Mock).mockResolvedValue(history);

      // Candidate tracks returned by artist expansion query
      (mockPrismaService.tracks.findMany as jest.Mock).mockImplementation((query) => {
        if (query.where?.OR?.some((cond: any) => cond.artist?.equals === 'Coldplay' || cond.artist?.contains === 'Coldplay')) {
          return Promise.resolve([
            {
              youtubeVideoId: 'coldplay_cand_1',
              title: 'Yellow',
              artist: 'Coldplay',
              artistName: 'Coldplay',
              isEmbeddable: true,
              viewCount: BigInt(1000000),
              likeCount: BigInt(50000),
              thumbnailUrl: 'https://i.ytimg.com/vi/coldplay_cand_1/hqdefault.jpg',
              genre: ['Rock'],
              tags: ['Rock'],
            },
            {
              youtubeVideoId: 'coldplay_cand_2',
              title: 'Fix You',
              artist: 'Coldplay',
              artistName: 'Coldplay',
              isEmbeddable: true,
              viewCount: BigInt(2000000),
              likeCount: BigInt(100000),
              thumbnailUrl: 'https://i.ytimg.com/vi/coldplay_cand_2/hqdefault.jpg',
              genre: ['Rock'],
              tags: ['Rock'],
            },
          ]);
        }
        return Promise.resolve([]);
      });

      (mockPrismaService.queryTrackResult.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getRecommendations('user-uuid-1', 2);
      expect(result.success).toBe(true);
      expect(result.recommendations.length).toBeGreaterThanOrEqual(1);
      expect(result.recommendations[0].artist).toBe('Coldplay');
      expect(result.recommendations[0].sourceKeyword).toBe('Coldplay');
    });

    it('TC-REC-02: strictly excludes the 10 most recently played tracks', async () => {
      const recent10Ids = Array.from({ length: 10 }, (_, i) => `recent_${i}`);
      const history = [
        ...recent10Ids.map((id) => makeHistoryItem(id, 'Recent Artist', 0.1, 1, false)),
        makeHistoryItem('older_1', 'Target Artist', 5, 4, true),
      ];

      (mockPrismaService.listenHistory.findMany as jest.Mock).mockResolvedValue(history);

      (mockPrismaService.tracks.findMany as jest.Mock).mockImplementation(() => {
        return Promise.resolve([
          {
            youtubeVideoId: 'fresh_candidate_1',
            title: 'Fresh Song 1',
            artist: 'Target Artist',
            isEmbeddable: true,
            thumbnailUrl: 'https://i.ytimg.com/vi/fresh/hqdefault.jpg',
            genre: ['Pop'],
          },
        ]);
      });

      (mockPrismaService.queryTrackResult.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getRecommendations('user-uuid-1', 5);
      const returnedIds = result.recommendations.map((r) => r.videoId);

      for (const forbiddenId of recent10Ids) {
        expect(returnedIds).not.toContain(forbiddenId);
      }
    });

    it('TC-REC-03: allocates 4 rediscovery tracks (20% ratio) for topN = 20 when rediscovery candidates exist', async () => {
      // 10 session tracks + 4 rediscovery candidates (played > 14 days ago or low play count)
      const history = [
        ...Array.from({ length: 10 }, (_, i) => makeHistoryItem(`recent_${i}`, 'Artist X', 0.5, 2, false)),
        makeHistoryItem('rediscover_cand_1', 'Nostalgic Band 1', 25, 1, true),
        makeHistoryItem('rediscover_cand_2', 'Nostalgic Band 2', 20, 2, true),
        makeHistoryItem('rediscover_cand_3', 'Nostalgic Band 3', 30, 1, false),
        makeHistoryItem('rediscover_cand_4', 'Nostalgic Band 4', 18, 2, false),
      ];

      (mockPrismaService.listenHistory.findMany as jest.Mock).mockResolvedValue(history);

      // Generate 25 fresh candidate tracks
      const freshCandidates = Array.from({ length: 25 }, (_, i) => ({
        youtubeVideoId: `fresh_${i}`,
        title: `Fresh Song ${i}`,
        artist: 'Discovery Artist',
        artistName: 'Discovery Artist',
        isEmbeddable: true,
        viewCount: BigInt(500000),
        likeCount: BigInt(30000),
        thumbnailUrl: 'https://i.ytimg.com/vi/thumb.jpg',
        genre: ['Indie'],
        tags: ['Indie'],
      }));

      (mockPrismaService.tracks.findMany as jest.Mock).mockResolvedValue(freshCandidates);
      (mockPrismaService.queryTrackResult.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getRecommendations('user-uuid-1', 20);
      expect(result.recommendations.length).toBe(20);

      // Exactly 4 rediscovery tracks should be included
      const rediscoveryTracks = result.recommendations.filter((r) =>
        r.sourceKeyword?.startsWith('Rediscover:'),
      );
      expect(rediscoveryTracks.length).toBe(4);

      // The remaining 16 tracks must be fresh discovery tracks
      const freshTracks = result.recommendations.filter(
        (r) => !r.sourceKeyword?.startsWith('Rediscover:'),
      );
      expect(freshTracks.length).toBe(16);
    });

    it('TC-REC-04: handles cold-start users with zero listen history gracefully', async () => {
      (mockPrismaService.listenHistory.findMany as jest.Mock).mockResolvedValue([]);

      const catalogTracks = Array.from({ length: 10 }, (_, i) => ({
        youtubeVideoId: `catalog_${i}`,
        title: `Catalog Hit ${i}`,
        artist: `Catalog Artist ${i}`,
        isEmbeddable: true,
        thumbnailUrl: 'https://i.ytimg.com/vi/catalog/hqdefault.jpg',
        genre: ['Pop'],
      }));

      (mockPrismaService.tracks.findMany as jest.Mock).mockResolvedValue(catalogTracks);

      const result = await service.getRecommendations('cold-start-user', 5);
      expect(result.success).toBe(true);
      expect(result.recommendations.length).toBe(5);
      expect(result.recommendations[0].sourceKeyword).toBeDefined();
    });

    it('TC-REC-05: verifies sourceKeyword is populated on all returned recommendation items', async () => {
      const history = [
        ...Array.from({ length: 10 }, (_, i) => makeHistoryItem(`recent_${i}`, 'Artist A', 1, 1, false)),
      ];

      (mockPrismaService.listenHistory.findMany as jest.Mock).mockResolvedValue(history);

      const catalogTracks = Array.from({ length: 10 }, (_, i) => ({
        youtubeVideoId: `cand_${i}`,
        title: `Candidate ${i}`,
        artist: 'Artist A',
        isEmbeddable: true,
        thumbnailUrl: 'https://i.ytimg.com/vi/thumb.jpg',
        genre: ['Electronic'],
      }));

      (mockPrismaService.tracks.findMany as jest.Mock).mockResolvedValue(catalogTracks);
      (mockPrismaService.queryTrackResult.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getRecommendations('user-uuid-1', 5);
      for (const rec of result.recommendations) {
        expect(rec.sourceKeyword).toBeTruthy();
      }
    });

    it('TC-REC-08: caches recommendation results in-memory and serves subsequent calls from cache', async () => {
      const history = [
        ...Array.from({ length: 10 }, (_, i) => makeHistoryItem(`recent_${i}`, 'Artist A', 1, 1, false)),
      ];
      (mockPrismaService.listenHistory.findMany as jest.Mock).mockResolvedValue(history);
      (mockPrismaService.tracks.findMany as jest.Mock).mockResolvedValue([
        {
          youtubeVideoId: 'cand_cache_1',
          title: 'Cached Song',
          artist: 'Artist A',
          isEmbeddable: true,
        },
      ]);
      (mockPrismaService.queryTrackResult.findMany as jest.Mock).mockResolvedValue([]);

      const firstCall = await service.getRecommendations('user-cache-test', 1);
      expect(firstCall.cached).toBe(false);

      const secondCall = await service.getRecommendations('user-cache-test', 1);
      expect(secondCall.cached).toBe(true);
      expect(secondCall.recommendations[0].videoId).toBe(firstCall.recommendations[0].videoId);

      // Invalidation clears cache
      service.invalidateUserCache('user-cache-test');
      const thirdCall = await service.getRecommendations('user-cache-test', 1);
      expect(thirdCall.cached).toBe(false);
    });
  });

  describe('getCategoryAffinity', () => {
    it('TC-REC-06: includes USER_SEARCH queries into category affinity computation', async () => {
      const history = [
        makeHistoryItem('track_1', 'Artist Rock', 2, 3, true, [
          {
            query: {
              id: 'q1',
              rawQuery: 'japanese rock playlist',
              queryType: QueryType.USER_SEARCH,
            },
          },
        ]),
      ];

      (mockPrismaService.listenHistory.findMany as jest.Mock).mockResolvedValue(history);

      const affinity = await service.getCategoryAffinity('user-affinity-test');
      // 'japanese rock playlist' matches curated category 'indie rock'
      expect(affinity.size).toBeGreaterThan(0);
      expect(affinity.has('indie rock')).toBe(true);
      expect(affinity.get('indie rock')).toBeGreaterThan(0);
    });
  });

  describe('getPaginatedRecommendations', () => {
    it('TC-REC-07: returns paginated result structure with page, limit, and totalPages', async () => {
      const history = [
        ...Array.from({ length: 10 }, (_, i) => makeHistoryItem(`recent_${i}`, 'Artist A', 1, 1, false)),
      ];
      (mockPrismaService.listenHistory.findMany as jest.Mock).mockResolvedValue(history);

      // Return 30 candidate tracks
      const candidates = Array.from({ length: 30 }, (_, i) => ({
        youtubeVideoId: `track_page_${i}`,
        title: `Page Track ${i}`,
        artist: 'Artist A',
        isEmbeddable: true,
        thumbnailUrl: 'https://i.ytimg.com/vi/thumb.jpg',
        genre: ['Pop'],
      }));

      (mockPrismaService.tracks.findMany as jest.Mock).mockResolvedValue(candidates);
      (mockPrismaService.queryTrackResult.findMany as jest.Mock).mockResolvedValue([]);

      const page1 = await service.getPaginatedRecommendations('user-page-test', 1, 10);
      expect(page1.success).toBe(true);
      expect(page1.page).toBe(1);
      expect(page1.limit).toBe(10);
      expect(page1.recommendations.length).toBe(10);
      expect(page1.totalPages).toBeGreaterThanOrEqual(1);

      const page2 = await service.getPaginatedRecommendations('user-page-test', 2, 10);
      expect(page2.page).toBe(2);
      expect(page2.recommendations.length).toBe(10);
      // Disjoint items between page 1 and page 2
      expect(page2.recommendations[0].videoId).not.toBe(page1.recommendations[0].videoId);
    });

    it('TC-REC-09: guarantees exact 16 fresh and 4 rediscovery tracks per 20-track page with and without shuffle', async () => {
      const history = [
        ...Array.from({ length: 10 }, (_, i) => makeHistoryItem(`recent_${i}`, 'Artist X', 0.5, 2, false)),
        makeHistoryItem('rediscover_cand_1', 'Nostalgic Band 1', 25, 1, true),
        makeHistoryItem('rediscover_cand_2', 'Nostalgic Band 2', 20, 2, true),
        makeHistoryItem('rediscover_cand_3', 'Nostalgic Band 3', 30, 1, false),
        makeHistoryItem('rediscover_cand_4', 'Nostalgic Band 4', 18, 2, false),
      ];

      (mockPrismaService.listenHistory.findMany as jest.Mock).mockResolvedValue(history);

      const candidates = Array.from({ length: 100 }, (_, i) => ({
        youtubeVideoId: `track_cand_${i}`,
        title: `Track ${i}`,
        artist: 'Artist X',
        isEmbeddable: true,
        thumbnailUrl: 'https://i.ytimg.com/vi/thumb.jpg',
        genre: ['Rock'],
      }));

      (mockPrismaService.tracks.findMany as jest.Mock).mockResolvedValue(candidates);
      (mockPrismaService.queryTrackResult.findMany as jest.Mock).mockResolvedValue([]);

      // Page 1 (Ordered)
      const page1 = await service.getPaginatedRecommendations('user-paged-rec-ratio', 1, 20, false);
      expect(page1.recommendations.length).toBe(20);
      const p1Rediscover = page1.recommendations.filter((r) => r.sourceKeyword?.startsWith('Rediscover:'));
      const p1Fresh = page1.recommendations.filter((r) => !r.sourceKeyword?.startsWith('Rediscover:'));
      expect(p1Rediscover.length).toBe(4);
      expect(p1Fresh.length).toBe(16);

      // Page 2 (Ordered)
      const page2 = await service.getPaginatedRecommendations('user-paged-rec-ratio', 2, 20, false);
      expect(page2.recommendations.length).toBe(20);
      const p2Rediscover = page2.recommendations.filter((r) => r.sourceKeyword?.startsWith('Rediscover:'));
      const p2Fresh = page2.recommendations.filter((r) => !r.sourceKeyword?.startsWith('Rediscover:'));
      expect(p2Rediscover.length).toBe(4);
      expect(p2Fresh.length).toBe(16);

      // Page 1 (Shuffled)
      const page1Shuffled = await service.getPaginatedRecommendations('user-paged-rec-ratio', 1, 20, true);
      expect(page1Shuffled.recommendations.length).toBe(20);
      const p1ShuffledRediscover = page1Shuffled.recommendations.filter((r) => r.sourceKeyword?.startsWith('Rediscover:'));
      const p1ShuffledFresh = page1Shuffled.recommendations.filter((r) => !r.sourceKeyword?.startsWith('Rediscover:'));
      expect(p1ShuffledRediscover.length).toBe(4);
      expect(p1ShuffledFresh.length).toBe(16);
    });
  });
});
