import { FastifyPluginAsync } from 'fastify';
import { authenticate } from '../../shared/middleware/authenticate';
import { getDb } from '../../shared/database/connection';
import { statisticsBatch } from './batch';

const statisticsRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', authenticate);

  // 전체 통계 조회 (기간별)
  app.get('/statistics/global', async (request, reply) => {
    const { from, to } = request.query as { from?: string; to?: string };
    const db = getDb();
    let query = db('daily_stats').where('stat_type', 'global');
    if (from) query = query.where('stat_date', '>=', from);
    if (to) query = query.where('stat_date', '<=', to);
    const stats = await query.orderBy('stat_date', 'desc');
    return reply.send(stats);
  });

  // 프로젝트별 통계
  app.get('/statistics/project/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { from, to } = request.query as { from?: string; to?: string };
    const db = getDb();
    let query = db('daily_stats')
      .where({ stat_type: 'project', ref_id: id });
    if (from) query = query.where('stat_date', '>=', from);
    if (to) query = query.where('stat_date', '<=', to);
    const stats = await query.orderBy('stat_date', 'desc');
    return reply.send(stats);
  });

  // 사용자별 통계
  app.get('/statistics/user/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { from, to } = request.query as { from?: string; to?: string };
    const db = getDb();
    let query = db('daily_stats')
      .where({ stat_type: 'user', ref_id: id });
    if (from) query = query.where('stat_date', '>=', from);
    if (to) query = query.where('stat_date', '<=', to);
    const stats = await query.orderBy('stat_date', 'desc');
    return reply.send(stats);
  });

  // 기한초과 통계 (프로젝트/카드/인원별)
  app.get('/statistics/overdue', async (request, reply) => {
    const { from, to, type } = request.query as any;
    const db = getDb();
    let query = db('daily_stats')
      .where('overdue_count', '>', 0);
    if (type) query = query.where('stat_type', type);
    if (from) query = query.where('stat_date', '>=', from);
    if (to) query = query.where('stat_date', '<=', to);
    const stats = await query.orderBy('stat_date', 'desc');
    return reply.send(stats);
  });

  // 실시간 통계 (단일 섹션 - 오늘 기준 간단 카운트)
  app.get('/statistics/realtime', async (request, reply) => {
    const db = getDb();
    const today = new Date().toISOString().split('T')[0];
    const total = await db('cards').whereNull('parent_id')
      .count('id as c').first();
    const done = await db('cards').whereNull('parent_id')
      .where('status', 'done').count('id as c').first();
    const overdue = await db('cards').whereNull('parent_id')
      .whereNot('status', 'done')
      .where('due_date', '<', today)
      .whereNotNull('due_date')
      .count('id as c').first();
    return reply.send({
      total: Number(total?.c || 0),
      done: Number(done?.c || 0),
      overdue: Number(overdue?.c || 0),
      in_progress: Number(total?.c || 0) - Number(done?.c || 0),
    });
  });

  // 수동 배치 실행 (관리자용)
  app.post('/statistics/run-batch', async (request, reply) => {
    const { date } = request.body as { date?: string };
    await statisticsBatch.runDailyBatch(date);
    return reply.send({ message: '배치 실행 완료' });
  });
};

export default statisticsRoutes;
