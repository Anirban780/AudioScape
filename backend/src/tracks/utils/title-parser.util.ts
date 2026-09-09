/**
 * ============================================================================
 * UTILITY: YOUTUBE TRACK TITLE & ARTIST PARSER (title-parser.util.ts)
 * ============================================================================
 * @module TracksModule
 * 
 * WHAT THIS FILE DOES:
 * Heuristic regex-based metadata extractor designed to parse noisy YouTube video titles
 * into clean song titles, separate artist names, and preserve untouched raw titles.
 *
 * WHY THIS IS NEEDED:
 * YouTube Data API v3 does not distinguish between artist and track title fields;
 * the video title combines both (e.g. "Arijit Singh - Tum Hi Ho (Official Video)").
 * Storing unparsed strings starves the recommendation engine of clean artist tokens
 * and pollutes the UI with promotional noise ("(Official 4K Audio)", "[Lyrics]", etc.).
 *
 * HOW IT WORKS:
 * 1. Preserves untouched original title in `rawTitle`.
 * 2. Matches common video title delimiters: " - ", " : ", " | ", or quotes (`Artist "Title"`).
 * 3. Strips bracketed and appended YouTube noise tags (e.g., "(Official Video)", "[Lyric Video]").
 * 4. Cleans artist names and falls back to sanitized channel title when no delimiter exists.
 * ============================================================================
 */

export interface ParsedTrackTitle {
  rawTitle: string;
  cleanTitle: string;
  artistName: string;
}

/**
 * Regex patterns matching standard YouTube noise labels enclosed in parentheses or brackets.
 */
const NOISE_BRACKETS_REGEX = /\s*[\(\[](?:official\s+(?:(?:4k|hd|music|lyric)\s+)*(?:video|audio|visualizer)?|official|music\s+video|audio|video|lyrics?|lyric\s+video|visualizer|4k(?:\s+hd)?|hd|hq|remastered|live|extended(?:\s+mix)?|original\s+mix|mv|clip\s+officiel|videoclipe)[\)\]]/gi;

/**
 * Regex pattern matching trailing pipe or slash noise (e.g. " | Official Video", " // Audio").
 */
const NOISE_TRAILING_REGEX = /\s*(?:\||\/\/)\s*(?:official(?:\s+music)?\s+video|official\s+audio|lyrics?|4k|hd|audio|video).*$/gi;

/**
 * Cleans YouTube channel names when used as artist fallback.
 * Strips "VEVO", " - Topic", " Official", and excessive whitespace.
 */
export function cleanChannelTitle(channelTitle?: string | null): string {
  if (!channelTitle || typeof channelTitle !== 'string') {
    return 'Unknown Artist';
  }

  let cleaned = channelTitle.trim();

  // Strip " - Topic" suffix (auto-generated YouTube artist topic channels)
  cleaned = cleaned.replace(/\s*-\s*topic$/i, '');

  // Strip "VEVO" suffix (e.g. "EminemVEVO" -> "Eminem")
  cleaned = cleaned.replace(/vevo$/i, '');

  // Strip " Official" or " Official Channel"
  cleaned = cleaned.replace(/\s+official(?:\s+channel)?$/i, '');

  cleaned = cleaned.trim();
  return cleaned || channelTitle.trim() || 'Unknown Artist';
}

/**
 * Strips promotional noise tags and brackets from a track title string.
 */
export function cleanTrackTitle(title: string): string {
  if (!title || typeof title !== 'string') return '';

  let cleaned = title;

  // 1. Remove bracketed noise: (Official Video), [Audio], (Lyrics), etc.
  cleaned = cleaned.replace(NOISE_BRACKETS_REGEX, '');

  // 2. Remove trailing pipe or slash noise: | Official Video, // Audio
  cleaned = cleaned.replace(NOISE_TRAILING_REGEX, '');

  // 3. Remove leading/trailing quotes or dashes left over
  cleaned = cleaned.replace(/^["'“”«»\s\-–—:]+|["'“”«»\s\-–—:]+$/g, '');

  // 4. Collapse multiple spaces into a single space
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return cleaned;
}

/**
 * Parses a YouTube video title and optional channel name into structured track metadata.
 *
 * @param rawTitle - Untouched video title string from YouTube API
 * @param channelTitle - Optional YouTube channel/artist name
 * @returns Structured ParsedTrackTitle containing rawTitle, cleanTitle, and artistName
 */
export function parseTrackTitle(rawTitle: string, channelTitle?: string | null): ParsedTrackTitle {
  if (!rawTitle || typeof rawTitle !== 'string') {
    const fallbackArtist = cleanChannelTitle(channelTitle);
    return {
      rawTitle: rawTitle || '',
      cleanTitle: 'Unknown Title',
      artistName: fallbackArtist,
    };
  }

  const trimmedRaw = rawTitle.trim();
  const fallbackArtist = cleanChannelTitle(channelTitle);

  // Heuristic 1: Artist "Title" with quotes
  const quoteMatch = trimmedRaw.match(/^([^"“”«»]+)\s*["“”«»]([^"“”«»]+)["“”«»]/);
  if (quoteMatch) {
    const parsedArtist = cleanTrackTitle(quoteMatch[1]);
    const parsedTitle = cleanTrackTitle(quoteMatch[2]);
    if (parsedArtist && parsedTitle) {
      return {
        rawTitle: trimmedRaw,
        cleanTitle: parsedTitle,
        artistName: parsedArtist,
      };
    }
  }

  // Heuristic 2: Standard Delimiters (" - ", " : ", " | ")
  // Match standard delimiter separating Artist and Track Title
  const delimiterMatch = trimmedRaw.match(/^(.+?)\s*(?:[-–—]|:\s+|\s\|\s)\s*(.+)$/);
  if (delimiterMatch) {
    const candidateArtist = cleanTrackTitle(delimiterMatch[1]);
    const candidateTitle = cleanTrackTitle(delimiterMatch[2]);

    if (candidateArtist && candidateTitle) {
      return {
        rawTitle: trimmedRaw,
        cleanTitle: candidateTitle,
        artistName: candidateArtist,
      };
    }
  }

  // Heuristic 3: No standard delimiter — use cleaned title and channelTitle fallback
  const cleanedTitle = cleanTrackTitle(trimmedRaw) || trimmedRaw;

  return {
    rawTitle: trimmedRaw,
    cleanTitle: cleanedTitle || 'Unknown Title',
    artistName: fallbackArtist,
  };
}
