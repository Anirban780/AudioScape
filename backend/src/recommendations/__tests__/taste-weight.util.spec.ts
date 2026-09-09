import { calculateTasteWeight, calculateQualityScore } from '../taste-weight.util';

describe('TasteWeightUtil', () => {
  describe('calculateTasteWeight', () => {
    const baseDate = new Date('2026-09-09T12:00:00Z');

    it('calculates weight with logarithmic play count scaling for freshly played tracks', () => {
      // 1 play: log2(1 + 1) = 1.0, liked = false, recency = 1.0 -> 1.0
      const weight1 = calculateTasteWeight({ liked: false, lastPlayedAt: baseDate, playCount: 1 }, baseDate);
      expect(weight1).toBeCloseTo(1.0, 4);

      // 3 plays: log2(3 + 1) = 2.0, liked = false, recency = 1.0 -> 2.0
      const weight3 = calculateTasteWeight({ liked: false, lastPlayedAt: baseDate, playCount: 3 }, baseDate);
      expect(weight3).toBeCloseTo(2.0, 4);

      // 7 plays: log2(7 + 1) = 3.0, liked = false, recency = 1.0 -> 3.0
      const weight7 = calculateTasteWeight({ liked: false, lastPlayedAt: baseDate, playCount: 7 }, baseDate);
      expect(weight7).toBeCloseTo(3.0, 4);
    });

    it('doubles the score for liked tracks', () => {
      const unliked = calculateTasteWeight({ liked: false, lastPlayedAt: baseDate, playCount: 1 }, baseDate);
      const liked = calculateTasteWeight({ liked: true, lastPlayedAt: baseDate, playCount: 1 }, baseDate);
      expect(liked).toBeCloseTo(unliked * 2.0, 4);
    });

    it('decays smoothly with a 30-day half-life', () => {
      const thirtyDaysAgo = new Date(baseDate.getTime() - 30 * 24 * 60 * 60 * 1000);
      const weight30Days = calculateTasteWeight({ liked: false, lastPlayedAt: thirtyDaysAgo, playCount: 1 }, baseDate);
      // recencyDecay = 1 / (1 + 30/30) = 0.5
      expect(weight30Days).toBeCloseTo(0.5, 3);

      const sixtyDaysAgo = new Date(baseDate.getTime() - 60 * 24 * 60 * 60 * 1000);
      const weight60Days = calculateTasteWeight({ liked: false, lastPlayedAt: sixtyDaysAgo, playCount: 1 }, baseDate);
      // recencyDecay = 1 / (1 + 60/30) = 0.3333
      expect(weight60Days).toBeCloseTo(1 / 3, 3);
    });

    it('handles zero or negative playCount gracefully', () => {
      const weightZero = calculateTasteWeight({ liked: false, lastPlayedAt: baseDate, playCount: 0 }, baseDate);
      expect(weightZero).toBeCloseTo(1.0, 4);
    });
  });

  describe('calculateQualityScore', () => {
    it('returns 0.0 if track is explicitly not embeddable', () => {
      const score = calculateQualityScore({
        viewCount: 1000000,
        likeCount: 50000,
        isEmbeddable: false,
      });
      expect(score).toBe(0.0);
    });

    it('returns precomputed qualityScore if present', () => {
      const score = calculateQualityScore({
        qualityScore: 0.85,
        viewCount: 100,
        likeCount: 1,
      });
      expect(score).toBe(0.85);
    });

    it('returns baseline 0.5 when viewCount is 0 or null', () => {
      expect(calculateQualityScore({ viewCount: 0, likeCount: 0 })).toBe(0.5);
      expect(calculateQualityScore({ viewCount: null, likeCount: null })).toBe(0.5);
    });

    it('calculates like-to-view ratio scaled score and clamps to 1.0', () => {
      // 3.33% like ratio -> (3333 / 100001) * 30 ~ 1.0
      const score = calculateQualityScore({
        viewCount: 100000,
        likeCount: 3333,
        isEmbeddable: true,
      });
      expect(score).toBeGreaterThan(0.9);
      expect(score).toBeLessThanOrEqual(1.0);

      // Extreme high ratio clamps to 1.0
      const clamped = calculateQualityScore({
        viewCount: 1000,
        likeCount: 500,
        isEmbeddable: true,
      });
      expect(clamped).toBe(1.0);
    });

    it('handles BigInt viewCount and likeCount values', () => {
      const score = calculateQualityScore({
        viewCount: BigInt(50000),
        likeCount: BigInt(1500),
        isEmbeddable: true,
      });
      expect(score).toBeGreaterThan(0.5);
      expect(score).toBeLessThanOrEqual(1.0);
    });
  });
});
