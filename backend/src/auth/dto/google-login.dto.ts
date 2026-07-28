import { IsNotEmpty, IsString } from 'class-validator';

/**
 * ============================================================================
 * DATA TRANSFER OBJECT (DTO): GOOGLE LOGIN PAYLOAD
 * ============================================================================
 * @module AuthModule
 * 
 * PURPOSE:
 * Defines and validates the strict schema for incoming HTTP POST requests to
 * `/api/auth/google`.
 *
 * WHY THIS IS NEEDED FOR PRODUCTION:
 * - Security & Sanitation: Prevents malformed, incomplete, or malicious injection
 *   payloads from hitting the authentication pipeline.
 * - Runtime Type Safety: Enforces runtime validation using `class-validator` 
 *   combined with NestJS's global `ValidationPipe`.
 * - Clean API Contract: Serves as explicit documentation for frontend client developers.
 *
 * HOW IT WORKS:
 * Frontend Google Sign-In SDK produces a signed JWT credential (idToken).
 * The client sends `{ "idToken": "<raw_google_jwt>" }` in the POST request body.
 * ============================================================================
 */
export class GoogleLoginDto {
  /**
   * Raw Google OAuth 2.0 ID Token (JSON Web Token format) received from Google Sign-In.
   * Required for server-side cryptographic signature and audience verification.
   *
   * @example "eyJhbGciOiJSUzI1NiIsImtpZCI6..."
   */
  @IsString({ message: 'idToken must be a valid string' })
  @IsNotEmpty({ message: 'idToken is required and cannot be empty' })
  idToken: string;
}
