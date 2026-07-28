import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * ============================================================================
 * CAN ACTIVATE GUARD: JWT AUTHORIZATION GUARD
 * ============================================================================
 * @module AuthModule
 * 
 * PURPOSE:
 * Serves as a route guard decorator (`@UseGuards(JwtAuthGuard)`) to restrict endpoint access
 * to authenticated clients holding a valid Bearer JWT.
 *
 * WHY THIS IS NEEDED FOR PRODUCTION:
 * - Centralized Protection: Enforces strict route-level access control on private endpoints
 *   (e.g., user profile, playlists CRUD, listen history logging).
 * - Automatic HTTP 401: Rejects unauthorized calls with HTTP 401 Unauthorized before business
 *   logic execution occurs.
 *
 * HOW IT WORKS:
 * Extends Passport's built-in `AuthGuard('jwt')`. When applied to a controller or route handler,
 * NestJS triggers `JwtStrategy.validate()`. If valid, execution continues; otherwise, 401 is thrown.
 *
 * @example
 * @UseGuards(JwtAuthGuard)
 * @Get('me')
 * getProfile() { ... }
 * ============================================================================
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
