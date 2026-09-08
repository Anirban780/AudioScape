import { SetMetadata } from '@nestjs/common';

/**
 * ============================================================================
 * CUSTOM METHOD DECORATOR: @IsCron()
 * ============================================================================
 * @module AuthModule
 * 
 * PURPOSE:
 * Marks an endpoint as a background cron or maintenance task. When attached to
 * an endpoint (along with @UseGuards(CronAuthGuard)), signals GoogleAuthGuard
 * to bypass user OAuth verification and delegate authentication strictly to CronAuthGuard.
 * ============================================================================
 */
export const IS_CRON_KEY = 'isCron';
export const IsCron = () => SetMetadata(IS_CRON_KEY, true);
