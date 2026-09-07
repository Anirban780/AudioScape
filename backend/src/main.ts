import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

/**
 * ============================================================================
 * BOOTSTRAP ENTRYPOINT: AUDIOSCAPE NESTJS BACKEND SERVER
 * ============================================================================
 * 
 * PURPOSE:
 * Initializes NestJS application container, sets up global middleware, CORS,
 * validation pipes, global exception filters, and starts HTTP server on port 5000 (or process.env.PORT).
 *
 * PRODUCTION FEATURES CONFIGURED:
 * 1. Global Dynamic CORS: Supports Vercel production, staging, preview branches, and local dev.
 * 2. Cookie Parser: Parses incoming HttpOnly cookies for persistent refresh tokens (`audioscape_refresh_token`).
 * 3. Global ValidationPipe: Automatically sanitizes, validates, and transforms request payloads using DTO definitions.
 * 4. AllExceptionsFilter: Formats uncaught exceptions into clean, uniform JSON error responses.
 * 5. Graceful Shutdown Hooks: Enables process signal handlers (`SIGTERM`, `SIGINT`) for clean database disconnection.
 * ============================================================================
 */
async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Enable cookie parsing middleware for HttpOnly refresh cookies
  app.use(cookieParser());

  // Enable graceful shutdown hooks for container orchestrators (Render / Kubernetes)
  app.enableShutdownHooks();

  // Configure robust CORS allowed origins
  const envOrigins = [process.env.PROD_FRONTEND_URL, process.env.FRONTEND_URL]
    .filter((url): url is string => Boolean(url))
    .flatMap((url) => url.split(','))
    .map((s) => s.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  const defaultAllowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5000',
    'https://audioscape-staging.vercel.app',
    'https://audioscape.app',
    'https://audio-scape-pi.vercel.app',
    ...envOrigins,
  ];

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin) {
        return callback(null, true);
      }

      const normalizedOrigin = origin.trim().replace(/\/+$/, '');

      // Allow if explicit match or matches any *.vercel.app deployment for audioscape
      const isAllowed =
        defaultAllowedOrigins.includes(normalizedOrigin) ||
        /^https:\/\/audioscape[a-zA-Z0-9-]*\.vercel\.app$/.test(normalizedOrigin) ||
        /^https:\/\/.*audioscape.*\.vercel\.app$/.test(normalizedOrigin);

      if (isAllowed) {
        return callback(null, true);
      }

      logger.warn(`CORS blocked for origin: ${origin}`);
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Cookie'],
  });

  // Attach Global ValidationPipe for DTO payload validation and type transformation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,            // Strips unexpected properties not defined in DTOs
      transform: true,            // Automatically transforms primitive string types to numbers/booleans
      forbidNonWhitelisted: true, // Rejects requests with unexpected extra fields
    }),
  );

  // Attach Global Exception Filter for standardized error handling
  app.useGlobalFilters(new AllExceptionsFilter());

  const port = process.env.PORT || 5000;
  await app.listen(port);
  logger.log(`🚀 NestJS AudioScape Backend operational and listening on port ${port}`);
}

bootstrap();
