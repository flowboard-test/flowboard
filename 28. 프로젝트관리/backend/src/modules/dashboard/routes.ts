import { FastifyPluginAsync } from 'fastify';
import { authenticate } from '../../shared/middleware/authenticate';
import { requireProjectRole } from '../../shared/middleware/authorize';
import { dashboardService } from './service';

const dashboardRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', authenticate);

  app.get('/projects/:id/dashboard', {
    preHandler: [requireProjectRole('member', 'admin', 'owner')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const query = request.query as { period?: string };
    const dashboard = await dashboardService.getProjectDashboard(
      id, query.period
    );
    return reply.send(dashboard);
  });

  app.get('/my-tasks', async (request, reply) => {
    const query = request.query as { filter?: string };
    const tasks = await dashboardService.getMyTasks(
      request.userId!, query.filter
    );
    return reply.send(tasks);
  });

  // OKR 목표 관리
  app.get('/projects/:id/objectives', {
    preHandler: [requireProjectRole('member', 'admin', 'owner')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { getDb } = require('../../shared/database/connection');
    const db = getDb();
    const objectives = await db('objectives').where('project_id', id);
    const result = [];
    for (const obj of objectives) {
      const krs = await db('key_results').where('objective_id', obj.id);
      result.push({ ...obj, key_results: krs });
    }
    return reply.send(result);
  });

  app.post('/projects/:id/objectives', {
    preHandler: [requireProjectRole('admin', 'owner')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { title } = request.body as { title: string };
    const { getDb } = require('../../shared/database/connection');
    const { v4: uid } = require('uuid');
    const db = getDb();
    await db('objectives').insert({
      id: uid(), project_id: id, title, owner_id: request.userId!,
    });
    return reply.status(201).send({ message: '목표가 추가되었습니다' });
  });

  // 주간 보고서
  app.get('/projects/:id/weekly-report', {
    preHandler: [requireProjectRole('member', 'admin', 'owner')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { getDb } = require('../../shared/database/connection');
    const db = getDb();

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    const nextWeekEnd = new Date(weekEnd);
    nextWeekEnd.setDate(weekEnd.getDate() + 7);

    const board = await db('boards').where('project_id', id).first();
    const columns = board ? await db('columns').where('board_id', board.id) : [];
    const columnIds = columns.map((c: any) => c.id);

    const completed = columnIds.length > 0
      ? await db('cards').whereIn('column_id', columnIds)
          .where('status', 'done').whereNull('parent_id').limit(20)
      : [];

    const inProgress = columnIds.length > 0
      ? await db('cards').whereIn('column_id', columnIds)
          .whereNot('status', 'done').whereNull('parent_id')
      : [];

    const overdue = inProgress.filter((c: any) =>
      c.due_date && new Date(c.due_date) < now
    );

    const upcoming = inProgress.filter((c: any) =>
      c.due_date && new Date(c.due_date) <= nextWeekEnd
    ).slice(0, 10);

    return reply.send({
      period_start: weekStart.toISOString().split('T')[0],
      period_end: weekEnd.toISOString().split('T')[0],
      completed_count: completed.length,
      in_progress_count: inProgress.length,
      overdue_count: overdue.length,
      completed_tasks: completed.slice(0, 10),
      upcoming_tasks: upcoming,
    });
  });
};

export default dashboardRoutes;
