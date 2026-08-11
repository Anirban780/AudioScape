export interface TasteWeightInput {
  liked: boolean;
  lastPlayedAt: Date | string;
  playCount: number;
}

/**
 * Calculates mathematical weight of a listen history item based on liked status, recency decay, and play count.
 * Incorporates a +/- 10% random jitter to introduce recommendation diversity.
 * 
 * Formula:
 * compositeWeight = likedWeight * (0.5 * recencyWeight + 0.5 * playCountWeight) * randomJitter
 * 
 * - likedWeight: 2.0 if liked, 1.0 otherwise.
 * - recencyWeight: linear decay over 30 days, down to 0.0.
 * - playCountWeight: capped at 5 plays (score 1.0 max), playCount / 5.0.
 * - randomJitter: random number between 0.9 and 1.1.
 */
export function calculateTasteWeight(item: TasteWeightInput, now: Date = new Date()): number {
  const RECENCY_DECAY_DAYS = 30;
  const RECENCY_DECAY_MS = RECENCY_DECAY_DAYS * 24 * 60 * 60 * 1000;

  const likedWeight = item.liked ? 2.0 : 1.0;

  const timeDiff = now.getTime() - new Date(item.lastPlayedAt).getTime();
  const recencyWeight = Math.max(0.0, 1.0 - timeDiff / RECENCY_DECAY_MS);

  const playCountWeight = Math.min(5.0, (item.playCount || 1) / 5.0);

  const randomJitter = 0.9 + Math.random() * 0.2;

  return likedWeight * (0.5 * recencyWeight + 0.5 * playCountWeight) * randomJitter;
}
