import { Test, TestingModule } from '@nestjs/testing';
import { FeedbackService } from '../feedback.service';
import { MailService } from '../mail.service';
import { PrismaService } from '../../prisma/prisma.service';

describe('FeedbackService Unit Tests', () => {
  let feedbackService: FeedbackService;
  let mockPrismaService: any;
  let mockMailService: any;

  beforeEach(async () => {
    mockPrismaService = {
      feedback: {
        create: jest.fn(),
        update: jest.fn(),
        findMany: jest.fn(),
      },
    };

    mockMailService = {
      sendFeedbackEmail: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeedbackService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: MailService, useValue: mockMailService },
      ],
    }).compile();

    feedbackService = module.get<FeedbackService>(FeedbackService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createFeedback', () => {
    it('should create feedback record and send email for guest user', async () => {
      const mockCreatedFeedback = {
        id: 'fb-uuid-1',
        userId: null,
        userEmail: 'guest@example.com',
        userName: 'Guest Visitor',
        category: 'bug',
        rating: 4,
        subject: 'Search bar glitch',
        message: 'The search bar clears when typing fast.',
        deviceInfo: '{"browser":"Chrome 124"}',
        status: 'PENDING',
        emailSent: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.feedback.create.mockResolvedValue(mockCreatedFeedback);
      mockPrismaService.feedback.update.mockResolvedValue({
        ...mockCreatedFeedback,
        emailSent: true,
      });

      const dto = {
        category: 'bug',
        subject: 'Search bar glitch',
        message: 'The search bar clears when typing fast.',
        email: 'Guest@Example.Com',
        name: 'Guest Visitor',
        rating: 4,
        deviceInfo: '{"browser":"Chrome 124"}',
      };

      const result = await feedbackService.createFeedback(dto);

      expect(mockPrismaService.feedback.create).toHaveBeenCalledWith({
        data: {
          userId: null,
          userEmail: 'guest@example.com',
          userName: 'Guest Visitor',
          category: 'bug',
          rating: 4,
          subject: 'Search bar glitch',
          message: 'The search bar clears when typing fast.',
          deviceInfo: '{"browser":"Chrome 124"}',
          status: 'PENDING',
          emailSent: false,
        },
      });

      expect(mockMailService.sendFeedbackEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'fb-uuid-1',
          userEmail: 'guest@example.com',
          category: 'bug',
        })
      );

      expect(mockPrismaService.feedback.update).toHaveBeenCalledWith({
        where: { id: 'fb-uuid-1' },
        data: { emailSent: true },
      });

      expect(result).toEqual({
        success: true,
        id: 'fb-uuid-1',
        emailSent: true,
        message: expect.stringContaining('successfully received'),
      });
    });

    it('should associate authenticated user and handle email fallback gracefully if mail returns false', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'member@audioscape.com',
        displayName: 'Registered Member',
      };

      const mockCreatedFeedback = {
        id: 'fb-uuid-2',
        userId: 'user-123',
        userEmail: 'member@audioscape.com',
        userName: 'Registered Member',
        category: 'feature',
        rating: 5,
        subject: 'Add equalizer preset',
        message: 'Would love bass boost and treble sliders.',
        deviceInfo: null,
        status: 'PENDING',
        emailSent: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.feedback.create.mockResolvedValue(mockCreatedFeedback);
      // Simulate unconfigured SMTP fallback
      mockMailService.sendFeedbackEmail.mockResolvedValue(false);

      const dto = {
        category: 'feature',
        subject: 'Add equalizer preset',
        message: 'Would love bass boost and treble sliders.',
        email: 'member@audioscape.com',
        rating: 5,
      };

      const result = await feedbackService.createFeedback(dto, mockUser);

      expect(mockPrismaService.feedback.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-123',
          userName: 'Registered Member',
          category: 'feature',
        }),
      });

      // Update should NOT be called when email sending is false/unconfigured
      expect(mockPrismaService.feedback.update).not.toHaveBeenCalled();

      expect(result).toEqual({
        success: true,
        id: 'fb-uuid-2',
        emailSent: false,
        message: expect.stringContaining('successfully received'),
      });
    });
  });
});
