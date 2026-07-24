import { FastifyPluginAsync } from 'fastify';
import { authenticate } from '../../shared/middleware/authenticate';
import { getDb } from '../../shared/database/connection';
import { v4 as uuid } from 'uuid';

const recurringRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', authenticate);

  // 프로젝트 반복 규칙 목록
  app.get('/projects/:id/recurring', async (request, reply) => {
    const { id } = request.params as { id: string };
    const db = getDb();
    const list = await db('recurring_cards')
      .where('project_id', id)
      .orderBy('created_at', 'desc');
    return reply.send(list);
  });

  // 반복 규칙 생성
  app.post('/projects/:id/recurring', async (request, reply) => {
    const { id } = request.params as { id: string };
    const b = request.body as any;
    const db = getDb();
    const recurId = uuid();
    await db('recurring_cards').insert({
      id: recurId, project_id: id, column_id: b.column_id,
      created_by: request.userId!,
      title: b.title, description: b.description || null,
      priority: b.priority || 'normal',
      assignee_id: b.assignee_id || null,
      tags: JSON.stringify(b.tags || []),
      recur_type: b.recur_type, recur_interval: b.recur_interval || 1,
      recur_days: b.recur_days || null,
      recur_time: b.recur_time || null,
      next_run: b.next_run,
      end_date: b.end_date || null,
      is_active: true,
    });
    return reply.status(201).send({ id: recurId });
  });

  // 반복 규칙 삭제
  app.delete('/recurring/:recurId', async (request, reply) => {
    const { recurId } = request.params as { recurId: string };
    const db = getDb();
    await db('recurring_cards').where('id', recurId).del();
    return reply.status(204).send();
  });

  // 반복 규칙 활성/비활성
  app.put('/recurring/:recurId', async (request, reply) => {
    const { recurId } = request.params as { recurId: string };
    const { is_active } = request.body as { is_active: boolean };
    const db = getDb();
    await db('recurring_cards').where('id', recurId)
      .update({ is_active });
    return reply.send({ message: '수정되었습니다' });
  });

  // 반복 규칙 단건 조회 (알림 클릭 시 이전 내용 로드)
  app.get('/recurring/:recurId', async (request, reply) => {
    const { recurId } = request.params as { recurId: string };
    const db = getDb();
    const recur = await db('recurring_cards').where('id', recurId).first();
    if (!recur) return reply.status(404).send({ message: '찾을 수 없습니다' });
    return reply.send(recur);
  });
};

export default recurringRoutes;
