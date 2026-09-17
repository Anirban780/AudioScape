import { createParamDecorator, ExecutionContext } from '@nestjs/common';

/**
 * ============================================================================
 * CUSTOM PARAMETER DECORATOR: @GetUser()
 * ============================================================================
 * @module AuthModule
 * 
 * PURPOSE:
 * Extracts the authenticated user object (or a specific property of it) directly
 * from the HTTP Request pipeline into NestJS controller handler parameters.
 *
 * WHY THIS IS NEEDED FOR PRODUCTION:
 * - Cleaner Controller Code: Replaces cluttery `@Req() req` references and manual
 *   `req.user` casting with clean, type-safe param injection.
 * - Decoupling: Abstracts the underlying HTTP framework context away from handler signature.
 *
 * HOW IT WORKS:
 * 1. `JwtAuthGuard` executes prior to the controller handler and attaches the validated
 *    user payload to `request.user`.
 * 2. `@GetUser('id')` extracts `request.user.id`, while `@GetUser()` returns the entire object.
 *
 * @example
 * // Extract full user object
 * @Get('me')
 * getProfile(@GetUser() user: AuthenticatedUser) { ... }
 *
 * // Extract specific property
 * @Get('playlists')
 * getPlaylists(@GetUser('id') userId: string) { ... }
 * ============================================================================
 */
export const GetUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    // Switch ExecutionContext to HTTP context to access request object
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;

    if (!user) return null;

    // Return specific nested field if string param provided, else return full user object
    return data ? user[data] : user;
  },
);
