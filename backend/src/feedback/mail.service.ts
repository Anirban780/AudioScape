import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

export interface FeedbackEmailPayload {
  id: string;
  category: string;
  subject: string;
  message: string;
  userEmail: string;
  userName?: string | null;
  rating?: number | null;
  deviceInfo?: string | null;
  createdAt: Date;
}

/**
 * ============================================================================
 * SERVICE: EMAIL DELIVERY SERVICE (mail.service.ts)
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Generates responsive, high-deliverability HTML email templates and dispatches
 * them to the AudioScape owner/admin via Nodemailer SMTP.
 *
 * RESILIENCE & FALLBACK:
 * If SMTP credentials (SMTP_USER/SMTP_PASS) are unconfigured in development/testing,
 * this service logs a formatted visual ASCII preview to stdout and returns false,
 * ensuring no server crashes or blocking errors occur for users.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private readonly receiverEmail: string;

  constructor() {
    this.receiverEmail =
      process.env.FEEDBACK_RECEIVER_EMAIL || 'fairytailanirbans@gmail.com';
    this.initializeTransporter();
  }

  /**
   * Initializes Nodemailer transporter if SMTP environment variables are set.
   */
  private initializeTransporter() {
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = parseInt(process.env.SMTP_PORT || '465', 10);
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (user && pass) {
      try {
        this.transporter = nodemailer.createTransport({
          host,
          port,
          secure,
          auth: { user, pass },
        });
        this.logger.log(`Nodemailer SMTP configured via ${host}:${port} (${user})`);
      } catch (err: any) {
        this.logger.error(`Failed to initialize SMTP transporter: ${err.message}`);
        this.transporter = null;
      }
    } else {
      this.logger.warn(
        `SMTP credentials (SMTP_USER/SMTP_PASS) not set. Feedback emails will be logged to server console preview.`
      );
      this.transporter = null;
    }
  }

  /**
   * Escapes untrusted HTML input strings to prevent injection in email clients.
   */
  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Maps category string to human label and badge color.
   */
  private getCategoryMeta(category: string): { label: string; bg: string; text: string } {
    switch (category?.toLowerCase()) {
      case 'bug':
        return { label: '🐛 Bug Report', bg: '#EF4444', text: '#FFFFFF' };
      case 'feature':
        return { label: '💡 Feature Request', bg: '#3B82F6', text: '#FFFFFF' };
      case 'audio':
        return { label: '🎧 Audio & Playback', bg: '#8B5CF6', text: '#FFFFFF' };
      case 'quota':
        return { label: '🔍 Search & Quota', bg: '#F59E0B', text: '#FFFFFF' };
      default:
        return { label: '💬 General Feedback', bg: '#10B981', text: '#FFFFFF' };
    }
  }

  /**
   * Formats star rating indicator.
   */
  private formatRating(rating?: number | null): string {
    if (!rating || rating < 1) return 'No rating provided';
    const stars = '★'.repeat(rating) + '☆'.repeat(Math.max(0, 5 - rating));
    return `${stars} (${rating} / 5)`;
  }

  /**
   * Generates responsive HTML email content matching AudioScape theme.
   */
  private generateHtmlEmail(feedback: FeedbackEmailPayload): string {
    const safeSubject = this.escapeHtml(feedback.subject);
    const safeMessage = this.escapeHtml(feedback.message).replace(/\n/g, '<br/>');
    const safeEmail = this.escapeHtml(feedback.userEmail);
    const safeName = this.escapeHtml(feedback.userName || 'Anonymous User');
    const categoryMeta = this.getCategoryMeta(feedback.category);
    const ratingStr = this.formatRating(feedback.rating);
    const timestamp = feedback.createdAt.toLocaleString('en-US', {
      dateStyle: 'full',
      timeStyle: 'medium',
      timeZone: 'Asia/Kolkata',
    });

    let diagnosticsHtml = '';
    if (feedback.deviceInfo) {
      try {
        const parsed = JSON.parse(feedback.deviceInfo);
        const rows = Object.entries(parsed)
          .map(
            ([key, val]) =>
              `<tr>
                <td style="padding: 6px 10px; color: #94A3B8; font-size: 12px; border-bottom: 1px solid #334155; text-transform: capitalize;">${this.escapeHtml(key)}</td>
                <td style="padding: 6px 10px; color: #F1F5F9; font-size: 12px; border-bottom: 1px solid #334155; font-family: monospace;">${this.escapeHtml(String(val))}</td>
              </tr>`
          )
          .join('');
        diagnosticsHtml = `
          <div style="margin-top: 24px; padding: 16px; background-color: #0F172A; border: 1px solid #334155; border-radius: 12px;">
            <h4 style="margin: 0 0 10px 0; color: #38BDF8; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">Client System & Audio Context</h4>
            <table style="width: 100%; border-collapse: collapse;">
              <tbody>${rows}</tbody>
            </table>
          </div>`;
      } catch {
        diagnosticsHtml = `
          <div style="margin-top: 24px; padding: 16px; background-color: #0F172A; border: 1px solid #334155; border-radius: 12px;">
            <h4 style="margin: 0 0 10px 0; color: #38BDF8; font-size: 13px; text-transform: uppercase;">Client Context</h4>
            <p style="margin: 0; color: #CBD5E1; font-size: 12px; font-family: monospace;">${this.escapeHtml(feedback.deviceInfo)}</p>
          </div>`;
      }
    }

    const replySubject = encodeURIComponent(`Re: [AudioScape Feedback] ${feedback.subject}`);
    const replyMailto = `mailto:${safeEmail}?subject=${replySubject}`;

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AudioScape User Feedback</title>
</head>
<body style="margin: 0; padding: 24px 12px; background-color: #0B0F19; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #F1F5F9;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 620px; background-color: #151D2E; border: 1px solid #1E293B; border-radius: 18px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
          
          <!-- Header Banner -->
          <tr>
            <td style="padding: 28px 32px; background: linear-gradient(135deg, #1E1B4B 0%, #0F172A 100%); border-bottom: 2px solid #00F0FF;">
              <table width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <span style="display: inline-block; font-size: 24px; font-weight: 900; letter-spacing: 0.08em; text-transform: uppercase; background: linear-gradient(90deg, #00F0FF, #8A2BE2, #FF66CC); -webkit-background-clip: text; -webkit-text-fill-color: transparent; color: #00F0FF;">
                      AUDIOSCAPE
                    </span>
                    <span style="display: block; margin-top: 4px; font-size: 13px; color: #94A3B8; letter-spacing: 0.05em;">
                      Incoming User Feedback Notification
                    </span>
                  </td>
                  <td align="right">
                    <span style="display: inline-block; padding: 6px 14px; border-radius: 20px; font-size: 12px; font-weight: 700; background-color: ${categoryMeta.bg}; color: ${categoryMeta.text}; text-transform: uppercase;">
                      ${categoryMeta.label}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 28px 32px;">
              
              <!-- Subject Header -->
              <h2 style="margin: 0 0 16px 0; font-size: 20px; font-weight: 800; color: #FFFFFF; line-height: 1.3;">
                ${safeSubject}
              </h2>

              <!-- Key Metadata Badges -->
              <table width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px; background-color: #0F172A; border-radius: 12px; padding: 14px 18px;">
                <tr>
                  <td style="padding: 4px 0; font-size: 13px; color: #94A3B8; width: 90px;">From:</td>
                  <td style="padding: 4px 0; font-size: 13px; color: #F1F5F9; font-weight: 600;">
                    ${safeName} (<a href="${replyMailto}" style="color: #00F0FF; text-decoration: none;">${safeEmail}</a>)
                  </td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; font-size: 13px; color: #94A3B8;">Rating:</td>
                  <td style="padding: 4px 0; font-size: 14px; color: #F59E0B; font-weight: 700;">
                    ${ratingStr}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; font-size: 13px; color: #94A3B8;">Received:</td>
                  <td style="padding: 4px 0; font-size: 13px; color: #CBD5E1;">
                    ${timestamp}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; font-size: 13px; color: #94A3B8;">Feedback ID:</td>
                  <td style="padding: 4px 0; font-size: 12px; color: #64748B; font-family: monospace;">
                    ${feedback.id}
                  </td>
                </tr>
              </table>

              <!-- Message Body Card -->
              <div style="background-color: #0B0F19; border: 1px solid #1E293B; border-left: 4px solid #00F0FF; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #E2E8F0; white-space: pre-wrap;">${safeMessage}</p>
              </div>

              <!-- System Diagnostics Section -->
              ${diagnosticsHtml}

              <!-- Direct Action Button -->
              <div style="margin-top: 32px; text-align: center;">
                <a href="${replyMailto}" style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #00F0FF 0%, #0284C7 100%); color: #0A0E1A; font-size: 14px; font-weight: 800; text-decoration: none; border-radius: 10px; text-transform: uppercase; letter-spacing: 0.05em; box-shadow: 0 4px 14px rgba(0, 240, 255, 0.4);">
                  ✉️ Reply Directly to User
                </a>
              </div>

            </td>
          </tr>

          <!-- Footer Note -->
          <tr>
            <td style="padding: 20px 32px; background-color: #0F172A; border-top: 1px solid #1E293B; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #64748B; line-height: 1.5;">
                This message was submitted through the AudioScape Help & Feedback system.<br/>
                Delivered automatically to ${this.receiverEmail}.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
  }

  /**
   * Generates structured plain text email content.
   */
  private generateTextEmail(feedback: FeedbackEmailPayload): string {
    const categoryMeta = this.getCategoryMeta(feedback.category);
    const ratingStr = this.formatRating(feedback.rating);

    return `===================================================================
AUDIOSCAPE USER FEEDBACK NOTIFICATION
===================================================================

Category:    ${categoryMeta.label}
Subject:     ${feedback.subject}
From:        ${feedback.userName || 'Anonymous'} <${feedback.userEmail}>
Rating:      ${ratingStr}
Date:        ${feedback.createdAt.toISOString()}
Feedback ID: ${feedback.id}

-------------------------------------------------------------------
MESSAGE:
-------------------------------------------------------------------
${feedback.message}

-------------------------------------------------------------------
DIAGNOSTICS:
-------------------------------------------------------------------
${feedback.deviceInfo || 'None provided'}

===================================================================
Reply directly by emailing: ${feedback.userEmail}
===================================================================
`;
  }

  /**
   * Sends the feedback email or prints a formatted server console preview.
   *
   * @param feedback - Feedback record details
   * @returns boolean indicating whether email dispatch succeeded via SMTP
   */
  async sendFeedbackEmail(feedback: FeedbackEmailPayload): Promise<boolean> {
    const categoryMeta = this.getCategoryMeta(feedback.category);
    const subject = `[AudioScape Feedback] [${categoryMeta.label}] ${feedback.subject} (from ${feedback.userName || feedback.userEmail})`;
    const html = this.generateHtmlEmail(feedback);
    const text = this.generateTextEmail(feedback);

    if (this.transporter) {
      try {
        const from =
          process.env.SMTP_FROM ||
          `"AudioScape Feedback" <${process.env.SMTP_USER || 'noreply@audioscape.app'}>`;

        const info = await this.transporter.sendMail({
          from,
          to: this.receiverEmail,
          replyTo: feedback.userEmail,
          subject,
          text,
          html,
        });

        this.logger.log(
          `Feedback email successfully dispatched to ${this.receiverEmail} (MessageId: ${info.messageId})`
        );
        return true;
      } catch (err: any) {
        this.logger.error(`Failed to send email via SMTP transporter: ${err.message}`);
        this.logConsolePreview(feedback, subject);
        return false;
      }
    } else {
      this.logConsolePreview(feedback, subject);
      return false;
    }
  }

  /**
   * Renders a clean ASCII banner in server logs when SMTP is unconfigured.
   */
  private logConsolePreview(feedback: FeedbackEmailPayload, subject: string) {
    const categoryMeta = this.getCategoryMeta(feedback.category);
    const separator = '═'.repeat(70);
    const thinSep = '─'.repeat(70);

    const logOutput = `
╔${separator}╗
║                📨 AUDIOSCAPE USER FEEDBACK DISPATCH                   ║
╠${separator}╣
║ To:        ${this.receiverEmail.padEnd(59)}║
║ From:      ${(feedback.userEmail + (feedback.userName ? ` (${feedback.userName})` : '')).padEnd(59)}║
║ Category:  ${categoryMeta.label.padEnd(59)}║
║ Rating:    ${this.formatRating(feedback.rating).padEnd(59)}║
║ Subject:   ${feedback.subject.substring(0, 58).padEnd(59)}║
║ Date:      ${feedback.createdAt.toISOString().padEnd(59)}║
╠${thinSep}╣
║ MESSAGE PREVIEW:                                                     ║
║ ${feedback.message.replace(/\n/g, '\n║ ').substring(0, 200).padEnd(68)} ║
╠${thinSep}╣
║ Context:   ${(feedback.deviceInfo || 'None provided').substring(0, 58).padEnd(59)}║
╚${separator}╝
`;
    this.logger.log(logOutput);
  }
}
