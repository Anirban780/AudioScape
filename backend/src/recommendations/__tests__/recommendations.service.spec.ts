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
      count: jest.fn(),
      upsert: jest.fn(),
    },
    searchQuery: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    queryTrackResult: {
      findMany: jest.fn(),
      count: jest.fn(),
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

  describe('getCategorySummaries (Home Page Showcase Carousel)', () => {
    it('TC-CAT-SUM-01: should return exactly 10 curated showcase categories with valid metadata', async () => {
      mockTracksService.searchTracks.mockResolvedValue({
        tracks: [
          { videoId: 'mock-1', title: 'Song 1', thumbNail: 'https://i.ytimg.com/vi/mock-1/hqdefault.jpg' },
        ],
      });
      mockPrismaService.searchQuery.findFirst.mockResolvedValue(null);
      mockPrismaService.tracks.findMany.mockResolvedValue([]);
      mockPrismaService.tracks.count.mockResolvedValue(0);

      service.clearCategorySummariesCache();
      const summaries = await service.getCategorySummaries();

      expect(summaries).toBeDefined();
      expect(summaries.length).toBe(10);

      for (const cat of summaries) {
        expect(cat.slug).toBeDefined();
        expect(cat.name).toBeDefined();
        expect(cat.tagline).toBeDefined();
        expect(cat.thumbnail).toMatch(/^https?:\/\//);
        expect(typeof cat.trackCount).toBe('number');
        expect(cat.trackCount).toBeGreaterThan(0);
      }
    });

    it('TC-CAT-SUM-02: should populate first track thumbnail and trackCount from category tracks', async () => {
      mockTracksService.searchTracks.mockImplementation((keyword: string) => {
        if (keyword.includes('lofi')) {
          return Promise.resolve({
            tracks: [
              {
                videoId: 'mock-lofi',
                title: 'Lofi Study Beats',
                thumbNail: 'https://i.ytimg.com/vi/mock-lofi/maxresdefault.jpg',
              },
            ],
          });
        }
        return Promise.resolve({ tracks: [] });
      });

      service.clearCategorySummariesCache();
      const summaries = await service.getCategorySummaries();

      const lofi = summaries.find((s) => s.slug === 'lofi-chill');
      expect(lofi).toBeDefined();
      expect(lofi?.thumbnail).toContain('mock-lofi');
      expect(lofi?.trackCount).toBeGreaterThan(0);
    });

    it('TC-CAT-SUM-03: should serve cached summaries on subsequent calls (0 DB queries)', async () => {
      mockPrismaService.searchQuery.findFirst.mockClear();
      const firstCall = await service.getCategorySummaries('cached-user');
      const secondCall = await service.getCategorySummaries('cached-user');

      expect(secondCall).toBe(firstCall);
      expect(mockPrismaService.searchQuery.findFirst).not.toHaveBeenCalled();
    });

    it('TC-CAT-SUM-04: should return 60/40 exploit/explore blend for personalized user with genre/tag history', async () => {
      service.clearCategorySummariesCache();
      mockPrismaService.listenHistory.count.mockResolvedValue(10);
      mockPrismaService.searchQuery.findMany.mockResolvedValue([
        { rawQuery: 'pop hits' },
        { rawQuery: 'indie rock' },
        { rawQuery: 'workout music' },
        { rawQuery: 'classical music' },
      ]);
      mockPrismaService.searchQuery.findFirst.mockResolvedValue(null);
      mockPrismaService.tracks.findMany.mockResolvedValue([]);
      mockPrismaService.tracks.count.mockResolvedValue(0);
      mockTracksService.searchTracks.mockResolvedValue({
        tracks: [{ videoId: 't1', title: 'Track', thumbNail: 'https://i.ytimg.com/vi/t1/hqdefault.jpg' }],
      });

      // User listened to hip hop and phonk tracks
      const userHistory = [
        {
          id: 'hist_hiphop_1',
          userId: 'user-personalized-6040',
          trackId: 'track_hh1',
          playCount: 15,
          liked: true,
          lastPlayedAt: new Date(),
          track: {
            youtubeVideoId: 'track_hh1',
            title: 'Hip Hop Track',
            genre: ['hip hop'],
            tags: ['hip hop', 'boom bap'],
            queryResults: [],
          },
        },
        {
          id: 'hist_synth_1',
          userId: 'user-personalized-6040',
          trackId: 'track_syn1',
          playCount: 12,
          liked: true,
          lastPlayedAt: new Date(),
          track: {
            youtubeVideoId: 'track_syn1',
            title: 'Synthwave Night',
            genre: ['synthwave'],
            tags: ['synthwave', 'retrowave'],
            queryResults: [],
          },
        },
        {
          id: 'hist_kpop_1',
          userId: 'user-personalized-6040',
          trackId: 'track_kp1',
          playCount: 8,
          liked: false,
          lastPlayedAt: new Date(),
          track: {
            youtubeVideoId: 'track_kp1',
            title: 'K-Pop Anthem',
            genre: ['k-pop'],
            tags: ['k-pop hits'],
            queryResults: [],
          },
        },
      ];

      mockPrismaService.listenHistory.findMany.mockResolvedValue(userHistory);

      const summaries = await service.getCategorySummaries('user-personalized-6040');

      expect(summaries).toBeDefined();
      expect(summaries.length).toBe(10);

      // Verify that user's high-affinity categories (hip-hop, synthwave, k-pop) are included in the results
      const slugs = summaries.map((s) => s.slug);
      expect(slugs).toContain('hip-hop');
      expect(slugs).toContain('synthwave');
      expect(slugs).toContain('k-pop');
    });

    it('TC-CAT-SUM-05: getCategoryAffinity correctly accumulates weights from track.genre and track.tags', async () => {
      const historyWithGenresAndTags = [
        {
          id: 'hist_synth_1',
          userId: 'user-affinity-test',
          trackId: 'track_synth',
          playCount: 5,
          liked: true,
          lastPlayedAt: new Date(),
          track: {
            youtubeVideoId: 'track_synth',
            title: 'Retro Neon',
            genre: ['synthwave'],
            tags: ['electronic music'],
            queryResults: [],
          },
        },
      ];

      mockPrismaService.listenHistory.findMany.mockResolvedValue(historyWithGenresAndTags);

      const affinity = await service.getCategoryAffinity('user-affinity-test');

      expect(affinity.has('synthwave')).toBe(true);
      expect(affinity.get('synthwave')!).toBeGreaterThan(0);
      expect(affinity.has('electronic music')).toBe(true);
      expect(affinity.get('electronic music')!).toBeGreaterThan(0);
    });

    it('TC-CAT-SUM-06: should fallback to cold-start showcase categories when user has < 3 history items', async () => {
      service.clearCategorySummariesCache();
      mockPrismaService.listenHistory.count.mockResolvedValue(1);
      mockPrismaService.searchQuery.findFirst.mockResolvedValue(null);
      mockPrismaService.tracks.findMany.mockResolvedValue([]);
      mockPrismaService.tracks.count.mockResolvedValue(0);
      mockTracksService.searchTracks.mockResolvedValue({
        tracks: [{ videoId: 't1', title: 'Track', thumbNail: 'https://i.ytimg.com/vi/t1/hqdefault.jpg' }],
      });

      const summaries = await service.getCategorySummaries('user-cold-start');

      expect(summaries.length).toBe(10);
      const slugs = summaries.map((s) => s.slug);
      expect(slugs).toContain('lofi-chill');
      expect(slugs).toContain('synthwave');
    });

    it('TC-CAT-SUM-07: isolates category summaries cache across different user IDs', async () => {
      service.clearCategorySummariesCache();
      mockPrismaService.listenHistory.count.mockResolvedValue(0);
      mockPrismaService.searchQuery.findFirst.mockResolvedValue(null);
      mockPrismaService.tracks.findMany.mockResolvedValue([]);
      mockPrismaService.tracks.count.mockResolvedValue(0);
      mockTracksService.searchTracks.mockResolvedValue({
        tracks: [{ videoId: 't1', title: 'Track', thumbNail: 'https://i.ytimg.com/vi/t1/hqdefault.jpg' }],
      });

      const summariesUserA = await service.getCategorySummaries('user-alpha');
      const summariesUserB = await service.getCategorySummaries('user-beta');

      expect(summariesUserA).toBeDefined();
      expect(summariesUserB).toBeDefined();

      // Invalidate user-alpha should not purge user-beta
      service.invalidateUserCache('user-alpha');
      mockPrismaService.listenHistory.count.mockClear();

      const userBSecondCall = await service.getCategorySummaries('user-beta');
      expect(userBSecondCall).toBe(summariesUserB);
      expect(mockPrismaService.listenHistory.count).not.toHaveBeenCalled();
    });

    it('TC-CAT-SUM-08: upgrades low-res thumbnails to Ultra HD maxresdefault and sanitizes domain', async () => {
      service.clearCategorySummariesCache();
      mockPrismaService.listenHistory.count.mockResolvedValue(0);
      mockPrismaService.searchQuery.findFirst.mockResolvedValue(null);
      mockPrismaService.tracks.findMany.mockResolvedValue([]);
      mockPrismaService.tracks.count.mockResolvedValue(0);
      mockTracksService.searchTracks.mockResolvedValue({
        tracks: [
          {
            videoId: 'dQw4w9WgXcQ',
            title: 'Pop Hit',
            thumbNail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
          },
        ],
      });

      const summaries = await service.getCategorySummaries('user-hd-thumb-test');

      expect(summaries.length).toBe(10);
      for (const summary of summaries) {
        if (summary.thumbnail) {
          expect(summary.thumbnail).toContain('img.youtube.com');
          expect(summary.thumbnail).toContain('maxresdefault.jpg');
          expect(summary.thumbnail).not.toContain('i.ytimg.com');
          expect(summary.thumbnail).not.toContain('hqdefault.jpg');
        }
      }
    });
  });

  describe('getCategoryDetail', () => {
    it('TC-CAT-DET-01: resolves category details and tracks for a valid category slug', async () => {
      mockPrismaService.searchQuery.findUnique.mockResolvedValue({
        id: 'query-lofi-1',
        normalizedQuery: 'lofi music',
      });
      mockPrismaService.queryTrackResult.findMany.mockResolvedValue([
        {
          rankPosition: 1,
          track: {
            youtubeVideoId: 'lofi_vid_1',
            title: 'Chill Study Beats',
            artistName: 'ChilledCow',
            thumbnailUrl: 'https://i.ytimg.com/vi/lofi_vid_1/hqdefault.jpg',
            duration: 'PT3M30S',
            genre: ['lofi-chill'],
          },
        },
        {
          rankPosition: 2,
          track: {
            youtubeVideoId: 'lofi_vid_2',
            title: 'Coffee Shop Lofi',
            artistName: 'Lofi Girl',
            thumbnailUrl: 'https://i.ytimg.com/vi/lofi_vid_2/hqdefault.jpg',
            duration: 'PT2M45S',
            genre: ['lofi-chill'],
          },
        },
      ]);
      mockPrismaService.queryTrackResult.count.mockResolvedValue(2);

      const result = await service.getCategoryDetail('lofi-chill', 20, 0);

      expect(result).toBeDefined();
      expect(result.category.slug).toBe('lofi-chill');
      expect(result.category.name).toBe('Lo-Fi & Chill');
      expect(result.category.tagline).toBeDefined();
      expect(result.tracks.length).toBe(2);
      expect(result.tracks[0].id).toBe('lofi_vid_1');
      expect(result.tracks[0].thumbnail).toContain('maxresdefault.jpg');
      expect(result.tracks[0].thumbnail).toContain('img.youtube.com');
      expect(result.total).toBe(2);
      expect(result.hasMore).toBe(false);
    });

    it('TC-CAT-DET-02: handles pagination slicing with limit and offset', async () => {
      mockPrismaService.searchQuery.findUnique.mockResolvedValue({
        id: 'query-synth-1',
        normalizedQuery: 'synthwave',
      });
      mockPrismaService.queryTrackResult.findMany.mockResolvedValue([
        {
          rankPosition: 21,
          track: {
            youtubeVideoId: 'synth_vid_21',
            title: 'Neon Drive 21',
            artistName: 'Kavinsky',
            thumbnailUrl: 'https://i.ytimg.com/vi/synth_vid_21/hqdefault.jpg',
            genre: ['synthwave'],
          },
        },
      ]);
      mockPrismaService.queryTrackResult.count.mockResolvedValue(50);

      const result = await service.getCategoryDetail('synthwave', 20, 20);

      expect(result.tracks.length).toBe(1);
      expect(result.total).toBe(50);
      expect(result.hasMore).toBe(true);
      expect(result.offset).toBe(20);
      expect(result.limit).toBe(20);
      expect(result.tracks[0].rankPosition).toBe(21);
    });

    it('TC-CAT-DET-03: throws BadRequestException when slug is empty', async () => {
      await expect(service.getCategoryDetail('')).rejects.toThrow();
    });

    it('TC-CAT-DET-04: upgrades all track thumbnails to Ultra HD maxresdefault', async () => {
      mockPrismaService.searchQuery.findUnique.mockResolvedValue(null);
      mockTracksService.searchTracks.mockResolvedValue({
        tracks: [
          {
            videoId: 'phonk_vid_1',
            title: 'Drift Phonk',
            channelTitle: 'Kordhell',
            thumbNail: 'https://i.ytimg.com/vi/phonk_vid_1/hqdefault.jpg',
          },
        ],
      });

      const result = await service.getCategoryDetail('phonk', 10, 0);

      expect(result.tracks.length).toBe(1);
      expect(result.tracks[0].thumbnail).toContain('maxresdefault.jpg');
      expect(result.tracks[0].thumbnail).toContain('img.youtube.com');
      expect(result.category.thumbnail).toContain('maxresdefault.jpg');
    });
  });
});

