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

  describe('getCategoryTracks (Phase 4.1 0-Quota Category Endpoint)', () => {
    it('TC-CAT-01: retrieves category tracks from PostgreSQL with 0 YouTube API quota', async () => {
      const mockCategoryTracks = [
        {
          youtubeVideoId: 'lofi_1',
          title: 'Coffee Beans',
          artist: 'Lofi Producer',
          artistName: 'Lofi Producer',
          isEmbeddable: true,
          thumbnailUrl: 'https://i.ytimg.com/vi/lofi_1/hqdefault.jpg',
          likeCount: BigInt(20000),
          genre: ['lofi music', 'chill beats'],
          tags: ['lofi', 'study'],
          listenHistory: [{ playCount: 5, liked: true }],
        },
        {
          youtubeVideoId: 'lofi_2',
          title: 'Rainy Night',
          artist: 'Chill Beats',
          artistName: 'Chill Beats',
          isEmbeddable: true,
          thumbnailUrl: 'https://i.ytimg.com/vi/lofi_2/hqdefault.jpg',
          likeCount: BigInt(50000),
          genre: ['lofi music'],
          tags: ['chill'],
          listenHistory: [{ playCount: 2, liked: false }],
        },
      ];

      (mockPrismaService.tracks.findMany as jest.Mock).mockResolvedValue(mockCategoryTracks);
      (mockPrismaService.searchQuery.upsert as jest.Mock).mockResolvedValue({});

      const result = await service.getCategoryTracks('lofi music', 10);

      expect(result.success).toBe(true);
      expect(result.category).toBe('lofi music');
      expect(result.title).toBe('Lofi & Chill');
      expect(result.tracks.length).toBe(2);
      expect(result.tracks[0].id).toBe('lofi_1');
      expect(result.tracks[0].title).toBe('Coffee Beans');
      // Verify NO live YouTube API search was invoked
      expect(mockTracksService.searchTracks).not.toHaveBeenCalled();
    });

    it('TC-CAT-02: ranks tracks using composite formula blending website engagement (likes + plays) and YouTube engagement', async () => {
      const candidateTracks = [
        {
          youtubeVideoId: 'pop_low_local',
          title: 'YouTube Giant Pop Hit',
          artist: 'Mainstream Star',
          artistName: 'Mainstream Star',
          isEmbeddable: true,
          thumbnailUrl: 'https://i.ytimg.com/vi/pop_low_local/hqdefault.jpg',
          likeCount: BigInt(1000000),
          genre: ['pop hits'],
          tags: ['pop'],
          listenHistory: [{ playCount: 1, liked: false }], // 0 website likes, 1 play
        },
        {
          youtubeVideoId: 'pop_high_local',
          title: 'Community Favorite Pop Anthem',
          artist: 'Indie Darling',
          artistName: 'Indie Darling',
          isEmbeddable: true,
          thumbnailUrl: 'https://i.ytimg.com/vi/pop_high_local/hqdefault.jpg',
          likeCount: BigInt(10000),
          genre: ['pop hits'],
          tags: ['pop'],
          // 3 website likes + 15 plays = high website engagement
          listenHistory: [
            { playCount: 5, liked: true },
            { playCount: 5, liked: true },
            { playCount: 5, liked: true },
          ],
        },
      ];

      (mockPrismaService.tracks.findMany as jest.Mock).mockResolvedValue(candidateTracks);
      (mockPrismaService.searchQuery.upsert as jest.Mock).mockResolvedValue({});

      // Use unique keyword to bypass in-memory cache
      const result = await service.getCategoryTracks('pop hits', 10);

      expect(result.success).toBe(true);
      expect(result.tracks.length).toBe(2);
      // Community Favorite should rank #1 because of strong website likes + play engagement
      expect(result.tracks[0].id).toBe('pop_high_local');
      expect(result.tracks[1].id).toBe('pop_low_local');
    });

    it('TC-CAT-03: serves repeat requests from in-memory categoryTracksCache within TTL', async () => {
      const mockTracks = [
        {
          youtubeVideoId: 'synth_1',
          title: 'Midnight Drive',
          artist: 'Kavinsky Vibe',
          isEmbeddable: true,
          thumbnailUrl: 'https://i.ytimg.com/vi/synth_1/hqdefault.jpg',
          likeCount: BigInt(5000),
          listenHistory: [],
        },
      ];

      (mockPrismaService.tracks.findMany as jest.Mock).mockResolvedValue(mockTracks);
      (mockPrismaService.searchQuery.upsert as jest.Mock).mockResolvedValue({});

      // First call -> cache miss, queries DB
      const firstResult = await service.getCategoryTracks('synthwave', 5);
      expect(firstResult.cached).toBe(false);
      const dbCallCount = (mockPrismaService.tracks.findMany as jest.Mock).mock.calls.length;

      // Second call -> in-memory cache HIT, skips DB
      const secondResult = await service.getCategoryTracks('synthwave', 5);
      expect(secondResult.cached).toBe(true);
      expect((mockPrismaService.tracks.findMany as jest.Mock).mock.calls.length).toBe(dbCallCount);
    });

    it('TC-CAT-04: gracefully falls back to embeddable catalog tracks when category has 0 direct matches', async () => {
      // First call (direct match) returns empty array
      // Second call (catalog fallback) returns fallback track
      (mockPrismaService.tracks.findMany as jest.Mock)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            youtubeVideoId: 'catalog_fallback_1',
            title: 'Top Catalog Track',
            artist: 'Popular Artist',
            isEmbeddable: true,
            thumbnailUrl: 'https://i.ytimg.com/vi/fb/hqdefault.jpg',
            likeCount: BigInt(80000),
            listenHistory: [],
          },
        ]);
      (mockPrismaService.searchQuery.upsert as jest.Mock).mockResolvedValue({});

      const result = await service.getCategoryTracks('obscure-genre-xyz', 5);
      expect(result.success).toBe(true);
      expect(result.tracks.length).toBe(1);
      expect(result.tracks[0].id).toBe('catalog_fallback_1');
    });

    it('TC-CAT-05: registers requested category in searchQuery for cron pre-warming', async () => {
      (mockPrismaService.tracks.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrismaService.searchQuery.upsert as jest.Mock).mockResolvedValue({});

      await service.getCategoryTracks('afrobeats', 5);

      expect(mockPrismaService.searchQuery.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { normalizedQuery: 'afrobeats' },
          create: expect.objectContaining({
            rawQuery: 'afrobeats',
            queryType: QueryType.CURATED_KEYWORD,
          }),
        }),
      );
    });

    it('TC-CAT-06: backfills remaining tracks up to limit when category has fewer direct matches than requested limit', async () => {
      const directTrack = {
        youtubeVideoId: 'direct_match_1',
        title: 'Direct Category Track',
        artist: 'Direct Artist',
        isEmbeddable: true,
        thumbnailUrl: 'https://i.ytimg.com/vi/direct/hqdefault.jpg',
        likeCount: BigInt(50000),
        listenHistory: [],
      };
      const fallbackTracks = Array.from({ length: 4 }, (_, i) => ({
        youtubeVideoId: `fallback_${i}`,
        title: `Fallback Track ${i}`,
        artist: `Fallback Artist ${i}`,
        isEmbeddable: true,
        thumbnailUrl: `https://i.ytimg.com/vi/fb${i}/hqdefault.jpg`,
        likeCount: BigInt(10000),
        listenHistory: [],
      }));

      (mockPrismaService.tracks.findMany as jest.Mock)
        .mockResolvedValueOnce([directTrack])
        .mockResolvedValueOnce(fallbackTracks);
      (mockPrismaService.searchQuery.upsert as jest.Mock).mockResolvedValue({});

      const result = await service.getCategoryTracks('road trip music', 5);

      expect(result.success).toBe(true);
      expect(result.count).toBe(5);
      expect(result.tracks.length).toBe(5);
      expect(result.tracks[0].id).toBe('direct_match_1');
    });
  });

  describe('getExploreFeed (Phase 4.2: 20 Tracks Per Section Feed)', () => {
    it('TC-EXP-01: returns sections with up to 20 tracks per category delegating to getCategoryTracks', async () => {
      // Mock getCategoryTracks spy
      const mockCategoryTracks = Array.from({ length: 20 }, (_, i) => ({
        id: `track_${i}`,
        videoId: `track_${i}`,
        name: `Track ${i}`,
        artist: `Artist ${i}`,
      }));

      jest.spyOn(service, 'getCategoryTracks').mockResolvedValue({
        success: true,
        category: 'lofi music',
        title: 'Lofi & Chill',
        count: 20,
        tracks: mockCategoryTracks as any,
      });

      const feed = await service.getExploreFeed(undefined, 20);

      expect(feed).toBeDefined();
      expect(Array.isArray(feed)).toBe(true);
      expect(feed.length).toBeGreaterThan(0);
      expect(service.getCategoryTracks).toHaveBeenCalledWith(expect.any(String), 20);
      expect(feed[0].tracks.length).toBe(20);
    });
  });

  describe('generateQueue (Phase 4.2: 20-Track Continuous Queue Guarantee)', () => {
    it('TC-GENQ-01: guarantees exactly 20 tracks returned even when history has fewer than 7 tracks', async () => {
      mockTracksService.getTrackDetails.mockResolvedValue({
        videoId: 'curr_1',
        title: 'Current Song',
        channelTitle: 'Current Artist',
        thumbNail: 'https://img.youtube.com/vi/curr_1/default.jpg',
      });

      mockTracksService.searchTracks.mockResolvedValue({
        tracks: Array.from({ length: 10 }, (_, i) => ({
          videoId: `rel_${i + 1}`,
          title: `Related Song ${i + 1}`,
          channelTitle: `Related Artist ${i + 1}`,
          thumbNail: 'https://img.youtube.com/vi/thumb.jpg',
        })),
      });

      // User has only 2 history tracks
      (mockPrismaService.listenHistory.findMany as jest.Mock).mockResolvedValue([
        {
          track: {
            youtubeVideoId: 'hist_1',
            title: 'History Song 1',
            artist: 'History Artist 1',
            thumbnailUrl: 'https://img.youtube.com/vi/hist1.jpg',
          },
        },
        {
          track: {
            youtubeVideoId: 'hist_2',
            title: 'History Song 2',
            artist: 'History Artist 2',
            thumbnailUrl: 'https://img.youtube.com/vi/hist2.jpg',
          },
        },
      ]);

      // Fallbacks to backfill remaining 7 slots up to 20
      const mockFallbacks = Array.from({ length: 7 }, (_, i) => ({
        youtubeVideoId: `fallback_${i + 1}`,
        title: `Fallback Song ${i + 1}`,
        artist: `Fallback Artist ${i + 1}`,
        thumbnailUrl: 'https://img.youtube.com/vi/fallback.jpg',
      }));
      (mockPrismaService.tracks.findMany as jest.Mock).mockResolvedValue(mockFallbacks);

      const queue = await service.generateQueue('user-123', 'curr_1', 'rock');

      expect(queue).toBeDefined();
      expect(queue.length).toBe(20);
      expect(queue[0].id).toBe('curr_1');
    });
  });
});
