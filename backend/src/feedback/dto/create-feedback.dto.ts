import {
  IsEmail,
  IsEnum,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/**
 * ============================================================================
 * DTO: CREATE USER FEEDBACK (create-feedback.dto.ts)
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Validates incoming payload from client for user feedback, support requests,
 * and bug reports before processing by FeedbackService.
 */
export class CreateFeedbackDto {
  @IsNotEmpty({ message: 'Category is required' })
  @IsString()
  @IsIn(['bug', 'feature', 'audio', 'quota', 'general'], {
    message: 'Category must be one of: bug, feature, audio, quota, general',
  })
  category: string;

  @IsNotEmpty({ message: 'Subject is required' })
  @IsString()
  @MinLength(3, { message: 'Subject must be at least 3 characters' })
  @MaxLength(150, { message: 'Subject cannot exceed 150 characters' })
  subject: string;

  @IsNotEmpty({ message: 'Message is required' })
  @IsString()
  @MinLength(10, { message: 'Message must be at least 10 characters long' })
  @MaxLength(3000, { message: 'Message cannot exceed 3000 characters' })
  message: string;

  @IsNotEmpty({ message: 'Email is required for follow-up communications' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'Name cannot exceed 100 characters' })
  name?: string;

  @IsOptional()
  @IsInt({ message: 'Rating must be an integer between 1 and 5' })
  @Min(1, { message: 'Rating must be at least 1 star' })
  @Max(5, { message: 'Rating cannot exceed 5 stars' })
  rating?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000, { message: 'Device diagnostics string cannot exceed 2000 characters' })
  deviceInfo?: string;
}
