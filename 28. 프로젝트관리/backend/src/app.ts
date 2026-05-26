import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import { config } from './shared/config';
import { errorHandler } from './shared/middleware/errorHandler';

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: config.nodeEnv === 'production' ? 'info' : 'debug',
    },
    trustProxy: true,
  });

  // Security headers
  await app.register(helmet, {
    contentSecurityPolicy: false,
  });

  // Rate limiting (분당 100회)
  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  // CORS
  await app.register(cors, {
    origin: config.nodeEnv === 'production'
      ? [/\.vercel\.app$/, /\.onrender\.com$/, /localhost/]
      : true,
    credentials: true,
  });

  // Global error handler
  app.setErrorHandler(errorHandler);

  // Health check
  app.get('/health', async () => ({ status: 'ok' }));

  // Register modules
  await app.register(import('./modules/auth/routes'), {
    prefix: '/api/auth',
  });
  await app.register(import('./modules/project/routes'), {
    prefix: '/api',
  });
  await app.register(import('./modules/board/routes'), {
    prefix: '/api',
  });
  await app.register(import('./modules/card/routes'), {
    prefix: '/api',
  });
  await app.register(import('./modules/transfer/routes'), {
    prefix: '/api',
  });
  await app.register(import('./modules/resolution/routes'), {
    prefix: '/api',
  });
  await app.register(import('./modules/notification/routes'), {
    prefix: '/api',
  });
  await app.register(import('./modules/dashboard/routes'), {
    prefix: '/api',
  });

  return app;
}
