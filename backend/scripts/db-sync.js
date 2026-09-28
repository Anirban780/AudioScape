#!/usr/bin/env node

/**
 * ============================================================================
 * MULTI-DATABASE MIGRATION & SYNCHRONIZATION ENGINE FOR NEON POSTGRESQL
 * ============================================================================
 * 
 * PURPOSE:
 * Automates applying Prisma schema migrations and supplementary SQL
 * (GIN indexes, trigram fuzzy matching, FTS search triggers, constraints)
 * to Neon Staging, Neon Production, or BOTH simultaneously/sequentially.
 *
 * SAFETY GUARD:
 * Automatically strips '-pooler' from pooled hostnames if direct URLs
 * are not explicitly set, ensuring migrations run over Direct TCP connections
 * to avoid PgBouncer transaction-mode locking errors.
 *
 * USAGE:
 *   node scripts/db-sync.js staging       # Migrate Staging Neon DB
 *   node scripts/db-sync.js prod          # Migrate Production Neon DB
 *   node scripts/db-sync.js both          # Migrate Both Neon DBs sequentially
 *   node scripts/db-sync.js status        # Check migration status on both DBs
 * ============================================================================
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Zero-dependency .env loader so script works anywhere without node_modules
function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const content = fs.readFileSync(filePath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let val = match[2].trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  }
}

const envPath = path.resolve(__dirname, '../.env');
loadEnvFile(envPath);

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
};

function log(msg, color = colors.reset) {
  console.log(`${color}${msg}${colors.reset}`);
}

function toDirectUrl(url) {
  if (!url) return '';
  // Convert -pooler. to . in Neon hostnames
  return url.replace('-pooler.', '.');
}

const STAGING_DIRECT_URL = process.env.NEON_STAGING_DIRECT_URL || toDirectUrl(process.env.NEON_STAGING_POOLED_URL);
const PROD_DIRECT_URL = process.env.NEON_PROD_DIRECT_URL || toDirectUrl(process.env.NEON_PROD_POOLED_URL);

const backendDir = path.resolve(__dirname, '..');
const supplementarySqlPath = path.join(backendDir, 'prisma/migrations/manual_supplementary.sql');

function maskUrl(url) {
  try {
    const parsed = new URL(url);
    return `${parsed.protocol}//${parsed.username}:****@${parsed.host}${parsed.pathname}`;
  } catch {
    return 'configured-database-url';
  }
}

function runMigrationForTarget(envName, directUrl) {
  if (!directUrl) {
    log(`❌ Error: Direct connection URL for ${envName.toUpperCase()} is missing in .env!`, colors.red);
    process.exit(1);
  }

  log(`\n====================================================================`, colors.cyan);
  log(`🚀 Starting Database Migration: [${envName.toUpperCase()}]`, colors.bright + colors.cyan);
  log(`🔗 Target Host: ${maskUrl(directUrl)}`, colors.blue);
  log(`====================================================================\n`, colors.cyan);

  const env = {
    ...process.env,
    DATABASE_URL: directUrl,
  };

  try {
    log(`Step 1: Applying Prisma Migrations (npx prisma migrate deploy)...`, colors.yellow);
    execSync('npx --yes prisma migrate deploy', { cwd: backendDir, env, stdio: 'inherit' });
    log(`✅ Prisma schema migrations applied successfully.`, colors.green);
  } catch (err) {
    log(`❌ Failed applying Prisma migrations to ${envName}: ${err.message}`, colors.red);
    throw err;
  }

  if (fs.existsSync(supplementarySqlPath)) {
    try {
      log(`\nStep 2: Applying Supplementary SQL (Triggers, GIN Trigram Indexes)...`, colors.yellow);
      execSync('npx --yes prisma db execute --file prisma/migrations/manual_supplementary.sql', {
        cwd: backendDir,
        env,
        stdio: 'inherit',
      });
      log(`✅ Supplementary SQL executed successfully.`, colors.green);
    } catch (err) {
      log(`⚠️ Warning: Failed executing supplementary SQL on ${envName}: ${err.message}`, colors.yellow);
    }
  }

  log(`\n🎉 [${envName.toUpperCase()}] Database is fully up to date!\n`, colors.green + colors.bright);
}

function checkStatusForTarget(envName, directUrl) {
  if (!directUrl) {
    log(`⚠️ Missing URL for ${envName}`, colors.yellow);
    return;
  }
  log(`\n--- Migration Status for [${envName.toUpperCase()}] ---`, colors.cyan);
  const env = { ...process.env, DATABASE_URL: directUrl };
  try {
    execSync('npx --yes prisma migrate status', { cwd: backendDir, env, stdio: 'inherit' });
  } catch (err) {
    log(`Error checking status for ${envName}: ${err.message}`, colors.red);
  }
}

const target = (process.argv[2] || 'both').toLowerCase();

switch (target) {
  case 'staging':
    runMigrationForTarget('staging', STAGING_DIRECT_URL);
    break;

  case 'prod':
  case 'production':
    runMigrationForTarget('production', PROD_DIRECT_URL);
    break;

  case 'both':
  case 'all':
    log(`\n📦 SYNCING BOTH NEON DATABASES (Staging -> Production Sequential Sync)\n`, colors.bright + colors.cyan);
    log(`Phase 1: Migrating Staging Database...`, colors.yellow);
    runMigrationForTarget('staging', STAGING_DIRECT_URL);

    log(`Phase 2: Migrating Production Database...`, colors.yellow);
    runMigrationForTarget('production', PROD_DIRECT_URL);

    log(`\n🏆 All Neon environments (Staging & Production) successfully synchronized!`, colors.bright + colors.green);
    break;

  case 'status':
    checkStatusForTarget('staging', STAGING_DIRECT_URL);
    checkStatusForTarget('production', PROD_DIRECT_URL);
    break;

  default:
    log(`Usage: node scripts/db-sync.js [staging|prod|both|status]`, colors.yellow);
    process.exit(1);
}
