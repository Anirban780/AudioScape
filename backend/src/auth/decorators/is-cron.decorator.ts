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

/**
 * ============================================================================
 * CUSTOM METHOD DECORATOR: @OptionalAuth()
 * ============================================================================
 * @module AuthModule
 * 
 * PURPOSE:
 * Marks an endpoint as allowing optional authentication. Signals GoogleAuthGuard
 * that anonymous requests should be permitted (with request.user set to null).
 * ============================================================================
 */
export const IS_OPTIONAL_KEY = 'isOptional';
export const OptionalAuth = () => SetMetadata(IS_OPTIONAL_KEY, true);
