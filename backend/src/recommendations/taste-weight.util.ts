/**
 * ============================================================================
 * UTILITY: TASTE WEIGHT & QUALITY SCORE CALCULATOR
 * ============================================================================
 * @module RecommendationsModule
 * 
 * PURPOSE:
 * Computes deterministic mathematical preference weights for user listen history items
 * and content quality scores for candidate tracks.
 * 
 * MATHEMATICAL FOUNDATION:
 * 1. Taste Weight:
 *    TasteWeight(h) = log2(playCount + 1) * (liked ? 2.0 : 1.0) * (1 / (1 + daysSincePlay / 30))
 *    - Logarithmic play count prevents replay loops from dominating taste profile.
 *    - Liked tracks receive a 2.0x boost reflecting explicit affirmative preference.
 *    - Exponential recency decay half-life of 30 days ensures taste adapts over time.
 * 
 * 2. Quality Score:
 *    QualityScore(t) = clamp((likeCount / (viewCount + 1)) * 30 * (isEmbeddable ? 1.0 : 0.0), 0.0, 1.0)
 *    - Filters out broken or unembeddable YouTube videos (score 0.0).
 *    - Uses like-to-view ratio (typical music ratio 2-4% maps to 0.6 - 1.0).
 *    - Defaults to neutral 0.5 for newly ingested tracks without view counts.
 * ============================================================================
 */

export interface TasteWeightInput {
  liked: boolean;
  lastPlayedAt: Date | string;
  playCount: number;
}

export interface TrackQualityInput {
  viewCount?: number | bigint | string | null;
  likeCount?: number | bigint | string | null;
  isEmbeddable?: boolean | null;
  qualityScore?: number | null;
}

/**
 * Calculates mathematical taste weight of a listen history item.
 * 
 * @param item - Listen history item with liked flag, lastPlayedAt, and playCount
 * @param now - Reference date for recency calculation (defaults to Date.now())
 * @returns Non-negative numerical weight
 */
export function calculateTasteWeight(item: TasteWeightInput, now: Date = new Date()): number {
  const playCount = Math.max(1, item.playCount || 1);
  // Logarithmic play count scaling: 1 play -> 1.0, 3 plays -> 2.0, 7 plays -> 3.0
  const playFactor = Math.log2(playCount + 1);

  // Affirmative preference multiplier (liked tracks receive 2.0x boost)
  const likedMultiplier = item.liked ? 2.0 : 1.0;

  // 30-day half-life recency decay: 1 / (1 + days / 30)
  const lastPlayedMs = new Date(item.lastPlayedAt).getTime();
  const diffMs = Math.max(0, now.getTime() - lastPlayedMs);
  const daysSincePlay = diffMs / (1000 * 60 * 60 * 24);
  const recencyDecay = 1.0 / (1.0 + daysSincePlay / 30.0);

  return playFactor * likedMultiplier * recencyDecay;
}

/**
 * Calculates content quality score for a track (0.0 to 1.0).
 * 
 * @param track - Track metadata containing viewCount, likeCount, and isEmbeddable
 * @returns Normalized quality score between 0.0 and 1.0
 */
export function calculateQualityScore(track: TrackQualityInput): number {
  // If track is explicitly unembeddable, score is 0.0 (cannot be played in AudioScape player)
  if (track.isEmbeddable === false) {
    return 0.0;
  }

  // If a valid precomputed quality score exists, honor it
  if (typeof track.qualityScore === 'number' && track.qualityScore >= 0 && track.qualityScore <= 1) {
    return track.qualityScore;
  }

  // Defensive parsing of BigInt/string/number counts
  const viewCount = track.viewCount != null ? Number(track.viewCount) : 0;
  const likeCount = track.likeCount != null ? Number(track.likeCount) : 0;

  // If viewCount is absent or zero, assign a neutral baseline score of 0.5
  if (!viewCount || viewCount <= 0) {
    return 0.5;
  }

  // Like-to-view ratio: average high-quality music video has ~2.5% to 4% like ratio
  // Scaling by 30 maps a 3.33% ratio to 1.0. Clamped between 0.0 and 1.0.
  const ratio = Math.max(0, likeCount) / (viewCount + 1);
  const scaledScore = ratio * 30.0;

  return Math.min(1.0, Math.max(0.0, Math.round(scaledScore * 1000) / 1000));
}
