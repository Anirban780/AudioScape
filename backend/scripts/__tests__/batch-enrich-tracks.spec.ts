/**
 * ============================================================================
 * UNIT TESTS: BATCH ENRICHMENT MIGRATION TOOL HELPERS
 * ============================================================================
 * @module Scripts
 */

import {
  parseCliArguments,
  chunkArray,
  parseIsoDurationSeconds,
  detectUnavailableVideoIds,
  mapYouTubeItemToTrackUpdate,
} from '../batch-enrich-tracks';

describe('Batch Enrichment Migration Tool (Unit Tests)', () => {
  describe('parseCliArguments', () => {
    it('should parse default CLI arguments correctly', () => {
      const config = parseCliArguments(['node', 'batch-enrich-tracks.ts']);
      expect(config.batchSize).toBe(2);
      expect(config.limit).toBeNull();
      expect(config.delayMs).toBe(500);
      expect(config.dryRun).toBe(false);
      expect(config.onlyMissingArtist).toBe(false);
    });

    it('should parse custom CLI options properly', () => {
      const config = parseCliArguments([
        'node',
        'batch-enrich-tracks.ts',
        '--batch-size=25',
        '--limit=150',
        '--delay=200',
        '--dry-run',
        '--only-missing-artist',
      ]);
      expect(config.batchSize).toBe(25);
      expect(config.limit).toBe(150);
      expect(config.delayMs).toBe(200);
      expect(config.dryRun).toBe(true);
      expect(config.onlyMissingArtist).toBe(true);
    });

    it('should clamp batchSize to maximum 50 (YouTube Data API limit)', () => {
      const config = parseCliArguments(['node', 'batch-enrich-tracks.ts', '--batch-size=100']);
      expect(config.batchSize).toBe(50);
    });

    it('should clamp batchSize to minimum 1', () => {
      const config = parseCliArguments(['node', 'batch-enrich-tracks.ts', '--batch-size=0']);
      expect(config.batchSize).toBe(1);
    });
  });

  describe('chunkArray', () => {
    it('should split array into equal chunks and a remainder chunk', () => {
      const items = ['a', 'b', 'c', 'd', 'e'];
      const chunks = chunkArray(items, 2);
      expect(chunks).toEqual([['a', 'b'], ['c', 'd'], ['e']]);
    });

    it('should handle array smaller than chunk size', () => {
      const items = [1, 2];
      const chunks = chunkArray(items, 10);
      expect(chunks).toEqual([[1, 2]]);
    });

    it('should return empty chunks for empty input array', () => {
      expect(chunkArray([], 5)).toEqual([]);
    });
  });

  describe('parseIsoDurationSeconds', () => {
    it('should parse PT3M54S into 234 seconds', () => {
      expect(parseIsoDurationSeconds('PT3M54S')).toBe(234);
    });

    it('should parse PT1H2M3S into 3723 seconds', () => {
      expect(parseIsoDurationSeconds('PT1H2M3S')).toBe(3723);
    });

    it('should parse PT45S into 45 seconds', () => {
      expect(parseIsoDurationSeconds('PT45S')).toBe(45);
    });

    it('should parse PT4M into 240 seconds', () => {
      expect(parseIsoDurationSeconds('PT4M')).toBe(240);
    });

    it('should return null for invalid or null duration', () => {
      expect(parseIsoDurationSeconds(null)).toBeNull();
      expect(parseIsoDurationSeconds(undefined)).toBeNull();
      expect(parseIsoDurationSeconds('invalid')).toBeNull();
    });
  });

  describe('detectUnavailableVideoIds', () => {
    it('should detect video IDs omitted from YouTube response', () => {
      const requested = ['vid1', 'vid2', 'vid3', 'vid4'];
      const returned = [{ id: 'vid1' }, { id: 'vid3' }];

      const unavailable = detectUnavailableVideoIds(requested, returned);
      expect(unavailable).toEqual(['vid2', 'vid4']);
    });

    it('should return empty array when all videos exist', () => {
      const requested = ['vid1', 'vid2'];
      const returned = [{ id: 'vid1' }, { id: 'vid2' }];

      expect(detectUnavailableVideoIds(requested, returned)).toEqual([]);
    });
  });

  describe('mapYouTubeItemToTrackUpdate', () => {
    it('should correctly map raw YouTube response into Prisma update payload', () => {
      const rawItem = {
        id: 'dQw4w9WgXcQ',
        snippet: {
          title: 'Rick Astley - Never Gonna Give You Up (Official Music Video)',
          channelTitle: 'RickAstleyVEVO',
          channelId: 'UCuAXFkgsw1L7xaCfnd5JJOw',
          publishedAt: '2009-10-25T06:58:41Z',
          description: 'The official video for Never Gonna Give You Up',
          categoryId: '10',
          tags: ['Rick Astley', 'Pop', '80s'],
        },
        contentDetails: {
          duration: 'PT3M33S',
          licensedContent: true,
        },
        statistics: {
          viewCount: '1500000000',
          likeCount: '17000000',
        },
        topicDetails: {
          topicCategories: ['https://en.wikipedia.org/wiki/Pop_music'],
        },
        status: {
          embeddable: true,
        },
      };

      const result = mapYouTubeItemToTrackUpdate(rawItem);

      expect(result.rawTitle).toBe('Rick Astley - Never Gonna Give You Up (Official Music Video)');
      expect(result.title).toBe('Never Gonna Give You Up');
      expect(result.artistName).toBe('Rick Astley');
      expect(result.artist).toBe('RickAstley'); // VEVO stripped
      expect(result.duration).toBe('PT3M33S');
      expect(result.durationSeconds).toBe(213);
      expect(result.viewCount).toBe(BigInt('1500000000'));
      expect(result.likeCount).toBe(BigInt('17000000'));
      expect(result.categoryId).toBe('10');
      expect(result.tags).toEqual(['Rick Astley', 'Pop', '80s']);
      expect(result.genre).toEqual(['Rick Astley', 'Pop', '80s']);
      expect(result.topicCategories).toEqual(['https://en.wikipedia.org/wiki/Pop_music']);
      expect(result.isEmbeddable).toBe(true);
      expect(result.licensedContent).toBe(true);
      expect(result.isAvailable).toBe(true);
      expect(result.publishedAt).toBeInstanceOf(Date);
    });
  });
});
