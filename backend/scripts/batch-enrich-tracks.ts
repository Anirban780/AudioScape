/**
 * ============================================================================
 * SCRIPT: YOUTUBE TRACK METADATA BATCH ENRICHMENT MIGRATION TOOL
 * ============================================================================
 * @module Scripts
 *
 * WHAT THIS SCRIPT DOES:
 * Standalone, resumable, rate-controlled batch migration tool that backfills
 * rich YouTube Data API v3 metadata (`viewCount`, `likeCount`, `duration`,
 * `durationSeconds`, `tags`, `publishedAt`, `description`, `categoryId`,
 * `licensedContent`, `isEmbeddable`, `rawTitle`, `artistName`, `cleanTitle`)
 * for all un-enriched tracks in the PostgreSQL database.
 *
 * WHY THIS IS NEEDED (Phase 2):
 * 6,933+ historical tracks currently lack view counts, duration, and artist names.
 * This migration enriches them in configurable batches (default: 2 tracks per call,
 * up to 50) using only 1 YouTube quota unit per batch, ensuring fast completion
 * within daily quota limits without throttling.
 *
 * HOW TO RUN:
 * - Test run (10 tracks, batch size 2):
 *     npm run enrich:batch:test
 * - Fast run (50 tracks per batch):
 *     npm run enrich:batch:fast
 * - Dry run (5 tracks preview):
 *     npm run enrich:batch:dry
 * - Custom CLI arguments:
 *     npx ts-node scripts/batch-enrich-tracks.ts --batch-size=10 --limit=100 --delay=300
 * ============================================================================
 */

import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables from backend/.env
dotenv.config({ path: path.join(__dirname, '../.env') });

import axios from 'axios';
import { PrismaClient, ApiEndpoint } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { parseTrackTitle, cleanChannelTitle } from '../src/tracks/utils/title-parser.util';

// ════════════════════════════════════════════════════════════
// CONFIGURATION & CLI ARGUMENT PARSER
// ════════════════════════════════════════════════════════════

export interface BatchEnrichmentConfig {
  batchSize: number;
  limit: number | null;
  delayMs: number;
  dryRun: boolean;
  onlyMissingArtist: boolean;
}

export function parseCliArguments(argv: string[]): BatchEnrichmentConfig {
  const args = argv.slice(2);
  let batchSize = parseInt(process.env.ENRICHMENT_BATCH_SIZE || '2', 10);
  let limit: number | null = null;
  let delayMs = parseInt(process.env.ENRICHMENT_DELAY_MS || '500', 10);
  let dryRun = false;
  let onlyMissingArtist = false;

  for (const arg of args) {
    if (arg.startsWith('--batch-size=')) {
      const val = parseInt(arg.split('=')[1], 10);
      if (!isNaN(val)) batchSize = Math.max(1, Math.min(val, 50));
    } else if (arg.startsWith('--limit=')) {
      const val = parseInt(arg.split('=')[1], 10);
      if (!isNaN(val) && val > 0) limit = val;
    } else if (arg.startsWith('--delay=')) {
      const val = parseInt(arg.split('=')[1], 10);
      if (!isNaN(val) && val >= 0) delayMs = val;
    } else if (arg === '--dry-run') {
      dryRun = true;
    } else if (arg === '--only-missing-artist') {
      onlyMissingArtist = true;
    }
  }

  return {
    batchSize: Math.max(1, Math.min(batchSize, 50)),
    limit,
    delayMs,
    dryRun,
    onlyMissingArtist,
  };
}

// ════════════════════════════════════════════════════════════
// MODULAR HELPERS (Exported for Unit Testing)
// ════════════════════════════════════════════════════════════

/**
 * Splits an array into sub-arrays of specified chunk size.
 */
export function chunkArray<T>(items: T[], chunkSize: number): T[][] {
  if (chunkSize <= 0) return [items];
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * Parses YouTube ISO 8601 duration (e.g. "PT3M45S", "PT1H2M3S") into total seconds.
 */
export function parseIsoDurationSeconds(isoDuration?: string | null): number | null {
  if (!isoDuration || typeof isoDuration !== 'string') return null;
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return null;
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  const total = hours * 3600 + minutes * 60 + seconds;
  return total > 0 ? total : null;
}

/**
 * Detects video IDs requested in a batch that were omitted from YouTube's API response.
 * Missing IDs signify deleted, private, or region-blocked videos.
 */
export function detectUnavailableVideoIds(requestedIds: string[], returnedItems: Array<{ id: string }>): string[] {
  const returnedIdSet = new Set(returnedItems.map((item) => item.id));
  return requestedIds.filter((id) => !returnedIdSet.has(id));
}

/**
 * Maps a single YouTube API item into the Prisma track update payload.
 */
export function mapYouTubeItemToTrackUpdate(item: any) {
  const { title, channelTitle, publishedAt, description, categoryId, tags } = item.snippet || {};
  const { duration, licensedContent } = item.contentDetails || {};
  const { viewCount, likeCount } = item.statistics || {};
  const embeddable = item.status?.embeddable ?? true;
  const topicCategories = Array.isArray(item.topicDetails?.topicCategories) ? item.topicDetails.topicCategories : [];

  const parsed = parseTrackTitle(title || '', channelTitle || '');
  const durationSec = parseIsoDurationSeconds(duration);
  const tagList = Array.isArray(tags) ? tags : [];

  return {
    rawTitle: parsed.rawTitle,
    title: parsed.cleanTitle,
    artistName: parsed.artistName,
    artist: channelTitle ? cleanChannelTitle(channelTitle) : parsed.artistName,
    duration: duration || null,
    durationSeconds: durationSec,
    tags: tagList,
    genre: tagList, // Mirror tags into genre to provide signal to recommendation TF-IDF engine
    topicCategories,
    publishedAt: publishedAt ? new Date(publishedAt) : null,
    description: description || null,
    categoryId: categoryId || null,
    viewCount: viewCount ? BigInt(viewCount) : null,
    likeCount: likeCount ? BigInt(likeCount) : null,
    licensedContent: Boolean(licensedContent),
    isEmbeddable: Boolean(embeddable),
    isAvailable: true,
    lastFetchedAt: new Date(),
  };
}

// ════════════════════════════════════════════════════════════
// DUAL-KEY ROTATION & QUOTA TRACKER
// ════════════════════════════════════════════════════════════

export class BatchKeyManager {
  private keyA: string;
  private keyB: string;
  private activeKeyId: 'A' | 'B';
  private totalQuotaConsumed = 0;

  constructor() {
    this.keyA = process.env.YOUTUBE_API_KEY_A || process.env.YOUTUBE_API_KEY || '';
    this.keyB = process.env.YOUTUBE_API_KEY_B || process.env.YOUTUBE_API_KEY || '';
    this.activeKeyId = 'A';
  }

  getActiveKey(): { key: string; keyId: 'A' | 'B' } {
    const key = this.activeKeyId === 'A' ? this.keyA : this.keyB;
    return { key, keyId: this.activeKeyId };
  }

  rotateKey(): boolean {
    if (this.activeKeyId === 'A' && this.keyB && this.keyB !== this.keyA) {
      console.log('🔄 [KeyManager] Rotating from Key A to Key B due to quota exhaustion.');
      this.activeKeyId = 'B';
      return true;
    } else if (this.activeKeyId === 'B' && this.keyA && this.keyA !== this.keyB) {
      console.log('🔄 [KeyManager] Rotating from Key B to Key A.');
      this.activeKeyId = 'A';
      return true;
    }
    return false;
  }

  recordUsage(units: number) {
    this.totalQuotaConsumed += units;
  }

  getTotalQuota(): number {
    return this.totalQuotaConsumed;
  }
}

// ════════════════════════════════════════════════════════════
// MAIN ENRICHMENT RUNNER
// ════════════════════════════════════════════════════════════

async function run() {
  const config = parseCliArguments(process.argv);

  console.log('\n============================================================================');
  console.log(' AUDIOSCAPE YOUTUBE TRACK BATCH ENRICHMENT MIGRATION');
  console.log('============================================================================');
  console.log(` Batch Size:          ${config.batchSize} tracks per API call`);
  console.log(` Limit:               ${config.limit ? config.limit + ' tracks' : 'Unlimited (All un-enriched tracks)'}`);
  console.log(` Batch Delay:         ${config.delayMs}ms`);
  console.log(` Dry Run Mode:        ${config.dryRun ? 'YES (No database writes)' : 'NO (Persisting to PostgreSQL)'}`);
  console.log(` Filter:              ${config.onlyMissingArtist ? 'Tracks missing artist_name only' : 'All un-enriched tracks'}`);
  console.log('============================================================================\n');

  // Initialize Prisma Client with PostgreSQL connection pool
  const connectionString =
    process.env.DATABASE_URL ||
    process.env.LOCAL_DATABASE_URL ||
    'postgresql://postgres:postgrespassword@localhost:5432/audioscape?schema=public';

  const isNeon = connectionString.includes('neon.tech');
  const useSsl = isNeon || connectionString.includes('sslmode=require');
  console.log(`🔌 Target Database:     ${isNeon ? 'Neon Cloud' : 'Local Docker PostgreSQL'} (${connectionString.split('@')[1] || connectionString})`);

  const pool = new Pool({
    connectionString,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  const keyManager = new BatchKeyManager();
  const startTime = Date.now();

  let totalProcessed = 0;
  let totalEnriched = 0;
  let totalUnavailable = 0;
  let totalFailed = 0;

  try {
    // 1. Query candidate un-enriched tracks
    console.log('🔍 Querying candidate un-enriched tracks from database...');

    const whereClause: any = {
      isAvailable: true,
    };

    if (config.onlyMissingArtist) {
      whereClause.artistName = null;
    } else {
      whereClause.OR = [
        { viewCount: null },
        { duration: null },
        { tags: { equals: [] } },
        { artistName: null },
      ];
    }

    const candidates = await prisma.tracks.findMany({
      where: whereClause,
      select: {
        youtubeVideoId: true,
        title: true,
        artist: true,
        channelId: true,
      },
      orderBy: { createdAt: 'desc' },
      take: config.limit || undefined,
    });

    const totalToProcess = candidates.length;
    console.log(`📊 Found ${totalToProcess} un-enriched tracks ready for batch processing.\n`);

    if (totalToProcess === 0) {
      console.log('✅ All tracks are already fully enriched! Nothing to process.');
      await prisma.$disconnect();
      return;
    }

    // 2. Chunk candidates into batches
    const batches = chunkArray(candidates, config.batchSize);
    console.log(`📦 Partitioned into ${batches.length} batches of up to ${config.batchSize} tracks.\n`);

    // 3. Process batches sequentially
    for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
      const currentBatch = batches[batchIdx];
      const batchIds = currentBatch.map((t) => t.youtubeVideoId);
      const batchNumber = batchIdx + 1;

      let apiSuccess = false;
      let attempts = 0;

      while (!apiSuccess && attempts < 2) {
        attempts++;
        const { key, keyId } = keyManager.getActiveKey();

        try {
          const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics,status,topicDetails&id=${batchIds.join(',')}&key=${key}`;
          const response = await axios.get(url, { timeout: 10000 });
          apiSuccess = true;

          // Record quota consumption (1 unit per videos.list call)
          keyManager.recordUsage(1);

          if (!config.dryRun) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            await prisma.apiQuotaUsage
              .upsert({
                where: {
                  date_endpoint_apiKeyId: {
                    date: today,
                    endpoint: ApiEndpoint.VIDEOS_LIST,
                    apiKeyId: keyId,
                  },
                },
                update: { unitsConsumed: { increment: 1 } },
                create: {
                  date: today,
                  endpoint: ApiEndpoint.VIDEOS_LIST,
                  unitsConsumed: 1,
                  apiKeyId: keyId,
                },
              })
              .catch(() => {}); // Non-fatal if quota recording fails
          }

          const items: any[] = response.data?.items || [];

          // Process returned enriched items
          for (const item of items) {
            const updateData = mapYouTubeItemToTrackUpdate(item);

            if (config.dryRun) {
              console.log(`   [DRY RUN] ${item.id}: "${updateData.title}" | Artist: "${updateData.artistName}" | Views: ${updateData.viewCount} | Duration: ${updateData.durationSeconds}s`);
            } else {
              // Ensure channel exists if channelId is valid
              if (item.snippet?.channelId && item.snippet?.channelTitle) {
                await prisma.channel
                  .upsert({
                    where: { id: item.snippet.channelId },
                    update: { title: item.snippet.channelTitle, updatedAt: new Date() },
                    create: { id: item.snippet.channelId, title: item.snippet.channelTitle },
                  })
                  .catch(() => {});
              }

              await prisma.tracks.update({
                where: { youtubeVideoId: item.id },
                data: updateData,
              });
            }

            totalEnriched++;
          }

          // Handle unavailable / deleted videos
          const unavailableIds = detectUnavailableVideoIds(batchIds, items);
          for (const unavailableId of unavailableIds) {
            if (config.dryRun) {
              console.log(`   [DRY RUN - UNAVAILABLE] ${unavailableId}: Video removed or private on YouTube. Marking isAvailable=false`);
            } else {
              await prisma.tracks.update({
                where: { youtubeVideoId: unavailableId },
                data: {
                  isAvailable: false,
                  lastFetchedAt: new Date(),
                },
              });
            }
            totalUnavailable++;
          }

          totalProcessed += batchIds.length;
          const percent = ((totalProcessed / totalToProcess) * 100).toFixed(1);
          const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
          const rate = (totalProcessed / (Number(elapsedSec) || 1)).toFixed(1);

          console.log(
            `[Batch ${batchNumber}/${batches.length}] (${percent}%) Processed: ${totalProcessed}/${totalToProcess} | Enriched: ${totalEnriched} | Unavailable: ${totalUnavailable} | Quota: ${keyManager.getTotalQuota()} units (Key ${keyId}) | ${rate} tracks/s`
          );
        } catch (apiError: any) {
          const status = apiError.response?.status;
          const reason = apiError.response?.data?.error?.errors?.[0]?.reason || apiError.message;

          if (status === 403 && (reason === 'quotaExceeded' || reason === 'dailyLimitExceeded')) {
            console.warn(`⚠️  [Quota Exceeded] YouTube API Key ${keyId} quota exhausted.`);
            const rotated = keyManager.rotateKey();
            if (!rotated) {
              console.error('❌ All available YouTube API keys have exhausted their daily quota. Halting gracefully.');
              break;
            }
          } else {
            console.error(`❌ [Batch Error] Batch ${batchNumber} failed on attempt ${attempts}: ${reason}`);
            if (attempts >= 2) {
              totalFailed += batchIds.length;
            }
          }
        }
      }

      // Respect rate-limiting delay between batches
      if (config.delayMs > 0 && batchIdx < batches.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, config.delayMs));
      }
    }
  } catch (fatalError: any) {
    console.error('💥 Fatal error during batch enrichment execution:', fatalError.message);
  } finally {
    const elapsedTotal = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log('\n============================================================================');
    console.log(' BATCH ENRICHMENT RUN SUMMARY');
    console.log('============================================================================');
    console.log(` Total Processed:      ${totalProcessed}`);
    console.log(` Successfully Enriched:${totalEnriched}`);
    console.log(` Marked Unavailable:   ${totalUnavailable}`);
    console.log(` Failed/Skipped:       ${totalFailed}`);
    console.log(` Quota Units Consumed: ${keyManager.getTotalQuota()}`);
    console.log(` Elapsed Time:         ${elapsedTotal}s`);
    console.log('============================================================================\n');

    await prisma.$disconnect();
    await pool.end();
  }
}

// Execute runner if executed directly
if (require.main === module) {
  run()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Script terminated with error:', err);
      process.exit(1);
    });
}
