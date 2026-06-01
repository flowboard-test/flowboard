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

  // 관리자: 사용자 삭제
  app.delete('/api/admin/users/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { getDb } = require('./shared/database/connection');
    const db = getDb();
    await db('users').where('id', id).del();
    return reply.status(204).send();
  });

  // 관리자 통계 API
  app.get('/api/admin/stats', async (request, reply) => {
    const { getDb } = require('./shared/database/connection');
    const db = getDb();
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();

    const totalUsers = await db('users').count('id as c').first();
    const activeUsers = await db('users').where('is_dormant', false).count('id as c').first();
    const dormantUsers = await db('users').where('is_dormant', true).count('id as c').first();
    const totalProjects = await db('projects').count('id as c').first();
    const totalCards = await db('cards').whereNull('parent_id').count('id as c').first();
    const completedCards = await db('cards').where('status', 'done').whereNull('parent_id').count('id as c').first();
    const todayLogins = await db('users').where('last_login_at', '>=', today).count('id as c').first();
    const weeklyCards = await db('cards').where('created_at', '>=', weekAgo).whereNull('parent_id').count('id as c').first();

    return reply.send({
      totalUsers: Number(totalUsers?.c || 0),
      activeUsers: Number(activeUsers?.c || 0),
      dormantUsers: Number(dormantUsers?.c || 0),
      totalProjects: Number(totalProjects?.c || 0),
      totalCards: Number(totalCards?.c || 0),
      completedCards: Number(completedCards?.c || 0),
      todayLogins: Number(todayLogins?.c || 0),
      weeklyCards: Number(weeklyCards?.c || 0),
    });
  });

  // 통합 검색 API
  app.get('/api/search', async (request, reply) => {
    const { q } = request.query as { q?: string };
    if (!q || q.length < 2) return reply.send({ projects: [], cards: [] });

    const { getDb } = require('./shared/database/connection');
    const db = getDb();

    const projects = await db('projects')
      .where('name', 'like', `%${q}%`)
      .limit(5);

    const cards = await db('cards')
      .where('title', 'like', `%${q}%`)
      .whereNull('parent_id')
      .limit(10);

    return reply.send({ projects, cards });
  });

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
