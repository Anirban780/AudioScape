import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { FeedbackService } from './feedback.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { GoogleAuthGuard } from '../auth/google-auth.guard';
import { OptionalAuth } from '../auth/decorators/is-cron.decorator';
import { extractClientIdentifier } from '../tracks/search-rate-limiter.service';

/**
 * In-memory submission tracking for spam prevention:
 * Max 5 feedback submissions per 10-minute sliding window per client IP/user.
 */
const submissionTracker = new Map<string, { count: number; resetAt: number }>();

/**
 * ============================================================================
 * HTTP CONTROLLER: USER FEEDBACK (feedback.controller.ts)
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Exposes endpoints for users to submit feedback, report bugs, and request features.
 * Supports both authenticated users and anonymous visitors with rate limiting.
 *
 * @route `/api/feedback`
 */
@Controller('api/feedback')
export class FeedbackController {
  private readonly logger = new Logger(FeedbackController.name);

  constructor(private readonly feedbackService: FeedbackService) {}

  /**
   * Helper verifying client submission rate.
   */
  private checkRateLimit(clientId: string) {
    const now = Date.now();
    const windowMs = 10 * 60 * 1000; // 10 minutes
    const maxSubmissions = 5;

    const record = submissionTracker.get(clientId);
    if (!record || now > record.resetAt) {
      submissionTracker.set(clientId, { count: 1, resetAt: now + windowMs });
      return;
    }

    if (record.count >= maxSubmissions) {
      const waitMinutes = Math.ceil((record.resetAt - now) / 60000);
      throw new HttpException(
        `Too many feedback submissions. Please wait ${waitMinutes} minute(s) before sending another.`,
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    record.count += 1;
  }

  /**
   * Submits user feedback or bug report.
   *
   * @route POST `/api/feedback`
   * @param dto - Validated feedback payload
   * @param req - Express request
   * @returns Submission receipt
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(GoogleAuthGuard)
  @OptionalAuth()
  async submitFeedback(@Body() dto: CreateFeedbackDto, @Req() req: Request) {
    const clientId = extractClientIdentifier(req);
    this.checkRateLimit(clientId);

    const user = (req as any).user;
    return this.feedbackService.createFeedback(dto, user);
  }
}
