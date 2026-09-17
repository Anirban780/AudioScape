import { parseTrackTitle, cleanTrackTitle, cleanChannelTitle } from '../title-parser.util';

/**
 * ============================================================================
 * QA UNIT TEST SUITE: TITLE PARSER UTILITY (title-parser.util.spec.ts)
 * ============================================================================
 * 
 * WHAT THIS SUITE TESTS:
 * Validates heuristic parsing of YouTube video titles into clean song titles,
 * extracted artist names, and untouched raw titles across standard delimiter patterns,
 * bracketed noise tags, quotation marks, and channel fallback logic.
 */
describe('TitleParserUtil QA Unit Test Suite', () => {
  describe('cleanChannelTitle', () => {
    it('should strip " - Topic" suffix from channel titles', () => {
      expect(cleanChannelTitle('The Weeknd - Topic')).toBe('The Weeknd');
      expect(cleanChannelTitle('Ed Sheeran - Topic')).toBe('Ed Sheeran');
    });

    it('should strip "VEVO" suffix from channel titles', () => {
      expect(cleanChannelTitle('TheWeekndVEVO')).toBe('TheWeeknd');
      expect(cleanChannelTitle('EminemVEVO')).toBe('Eminem');
      expect(cleanChannelTitle('TaylorSwiftVEVO')).toBe('TaylorSwift');
    });

    it('should strip "Official" suffix from channel titles', () => {
      expect(cleanChannelTitle('Coldplay Official')).toBe('Coldplay');
      expect(cleanChannelTitle('Dua Lipa Official Channel')).toBe('Dua Lipa');
    });

    it('should return Unknown Artist when channelTitle is empty or missing', () => {
      expect(cleanChannelTitle(null)).toBe('Unknown Artist');
      expect(cleanChannelTitle(undefined)).toBe('Unknown Artist');
      expect(cleanChannelTitle('')).toBe('Unknown Artist');
    });
  });

  describe('cleanTrackTitle', () => {
    it('should strip (Official Video) and variations', () => {
      expect(cleanTrackTitle('Tum Hi Ho (Official Video)')).toBe('Tum Hi Ho');
      expect(cleanTrackTitle('Tum Hi Ho (Official Music Video)')).toBe('Tum Hi Ho');
      expect(cleanTrackTitle('Blinding Lights [Official Audio]')).toBe('Blinding Lights');
      expect(cleanTrackTitle('Shape of You (Lyrics)')).toBe('Shape of You');
      expect(cleanTrackTitle('Yellow (Official 4K Video)')).toBe('Yellow');
      expect(cleanTrackTitle('In The End [Visualizer]')).toBe('In The End');
    });

    it('should strip trailing pipe noise tags', () => {
      expect(cleanTrackTitle('Starboy | Official Video')).toBe('Starboy');
      expect(cleanTrackTitle('Believer | 4K HD')).toBe('Believer');
    });

    it('should trim surrounding quotes and extra whitespace', () => {
      expect(cleanTrackTitle('  "Blinding Lights"  ')).toBe('Blinding Lights');
      expect(cleanTrackTitle('“Lose Yourself”')).toBe('Lose Yourself');
    });
  });

  describe('parseTrackTitle', () => {
    it('should parse "Artist - Title (Noise)" delimiter correctly', () => {
      const parsed = parseTrackTitle(
        'Arijit Singh - Tum Hi Ho (Official Video)',
        'T-Series',
      );
      expect(parsed.rawTitle).toBe('Arijit Singh - Tum Hi Ho (Official Video)');
      expect(parsed.artistName).toBe('Arijit Singh');
      expect(parsed.cleanTitle).toBe('Tum Hi Ho');
    });

    it('should parse "Artist : Title" colon delimiter correctly', () => {
      const parsed = parseTrackTitle(
        'Eminem : Lose Yourself (Official Music Video)',
        'Shady Records',
      );
      expect(parsed.rawTitle).toBe('Eminem : Lose Yourself (Official Music Video)');
      expect(parsed.artistName).toBe('Eminem');
      expect(parsed.cleanTitle).toBe('Lose Yourself');
    });

    it('should parse "Artist | Title" pipe delimiter correctly', () => {
      const parsed = parseTrackTitle(
        'Coldplay | Yellow [Official 4K Video]',
        'Coldplay Official',
      );
      expect(parsed.rawTitle).toBe('Coldplay | Yellow [Official 4K Video]');
      expect(parsed.artistName).toBe('Coldplay');
      expect(parsed.cleanTitle).toBe('Yellow');
    });

    it('should parse Artist "Title" quotation format correctly', () => {
      const parsed = parseTrackTitle(
        'The Weeknd "Blinding Lights" (Official Music Video)',
        'TheWeekndVEVO',
      );
      expect(parsed.rawTitle).toBe('The Weeknd "Blinding Lights" (Official Music Video)');
      expect(parsed.artistName).toBe('The Weeknd');
      expect(parsed.cleanTitle).toBe('Blinding Lights');
    });

    it('should fall back to channelTitle when no delimiter is present', () => {
      const parsed = parseTrackTitle(
        'Blinding Lights (Official Video)',
        'The Weeknd - Topic',
      );
      expect(parsed.rawTitle).toBe('Blinding Lights (Official Video)');
      expect(parsed.artistName).toBe('The Weeknd');
      expect(parsed.cleanTitle).toBe('Blinding Lights');
    });

    it('should handle null/empty title gracefully', () => {
      const parsed = parseTrackTitle('', 'Arijit Singh');
      expect(parsed.rawTitle).toBe('');
      expect(parsed.cleanTitle).toBe('Unknown Title');
      expect(parsed.artistName).toBe('Arijit Singh');
    });
  });
});
