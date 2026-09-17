import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * ============================================================================
 * GLOBAL EXCEPTION FILTER: CENTRALIZED ERROR RESPONSE FORMATTER
 * ============================================================================
 * @module CommonModule
 * 
 * PURPOSE:
 * Intercepts all unhandled HTTP exceptions, validation errors, and unexpected internal server errors
 * across the entire NestJS application, formatting them into a standard, clean JSON error payload.
 *
 * WHY THIS IS NEEDED FOR PRODUCTION:
 * - Uniform API Error Structure: Ensures frontend client applications receive predictable error responses.
 * - Security & Information Hiding: Prevents database stack traces or internal implementation details
 *   from leaking to external clients in production environments.
 * - Operational Telemetry: Logs uncaught internal server errors with request path details.
 * ============================================================================
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Determine HTTP Status Code (default 500 Internal Server Error)
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Extract error response message or object
    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    let message: string | string[] = 'Internal server error';

    if (typeof exceptionResponse === 'string') {
      message = exceptionResponse;
    } else if (
      typeof exceptionResponse === 'object' &&
      exceptionResponse !== null
    ) {
      const respObj = exceptionResponse as Record<string, any>;
      message = respObj.message || message;
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    // Log internal 500 errors for backend telemetry
    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `[500] ${request.method} ${request.url} - ${
          exception instanceof Error ? exception.stack : JSON.stringify(exception)
        }`,
      );
    } else {
      this.logger.warn(`[${status}] ${request.method} ${request.url} - ${JSON.stringify(message)}`);
    }

    // Standardized JSON response payload
    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      error: message,
    });
  }
}
