import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

/**
 * ============================================================================
 * PASSPORT STRATEGY: JWT AUTHENTICATION
 * ============================================================================
 * @module AuthModule
 * 
 * PURPOSE:
 * Intercepts incoming HTTP requests, extracts the JWT from the `Authorization: Bearer <token>`
 * header, verifies its cryptographic signature using `JWT_SECRET`, and validates the payload.
 *
 * WHY THIS IS NEEDED FOR PRODUCTION:
 * - Stateless Authentication: Eliminates server-side session memory storage, allowing horizontal scaling across backend instances.
 * - Standardized Bearer Authorization: Follows standard OAuth 2.0 / RFC 6750 Bearer token authorization pattern.
 *
 * HOW IT WORKS:
 * 1. Passport automatically extracts Bearer token from headers.
 * 2. Passport verifies token expiration (`exp`) and signature against `JWT_SECRET`.
 * 3. Passport calls `validate(payload)` upon signature verification success.
 * 4. The returned payload is attached to `request.user` for downstream guards and controllers.
 * ============================================================================
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      // Extract Bearer token from request HTTP header: "Authorization: Bearer <JWT>"
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // Reject expired tokens automatically
      ignoreExpiration: false,
      // Cryptographic key used to verify application access token integrity
      secretOrKey: process.env.JWT_SECRET || 'audioscape-secret-key-change-in-prod',
    });
  }

  /**
   * Validates the decoded JWT payload contents.
   *
   * @param payload - Decoded JWT payload containing `{ sub, authId, email, iat, exp }`
   * @returns Authorized user object attached to `request.user`
   */
  async validate(payload: any) {
    if (!payload || !payload.sub) {
      throw new UnauthorizedException('Invalid or missing subject claim in JWT token payload');
    }

    // Return normalized user identity for request lifecycle
    return {
      id: payload.sub,       // Internal PostgreSQL UUID (User.id)
      email: payload.email,   // Registered User email
      authId: payload.authId, // External Google ID / Auth ID
    };
  }
}
