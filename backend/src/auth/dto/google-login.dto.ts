import { IsOptional, IsString } from 'class-validator';

/**
 * ============================================================================
 * DATA TRANSFER OBJECT (DTO): GOOGLE LOGIN PAYLOAD
 * ============================================================================
 * @module AuthModule
 * 
 * PURPOSE:
 * Defines and validates the schema for incoming HTTP POST requests to
 * `/api/auth/google`. Accepts either raw Google ID Token (from GIS One Tap)
 * or Google Access Token (from GIS OAuth2 Popup flow).
 * ============================================================================
 */
export class GoogleLoginDto {
  /**
   * Raw Google OAuth 2.0 ID Token (JWT format) from GIS One Tap / credential callback.
   */
  @IsOptional()
  @IsString({ message: 'idToken must be a valid string' })
  idToken?: string;

  /**
   * Raw Google OAuth 2.0 Access Token from GIS Popup Flow (initTokenClient).
   */
  @IsOptional()
  @IsString({ message: 'accessToken must be a valid string' })
  accessToken?: string;
}

