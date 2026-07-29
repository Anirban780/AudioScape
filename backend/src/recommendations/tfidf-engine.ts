import { Injectable, Logger } from '@nestjs/common';
import * as natural from 'natural';

export interface UserHistoryItem {
  trackId: string;
  playCount: number;
  liked: boolean;
  lastPlayedAt: Date;
  track: {
    youtubeVideoId: string;
    title: string;
    artist?: string | null;
    genre: string[];
    tags: string[];
    thumbnailUrl?: string | null;
  };
}

export interface CandidateQueryGroup {
  queryId: string;
  keyword: string;
  tracks: Array<{
    youtubeVideoId: string;
    title: string;
    artist?: string | null;
    thumbnailUrl?: string | null;
    genre: string[];
    tags: string[];
  }>;
}

export interface RecommendedTrackResult {
  videoId: string;
  title: string;
  artist: string;
  thumbNail: string;
  sourceKeyword?: string;
  similarityScore?: number;
}

/**
 * ============================================================================
 * CLASS: TF-IDF MUSIC RECOMMENDATION COMPUTATION ENGINE
 * ============================================================================
 * @module RecommendationsModule
 * 
 * MATHEMATICAL FOUNDATION & ALGORITHM DESIGN:
 * 1. Content-Based Filtering: Uses Term Frequency-Inverse Document Frequency (TF-IDF)
 *    to construct vector spaces representing user listening taste vs cached search candidate items.
 * 2. User Taste Profile Weighting:
 *    For each track `t` in user history:
 *      - likedWeight    = t.liked ? 2.0 : 1.0
 *      - recencyWeight  = max(0.0, 1.0 - (now - t.lastPlayedAt) / (30 days * 86400000ms))
 *      - playCountWeight = min(5.0, t.playCount / 5.0)
 *      - randomJitter   = 0.9 + Math.random() * 0.2  (+/- 10% variance to avoid static recommendations)
 *      - compositeWeight = likedWeight * (0.5 * recencyWeight + 0.5 * playCountWeight) * randomJitter
 * 
 * 3. Cosine Similarity & Diversity Ranking:
 *    Computes similarity scores across user profile terms and candidate keyword groups.
 *    Applies Fisher-Yates shuffle on high-scoring candidate pools to prevent recommendation fatigue.
 * ============================================================================
 */
@Injectable()
export class TfIdfEngine {
  private readonly logger = new Logger(TfIdfEngine.name);

  /**
   * Computes personalized track recommendations given a user's listen history and a candidate search corpus.
   * 
   * @param userHistory - Array of recent user listen history records joined with track metadata
   * @param candidateGroups - Array of search query groups containing candidate tracks
   * @param topN - Number of recommendations to return (default: 10)
   * @returns Ranked array of recommended tracks
   */
  computeRecommendations(
    userHistory: UserHistoryItem[],
    candidateGroups: CandidateQueryGroup[],
    topN: number = 10,
  ): RecommendedTrackResult[] {
    if (!userHistory || userHistory.length === 0) {
      this.logger.log('User history is empty. Returning default selection from candidate groups.');
      return this.fallbackSelection(candidateGroups, topN);
    }

    if (!candidateGroups || candidateGroups.length === 0) {
      this.logger.log('Candidate corpus is empty. Cannot compute recommendations.');
      return [];
    }

    const now = new Date();
    const userTrackIds = new Set(userHistory.map((h) => h.trackId));

    // STEP 1: Construct weighted user taste documents
    const tfidf = new natural.TfIdf();
    const userDocTokens: string[] = [];

    for (const item of userHistory) {
      const weight = this.calculateTrackWeight(item, now);
      const textTokens = [
        ...(item.track.genre || []),
        ...(item.track.tags || []),
        item.track.artist || '',
        item.track.title || '',
      ]
        .filter(Boolean)
        .map((t) => t.toLowerCase().trim());

      // Repeat tokens based on calculated composite weight to boost term frequency
      const repeatCount = Math.max(1, Math.round(weight * 3));
      for (let i = 0; i < repeatCount; i++) {
        userDocTokens.push(...textTokens);
      }
    }

    // Add user composite taste document at document index 0
    const userDocumentText = userDocTokens.join(' ');
    tfidf.addDocument(userDocumentText);

    // STEP 2: Add candidate query keyword groups to TF-IDF corpus (document indices 1..K)
    const validGroups = candidateGroups.filter((g) => g.tracks && g.tracks.length > 0);
    for (const group of validGroups) {
      const groupTokens = [
        group.keyword,
        ...group.tracks.flatMap((t) => [...(t.genre || []), ...(t.tags || []), t.artist || '']),
      ]
        .filter(Boolean)
        .map((t) => t.toLowerCase().trim());

      tfidf.addDocument(groupTokens.join(' '));
    }

    // STEP 3: Vector similarity scoring against user taste document (index 0)
    const groupScores: Array<{ groupIndex: number; group: CandidateQueryGroup; score: number }> = [];

    for (let docIdx = 1; docIdx <= validGroups.length; docIdx++) {
      const group = validGroups[docIdx - 1];
      let score = 0;

      // Extract TF-IDF vector terms for candidate group
      const items = tfidf.listTerms(docIdx);
      for (const termObj of items) {
        // Measure overlap strength with user document (index 0)
        const userTermTfidf = tfidf.tfidf(termObj.term, 0);
        score += termObj.tfidf * userTermTfidf;
      }

      // Apply light random perturbation (0.9 - 1.1) to introduce discovery diversity
      const jitter = 0.9 + Math.random() * 0.2;
      groupScores.push({
        groupIndex: docIdx - 1,
        group,
        score: score * jitter,
      });
    }

    // Sort candidate groups by score descending
    groupScores.sort((a, b) => b.score - a.score);

    // STEP 4: Diversity track selection (one track per keyword group, excluding already played)
    const recommendedTracks: RecommendedTrackResult[] = [];
    const seenVideoIds = new Set<string>();

    // Select candidate pool (top N + 5 groups) and shuffle for variety
    const topPool = groupScores.slice(0, Math.min(groupScores.length, topN + 5));
    const shuffledPool = this.shuffleArray(topPool);

    for (const candidate of shuffledPool) {
      const availableTracks = candidate.group.tracks.filter(
        (t) => !userTrackIds.has(t.youtubeVideoId) && !seenVideoIds.has(t.youtubeVideoId),
      );

      if (availableTracks.length > 0) {
        // Pick random track from available tracks in keyword group
        const selectedTrack = availableTracks[Math.floor(Math.random() * availableTracks.length)];
        seenVideoIds.add(selectedTrack.youtubeVideoId);

        recommendedTracks.push({
          videoId: selectedTrack.youtubeVideoId,
          title: selectedTrack.title,
          artist: selectedTrack.artist || 'Unknown Artist',
          thumbNail: selectedTrack.thumbnailUrl || '',
          sourceKeyword: candidate.group.keyword,
          similarityScore: Math.round(candidate.score * 100) / 100,
        });
      }

      if (recommendedTracks.length >= topN) break;
    }

    // Fallback: If pool selection couldn't fill topN, fill from remaining candidate groups
    if (recommendedTracks.length < topN) {
      for (const group of validGroups) {
        for (const track of group.tracks) {
          if (!seenVideoIds.has(track.youtubeVideoId) && !userTrackIds.has(track.youtubeVideoId)) {
            seenVideoIds.add(track.youtubeVideoId);
            recommendedTracks.push({
              videoId: track.youtubeVideoId,
              title: track.title,
              artist: track.artist || 'Unknown Artist',
              thumbNail: track.thumbnailUrl || '',
              sourceKeyword: group.keyword,
            });
          }
          if (recommendedTracks.length >= topN) break;
        }
        if (recommendedTracks.length >= topN) break;
      }
    }

    return recommendedTracks.slice(0, topN);
  }

  /**
   * Calculates mathematical weight of a listen history track based on liked status, recency decay, and play count.
   */
  private calculateTrackWeight(item: UserHistoryItem, now: Date): number {
    const RECENCY_DECAY_DAYS = 30;
    const RECENCY_DECAY_MS = RECENCY_DECAY_DAYS * 24 * 60 * 60 * 1000;

    const likedWeight = item.liked ? 2.0 : 1.0;

    const timeDiff = now.getTime() - new Date(item.lastPlayedAt).getTime();
    const recencyWeight = Math.max(0.0, 1.0 - timeDiff / RECENCY_DECAY_MS);

    const playCountWeight = Math.min(5.0, (item.playCount || 1) / 5.0);

    const randomJitter = 0.9 + Math.random() * 0.2;

    return likedWeight * (0.5 * recencyWeight + 0.5 * playCountWeight) * randomJitter;
  }

  /**
   * Fisher-Yates array shuffling algorithm for randomizing recommendation selection.
   */
  private shuffleArray<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /**
   * Fallback selection logic when user history is empty (cold-start user scenario).
   */
  private fallbackSelection(candidateGroups: CandidateQueryGroup[], topN: number): RecommendedTrackResult[] {
    const results: RecommendedTrackResult[] = [];
    const seen = new Set<string>();

    for (const group of candidateGroups) {
      for (const track of group.tracks) {
        if (!seen.has(track.youtubeVideoId)) {
          seen.add(track.youtubeVideoId);
          results.push({
            videoId: track.youtubeVideoId,
            title: track.title,
            artist: track.artist || 'Unknown Artist',
            thumbNail: track.thumbnailUrl || '',
            sourceKeyword: group.keyword,
          });
        }
        if (results.length >= topN) break;
      }
      if (results.length >= topN) break;
    }

    return this.shuffleArray(results).slice(0, topN);
  }
}
