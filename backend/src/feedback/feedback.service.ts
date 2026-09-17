import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { MailService } from './mail.service';

/**
 * ============================================================================
 * SERVICE: USER FEEDBACK SERVICE (feedback.service.ts)
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Orchestrates feedback persistence to PostgreSQL and triggers high-priority
 * notification emails to the platform administrator via MailService.
 *
 * DATA INTEGRITY:
 * Guarantees that user feedback is safely recorded in PostgreSQL first.
 * Even if an email provider temporarily fails, no user input is ever lost.
 */
@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  /**
   * Persists user feedback to database and dispatches notification email.
   *
   * @param dto - Feedback submission payload
   * @param authenticatedUser - Authenticated user session object if logged in
   * @returns Submission confirmation object
   */
  async createFeedback(dto: CreateFeedbackDto, authenticatedUser?: any) {
    const userId = authenticatedUser?.id || null;
    const userEmail = dto.email.trim().toLowerCase();
    const userName = dto.name?.trim() || authenticatedUser?.displayName || null;

    // 1. Persist feedback to PostgreSQL database
    const feedback = await this.prisma.feedback.create({
      data: {
        userId,
        userEmail,
        userName,
        category: dto.category.toLowerCase(),
        rating: dto.rating ?? null,
        subject: dto.subject.trim(),
        message: dto.message.trim(),
        deviceInfo: dto.deviceInfo?.trim() || null,
        status: 'PENDING',
        emailSent: false,
      },
    });

    this.logger.log(
      `Recorded feedback ${feedback.id} from ${userEmail} [${dto.category}] in database`
    );

    // 2. Dispatch formatted notification email
    let emailSent = false;
    try {
      emailSent = await this.mailService.sendFeedbackEmail({
        id: feedback.id,
        category: feedback.category,
        subject: feedback.subject,
        message: feedback.message,
        userEmail: feedback.userEmail,
        userName: feedback.userName,
        rating: feedback.rating,
        deviceInfo: feedback.deviceInfo,
        createdAt: feedback.createdAt,
      });

      if (emailSent) {
        await this.prisma.feedback.update({
          where: { id: feedback.id },
          data: { emailSent: true },
        });
      }
    } catch (mailError: any) {
      this.logger.error(`Error sending feedback email: ${mailError.message}`);
    }

    return {
      success: true,
      id: feedback.id,
      emailSent,
      message:
        'Thank you for your feedback! It has been successfully received and forwarded to our team.',
    };
  }

  /**
   * Retrieves recent feedback items for admin review (optional admin endpoint).
   */
  async getRecentFeedback(limit = 20) {
    return this.prisma.feedback.findMany({
      take: Math.min(100, Math.max(1, limit)),
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
          },
        },
      },
    });
  }
}
