import { FastifyPluginAsync } from 'fastify';
import { authenticate } from '../../shared/middleware/authenticate';
import { getDb } from '../../shared/database/connection';
import { v4 as uuid } from 'uuid';

const sprintRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', authenticate);

  // 프로젝트 스프린트 목록
  app.get('/projects/:id/sprints', async (request, reply) => {
    const { id } = request.params as { id: string };
    const db = getDb();
    const sprints = await db('sprints')
      .where('project_id', id)
      .orderBy('created_at', 'desc');
    // 각 스프린트의 카드 수
    for (const s of sprints) {
      const count = await db('cards').where('sprint_id', s.id)
        .whereNull('parent_id').count('id as c').first();
      const done = await db('cards').where('sprint_id', s.id)
        .whereNull('parent_id').where('status', 'done')
        .count('id as c').first();
      s.card_count = Number(count?.c || 0);
      s.done_count = Number(done?.c || 0);
    }
    return reply.send(sprints);
  });

  // 스프린트 생성
  app.post('/projects/:id/sprints', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { name, goal, start_date, end_date } = request.body as any;
    const db = getDb();
    const sprintId = uuid();
    await db('sprints').insert({
      id: sprintId, project_id: id, name,
      goal: goal || null, start_date: start_date || null,
      end_date: end_date || null, status: 'planned',
    });
    return reply.status(201).send({ id: sprintId });
  });

  // 스프린트 상태 변경 (시작/완료)
  app.put('/sprints/:sprintId', async (request, reply) => {
    const { sprintId } = request.params as { sprintId: string };
    const { status, name, goal, start_date, end_date } = request.body as any;
    const db = getDb();
    const update: any = {};
    if (status) update.status = status;
    if (name) update.name = name;
    if (goal !== undefined) update.goal = goal;
    if (start_date !== undefined) update.start_date = start_date;
    if (end_date !== undefined) update.end_date = end_date;
    await db('sprints').where('id', sprintId).update(update);
    return reply.send({ message: '수정되었습니다' });
  });

  // 스프린트 삭제
  app.delete('/sprints/:sprintId', async (request, reply) => {
    const { sprintId } = request.params as { sprintId: string };
    const db = getDb();
    await db('cards').where('sprint_id', sprintId).update({ sprint_id: null });
    await db('sprints').where('id', sprintId).del();
    return reply.status(204).send();
  });

  // 카드를 스프린트에 배정
  app.put('/cards/:cardId/sprint', async (request, reply) => {
    const { cardId } = request.params as { cardId: string };
    const { sprint_id } = request.body as { sprint_id: string | null };
    const db = getDb();
    await db('cards').where('id', cardId).update({ sprint_id: sprint_id || null });
    return reply.send({ message: '배정되었습니다' });
  });

  // 스프린트 번다운 (남은 카드 수)
  app.get('/sprints/:sprintId/burndown', async (request, reply) => {
    const { sprintId } = request.params as { sprintId: string };
    const db = getDb();
    const cards = await db('cards').where('sprint_id', sprintId)
      .whereNull('parent_id');
    const total = cards.length;
    const done = cards.filter((c: any) => c.status === 'done').length;
    return reply.send({ total, done, remaining: total - done });
  });
};

export default sprintRoutes;
