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
    bodyLimit: 10 * 1024 * 1024, // 10MB for file uploads
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

  // 관리자: 사용자 비밀번호 초기화
  app.put('/api/admin/users/:id/password', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { password } = request.body as { password: string };
    if (!password || password.length < 8) {
      return reply.status(400).send({ message: '비밀번호는 8자 이상이어야 합니다' });
    }
    const { getDb } = require('./shared/database/connection');
    const bcrypt = require('bcrypt');
    const db = getDb();
    const hash = await bcrypt.hash(password, 12);
    await db('users').where('id', id).update({ password_hash: hash });
    return reply.send({ message: '비밀번호가 변경되었습니다' });
  });

  // 관리자: 사용자 부서 변경
  app.put('/api/admin/users/:id/department', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { department } = request.body as { department: string };
    const { getDb } = require('./shared/database/connection');
    const { v4: uid } = require('uuid');
    const db = getDb();

    const profile = await db('user_profiles').where('user_id', id).first();
    if (profile) {
      await db('user_profiles').where('user_id', id).update({ department });
    } else {
      await db('user_profiles').insert({ id: uid(), user_id: id, department });
    }
    return reply.send({ message: '부서가 변경되었습니다' });
  });

  // 직위 관리
  app.get('/api/admin/positions', async (_req, reply) => {
    const { getDb } = require('./shared/database/connection');
    const db = getDb();
    const list = await db('positions').orderBy('level', 'asc');
    return reply.send(list);
  });
  app.post('/api/admin/positions', async (request, reply) => {
    const { name, level } = request.body as { name: string; level?: number };
    const { getDb } = require('./shared/database/connection');
    const { v4: uid } = require('uuid');
    const db = getDb();
    await db('positions').insert({ id: uid(), name, level: level || 0 });
    return reply.status(201).send({ message: '직위가 추가되었습니다' });
  });
  app.delete('/api/admin/positions/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { getDb } = require('./shared/database/connection');
    const db = getDb();
    await db('positions').where('id', id).del();
    return reply.status(204).send();
  });

  // 직책 관리
  app.get('/api/admin/ranks', async (_req, reply) => {
    const { getDb } = require('./shared/database/connection');
    const db = getDb();
    const list = await db('ranks').orderBy('level', 'asc');
    return reply.send(list);
  });
  app.post('/api/admin/ranks', async (request, reply) => {
    const { name, level } = request.body as { name: string; level?: number };
    const { getDb } = require('./shared/database/connection');
    const { v4: uid } = require('uuid');
    const db = getDb();
    await db('ranks').insert({ id: uid(), name, level: level || 0 });
    return reply.status(201).send({ message: '직책이 추가되었습니다' });
  });
  app.delete('/api/admin/ranks/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { getDb } = require('./shared/database/connection');
    const db = getDb();
    await db('ranks').where('id', id).del();
    return reply.status(204).send();
  });

  // 권한 그룹 관리
  app.get('/api/admin/permissions', async (_req, reply) => {
    const { getDb } = require('./shared/database/connection');
    const db = getDb();
    const list = await db('permission_groups').orderBy('created_at');
    return reply.send(list);
  });
  app.post('/api/admin/permissions', async (request, reply) => {
    const { name, description, permissions } = request.body as any;
    const { getDb } = require('./shared/database/connection');
    const { v4: uid } = require('uuid');
    const db = getDb();
    await db('permission_groups').insert({
      id: uid(), name, description: description || null,
      permissions: JSON.stringify(permissions || []),
    });
    return reply.status(201).send({ message: '권한 그룹이 추가되었습니다' });
  });
  app.delete('/api/admin/permissions/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { getDb } = require('./shared/database/connection');
    const db = getDb();
    await db('permission_groups').where('id', id).del();
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

  // 관리자: 프로젝트별 업무 상세 (완료/기한초과)
  app.get('/api/admin/projects/:id/tasks', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { type } = request.query as { type: string };
    const { getDb } = require('./shared/database/connection');
    const db = getDb();
    const now = new Date().toISOString().split('T')[0];

    const board = await db('boards').where('project_id', id).first();
    if (!board) return reply.send([]);
    const cols = await db('columns').where('board_id', board.id);
    const colIds = cols.map((c: any) => c.id);
    if (colIds.length === 0) return reply.send([]);

    let query = db('cards').whereIn('column_id', colIds).whereNull('parent_id')
      .leftJoin('users', 'cards.assignee_id', 'users.id')
      .select('cards.*', 'users.name as assignee_name');

    if (type === 'done') {
      query = query.where('cards.status', 'done');
    } else if (type === 'overdue') {
      query = query.whereNot('cards.status', 'done').where('cards.due_date', '<', now);
    }

    const tasks = await query.limit(50);
    return reply.send(tasks);
  });

  // 관리자: 전체 프로젝트 상세 현황
  app.get('/api/admin/projects-overview', async (request, reply) => {
    const { getDb } = require('./shared/database/connection');
    const db = getDb();
    const now = new Date().toISOString().split('T')[0];

    const projects = await db('projects')
      .where('is_archived', false)
      .join('users', 'projects.owner_id', 'users.id')
      .select('projects.*', 'users.name as owner_name');

    const result = [];
    for (const project of projects) {
      const board = await db('boards').where('project_id', project.id).first();
      if (!board) { result.push({ ...project, total: 0, done: 0, overdue: 0, progress: 0 }); continue; }
      const cols = await db('columns').where('board_id', board.id);
      const colIds = cols.map((c: any) => c.id);
      if (colIds.length === 0) { result.push({ ...project, total: 0, done: 0, overdue: 0, progress: 0 }); continue; }

      const total = await db('cards').whereIn('column_id', colIds).whereNull('parent_id').count('id as c').first();
      const done = await db('cards').whereIn('column_id', colIds).whereNull('parent_id').where('status', 'done').count('id as c').first();
      const overdue = await db('cards').whereIn('column_id', colIds).whereNull('parent_id')
        .whereNot('status', 'done').where('due_date', '<', now).count('id as c').first();

      const t = Number(total?.c || 0);
      const d = Number(done?.c || 0);
      result.push({
        ...project,
        total: t, done: d,
        overdue: Number(overdue?.c || 0),
        progress: t > 0 ? Math.round((d / t) * 100) : 0,
      });
    }
    return reply.send(result);
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

  // Custom Fields API
  app.get('/api/projects/:id/custom-fields', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { getDb } = require('./shared/database/connection');
    const db = getDb();
    const fields = await db('custom_field_definitions').where('project_id', id);
    return reply.send(fields);
  });

  app.post('/api/projects/:id/custom-fields', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { name, field_type, options } = request.body as any;
    const { getDb } = require('./shared/database/connection');
    const { v4: uid } = require('uuid');
    const db = getDb();
    await db('custom_field_definitions').insert({
      id: uid(), project_id: id, name, field_type,
      options: options ? JSON.stringify(options) : null,
    });
    return reply.status(201).send({ message: '필드가 추가되었습니다' });
  });

  app.get('/api/cards/:cardId/custom-fields', async (request, reply) => {
    const { cardId } = request.params as { cardId: string };
    const { getDb } = require('./shared/database/connection');
    const db = getDb();
    const values = await db('custom_field_values')
      .where('card_id', cardId)
      .join('custom_field_definitions', 'custom_field_values.field_id', 'custom_field_definitions.id')
      .select('custom_field_values.*', 'custom_field_definitions.name', 'custom_field_definitions.field_type');
    return reply.send(values);
  });

  app.put('/api/cards/:cardId/custom-fields/:fieldId', async (request, reply) => {
    const { cardId, fieldId } = request.params as any;
    const { value } = request.body as { value: string };
    const { getDb } = require('./shared/database/connection');
    const { v4: uid } = require('uuid');
    const db = getDb();
    const existing = await db('custom_field_values')
      .where({ card_id: cardId, field_id: fieldId }).first();
    if (existing) {
      await db('custom_field_values')
        .where({ card_id: cardId, field_id: fieldId })
        .update({ value });
    } else {
      await db('custom_field_values').insert({
        id: uid(), card_id: cardId, field_id: fieldId, value,
      });
    }
    return reply.send({ message: '저장되었습니다' });
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
  await app.register(import('./modules/messenger/routes'), {
    prefix: '/api',
  });
  await app.register(import('./modules/statistics/routes'), {
    prefix: '/api',
  });

  return app;
}
