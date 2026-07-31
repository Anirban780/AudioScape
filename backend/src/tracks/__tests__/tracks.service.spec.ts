import { Test, TestingModule } from '@nestjs/testing';
import { TracksService } from '../tracks.service';
import { PrismaService } from '../../prisma/prisma.service';
import { YouTubeKeyManager } from '../youtube-key-manager';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

/**
 * ============================================================================
 * QA UNIT TEST SUITE: BACKEND TRACKS & SEARCH SERVICE (tracks.service.spec.ts)
 * ============================================================================
 * 
 * WHAT THIS SUITE TESTS:
 * Validates backend query normalization, 3-tier search strategy (Relational Page Cache,
 * PostgreSQL Full-Text Search GIN index, YouTube API fallback), metadata caching,
 * and API quota usage telemetry logging.
 */
describe('TracksService QA Unit Test Suite', () => {
  let service: TracksService;
  let prisma: PrismaService;
  let keyManager: YouTubeKeyManager;

  const mockPrismaService = {
    searchQuery: {
      findUnique: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
    searchQueryPage: {
      upsert: jest.fn(),
    },
    searchQueryPageResult: {
      upsert: jest.fn(),
    },
    tracks: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    channel: {
      upsert: jest.fn(),
    },
    $queryRaw: jest.fn(),
  };

  const mockYouTubeKeyManager = {
    getActiveApiKey: jest.fn().mockResolvedValue({ key: 'MOCK_KEY_A', keyId: 'A' }),
    recordQuotaUsage: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TracksService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: YouTubeKeyManager, useValue: mockYouTubeKeyManager },
      ],
    }).compile();

    service = module.get<TracksService>(TracksService);
    prisma = module.get<PrismaService>(PrismaService);
    keyManager = module.get<YouTubeKeyManager>(YouTubeKeyManager);

    // Pre-cache Music Category ID to prevent extra videoCategories HTTP calls during unit tests
    service['cachedMusicCategoryId'] = '10';

    // Set default Prisma mock return values for background upsert operations
    mockPrismaService.searchQuery.upsert.mockResolvedValue({ id: 'sq_mock' });
    mockPrismaService.searchQueryPage.upsert.mockResolvedValue({ id: 'page_mock' });
    mockPrismaService.searchQueryPageResult.upsert.mockResolvedValue({ id: 'res_mock' });
    mockPrismaService.tracks.upsert.mockResolvedValue({ youtubeVideoId: 'track_mock' });
    mockPrismaService.channel.upsert.mockResolvedValue({ id: 'ch_mock' });
  });

  /**
   * TC-BE-01: Query Normalization
   * Verifies that raw queries with excess whitespace and punctuation are normalized.
   */
  describe('Query Normalization Strategy', () => {
    test('TC-BE-01: Should normalize queries by collapsing whitespace and stripping punctuation', async () => {
      mockPrismaService.searchQuery.findUnique.mockResolvedValue(null);
      mockPrismaService.$queryRaw.mockResolvedValue([]);
      mockedAxios.get.mockResolvedValueOnce({
        data: { items: [], nextPageToken: null },
      });

      // Execute search with noisy query
      await service.searchTracks('  Taylor   Swift!!  ');

      // Verify normalized query used in database lookup
      expect(mockPrismaService.searchQuery.findUnique).toHaveBeenCalledWith({
        where: { normalizedQuery: 'taylor swift' },
        include: expect.any(Object),
      });
    });
  });

  /**
   * TC-BE-02: Relational SearchQueryPage Cache Hit
   * Verifies that repeating a query with a matching pageToken returns cached tracks instantly.
   */
  describe('Tier 1: Relational Page Cache', () => {
    test('TC-BE-02: Should return cached page results when unexpired relational page exists', async () => {
      const mockCachedDate = new Date();
      mockCachedDate.setHours(mockCachedDate.getHours() + 12); // Valid 12h future expiry

      mockPrismaService.searchQuery.findUnique.mockResolvedValue({
        id: 'sq_1',
        normalizedQuery: 'lofi',
        expiresAt: mockCachedDate,
        pages: [
          {
            id: 'page_0',
            pageToken: null,
            nextPageToken: 'token_next',
            results: [
              {
                rankPosition: 1,
                track: {
                  youtubeVideoId: 'v1',
                  title: 'Cached Lofi One',
                  thumbnailUrl: 't1.jpg',
                  artist: 'Artist A',
                },
              },
            ],
          },
        ],
      });

      const result = await service.searchTracks('lofi', '');

      expect(result.cached).toBe(true);
      expect(result.source).toBe('page_cache');
      expect(result.tracks).toHaveLength(1);
      expect(result.tracks[0].title).toBe('Cached Lofi One');
      expect(mockedAxios.get).not.toHaveBeenCalled();
      expect(mockPrismaService.searchQuery.update).toHaveBeenCalledWith({
        where: { id: 'sq_1' },
        data: expect.objectContaining({ hitCount: { increment: 1 } }),
      });
    });
  });

  /**
   * TC-BE-03: PostgreSQL Full-Text Search (FTS) Lookup
   * Verifies that when >= 8 local track matches exist, FTS returns local tracks with zero YouTube quota cost.
   */
  describe('Tier 2: PostgreSQL Full-Text Search (FTS)', () => {
    test('TC-BE-03: Should return local FTS matches when count >= 8 and skip YouTube API', async () => {
      mockPrismaService.searchQuery.findUnique.mockResolvedValue(null);

      // Mock 8 local matching tracks returned by PostgreSQL ts_rank
      const mockFtsMatches = Array.from({ length: 8 }, (_, i) => ({
        videoId: `vid_${i}`,
        title: `Local Track ${i}`,
        channelTitle: `Artist ${i}`,
        thumbNail: `thumb_${i}.jpg`,
        rank: 0.9 - i * 0.05,
      }));

      mockPrismaService.$queryRaw.mockResolvedValue(mockFtsMatches);

      const result = await service.searchTracks('chill', '');

      expect(result.cached).toBe(true);
      expect(result.source).toBe('postgres_fts');
      expect(result.tracks).toHaveLength(8);
      expect(mockedAxios.get).not.toHaveBeenCalled(); // 0 YouTube API quota units consumed!
    });
  });

  /**
   * TC-BE-04: YouTube API Fallback & Page Storage
   * Verifies that a cache miss queries YouTube API and writes SearchQueryPage relational records.
   */
  describe('Tier 3: YouTube API Fallback & Relational Persistence', () => {
    test('TC-BE-04: Should fetch from YouTube API on cache miss and write page records', async () => {
      mockPrismaService.searchQuery.findUnique.mockResolvedValue(null);
      mockPrismaService.$queryRaw.mockResolvedValue([]); // FTS Miss

      mockedAxios.get.mockResolvedValueOnce({
        data: {
          items: [
            {
              id: { videoId: 'yt_1' },
              snippet: {
                title: 'YouTube Track One',
                channelTitle: 'Channel A',
                channelId: 'ch_1',
                thumbnails: { default: { url: 'yt_t1.jpg' } },
              },
            },
          ],
          nextPageToken: 'token_yt_2',
        },
      });

      mockPrismaService.searchQuery.upsert.mockResolvedValue({ id: 'sq_new' });
      mockPrismaService.searchQueryPage.upsert.mockResolvedValue({ id: 'page_new' });
      mockPrismaService.channel.upsert.mockResolvedValue({ id: 'ch_1' });
      mockPrismaService.tracks.upsert.mockResolvedValue({ youtubeVideoId: 'yt_1' });

      const result = await service.searchTracks('ambient', '');

      expect(result.cached).toBe(false);
      expect(result.source).toBe('youtube_api');
      expect(result.nextPageToken).toBe('token_yt_2');
      expect(result.tracks[0].videoId).toBe('yt_1');

      // Verify quota usage logged
      expect(mockYouTubeKeyManager.recordQuotaUsage).toHaveBeenCalledWith('SEARCH_LIST', 100, 'A');
    });
  });

  /**
   * TC-BE-05: Track Detail Caching
   * Verifies getTrackDetails uses local database when metadata exists.
   */
  describe('Single Track Details Lookup', () => {
    test('TC-BE-05: Should return track details from Postgres table if present', async () => {
      mockPrismaService.tracks.findUnique.mockResolvedValue({
        youtubeVideoId: 'track_123',
        title: 'Cached Song',
        artist: 'Cached Artist',
        thumbnailUrl: 'thumb.jpg',
        duration: 'PT3M30S',
        durationSeconds: 210,
        genre: ['Lofi'],
        channelId: 'ch_1',
      });

      const result = await service.getTrackDetails('track_123');

      expect(result.videoId).toBe('track_123');
      expect(result.durationSeconds).toBe(210);
      expect(mockedAxios.get).not.toHaveBeenCalled();
    });
  });

  /**
   * TC-BE-06: Strict DB-Only Live Search
   * Verifies that when dbOnly is true (live typing mode), YouTube API is never called even on FTS miss.
   */
  describe('Strict DB-Only Live Search Mode', () => {
    test('TC-BE-06: Should restrict search to database and skip YouTube API when dbOnly is true', async () => {
      mockPrismaService.searchQuery.findUnique.mockResolvedValue(null);
      mockPrismaService.$queryRaw.mockResolvedValue([]); // FTS Miss

      const result = await service.searchTracks('synthwave', '', true);

      expect(result.cached).toBe(true);
      expect(result.source).toBe('postgres_fts');
      expect(result.tracks).toHaveLength(0);
      expect(result.message).toContain('No local database matches found');
      expect(mockedAxios.get).not.toHaveBeenCalled(); // 0 YouTube API quota units consumed!
    });
  });
});
