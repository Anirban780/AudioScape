import { Module } from '@nestjs/common';
import { FeedbackController } from './feedback.controller';
import { FeedbackService } from './feedback.service';
import { MailService } from './mail.service';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';

/**
 * ============================================================================
 * MODULE: FEEDBACK MODULE (feedback.module.ts)
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Bundles feedback submission routing, database persistence, and Nodemailer
 * SMTP email dispatching into a cohesive NestJS module.
 */
@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [FeedbackController],
  providers: [FeedbackService, MailService],
  exports: [FeedbackService, MailService],
})
export class FeedbackModule {}
