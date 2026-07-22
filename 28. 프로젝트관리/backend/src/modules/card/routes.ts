import { FastifyPluginAsync } from 'fastify';
import { authenticate } from '../../shared/middleware/authenticate';
import { cardService } from './service';
import { cardCompleteService } from './complete.service';
import { cardRejectService } from './reject.service';
import { createCardSchema, updateCardSchema, moveCardSchema } from './schemas';

const cardRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', authenticate);

  app.post('/columns/:id/cards', async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = createCardSchema.parse(request.body);
    const card = await cardService.create(id, input, request.userId!);
    return reply.status(201).send(card);
  });

  app.get('/cards/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const card = await cardService.getById(id);
    // 읽음 기록
    const db = require('../../shared/database/connection').getDb();
    const { v4: uid } = require('uuid');
    const existing = await db('card_views')
      .where({ card_id: id, user_id: request.userId! }).first();
    if (!existing) {
      await db('card_views').insert({
        id: uid(), card_id: id, user_id: request.userId!,
      }).catch(() => {});
    }
    // 읽음 수 첨부
    const viewCount = await db('card_views').where('card_id', id).count('id as count').first();
    return reply.send({ ...card, view_count: Number(viewCount?.count || 0) });
  });

  app.get('/cards/:id/views', async (request, reply) => {
    const { id } = request.params as { id: string };
    const db = require('../../shared/database/connection').getDb();
    const views = await db('card_views')
      .where('card_id', id)
      .join('users', 'card_views.user_id', 'users.id')
      .select('users.name', 'card_views.viewed_at');
    return reply.send(views);
  });

  app.get('/cards/:id/timeline', async (request, reply) => {
    const { id } = request.params as { id: string };
    const db = require('../../shared/database/connection').getDb();
    const timeline = await db('card_timeline')
      .where('card_id', id)
      .leftJoin('users', 'card_timeline.actor_id', 'users.id')
      .select('card_timeline.*', 'users.name as actor_name')
      .orderBy('card_timeline.created_at', 'desc');
    return reply.send(timeline);
  });

  // 이슈 링크
  app.get('/cards/:id/links', async (request, reply) => {
    const { id } = request.params as { id: string };
    const db = require('../../shared/database/connection').getDb();
    const links = await db('card_links')
      .where('source_card_id', id)
      .join('cards', 'card_links.target_card_id', 'cards.id')
      .select('card_links.*', 'cards.title as target_title', 'cards.status as target_status');
    return reply.send(links);
  });

  app.post('/cards/:id/links', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { target_card_id, link_type } = request.body as any;
    const db = require('../../shared/database/connection').getDb();
    const { v4: uid } = require('uuid');
    await db('card_links').insert({
      id: uid(), source_card_id: id, target_card_id, link_type,
    });
    return reply.status(201).send({ message: '연결되었습니다' });
  });

  app.delete('/cards/:id/links/:linkId', async (request, reply) => {
    const { linkId } = request.params as any;
    const db = require('../../shared/database/connection').getDb();
    await db('card_links').where('id', linkId).del();
    return reply.status(204).send();
  });

  // 작업 로그
  app.get('/cards/:id/worklogs', async (request, reply) => {
    const { id } = request.params as { id: string };
    const db = require('../../shared/database/connection').getDb();
    const logs = await db('work_logs')
      .where('card_id', id)
      .join('users', 'work_logs.user_id', 'users.id')
      .select('work_logs.*', 'users.name as user_name')
      .orderBy('work_logs.work_date', 'desc');
    return reply.send(logs);
  });

  app.post('/cards/:id/worklogs', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { hours, comment, work_date } = request.body as any;
    const db = require('../../shared/database/connection').getDb();
    const { v4: uid } = require('uuid');
    await db('work_logs').insert({
      id: uid(), card_id: id, user_id: request.userId!,
      hours, comment: comment || null,
      work_date: work_date || new Date().toISOString().split('T')[0],
    });
    return reply.status(201).send({ message: '기록되었습니다' });
  });

  app.put('/cards/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = updateCardSchema.parse(request.body);
    const card = await cardService.update(id, input);
    return reply.send(card);
  });

  app.delete('/cards/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    await cardService.delete(id, request.userId!);
    return reply.status(204).send();
  });

  app.put('/cards/:id/move', async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = moveCardSchema.parse(request.body);
    const card = await cardService.move(id, input, request.userId!);
    return reply.send(card);
  });

  app.post('/cards/:id/subtasks', async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = createCardSchema.parse(request.body);
    const subtask = await cardService.createSubtask(id, input, request.userId!);
    return reply.status(201).send(subtask);
  });

  // 첨부파일
  app.get('/cards/:id/attachments', async (request, reply) => {
    const { id } = request.params as { id: string };
    const db = require('../../shared/database/connection').getDb();
    const files = await db('attachments')
      .where('card_id', id)
      .orderBy('created_at', 'desc');
    return reply.send(files);
  });

  app.post('/cards/:id/attachments', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { file_name: string; file_size: number; mime_type: string; file_data?: string };
    const db = require('../../shared/database/connection').getDb();
    const { v4: uid } = require('uuid');
    const attachId = uid();
    await db('attachments').insert({
      id: attachId, card_id: id, file_name: body.file_name || 'file',
      file_size: body.file_size || 0, mime_type: body.mime_type || 'application/octet-stream',
      s3_key: body.file_data || `uploads/${id}/${attachId}`,
      uploaded_by: request.userId!,
    });
    return reply.status(201).send({ id: attachId, message: '파일이 첨부되었습니다' });
  });

  // 첨부파일 다운로드
  app.get('/cards/:id/attachments/:attachId/download', async (request, reply) => {
    const { attachId } = request.params as { id: string; attachId: string };
    const db = require('../../shared/database/connection').getDb();
    const file = await db('attachments').where('id', attachId).first();
    if (!file) return reply.status(404).send({ message: '파일을 찾을 수 없습니다' });
    return reply.send({ file_name: file.file_name, file_data: file.s3_key, mime_type: file.mime_type });
  });

  // 댓글
  app.get('/cards/:id/comments', async (request, reply) => {
    const { id } = request.params as { id: string };
    const db = require('../../shared/database/connection').getDb();
    const comments = await db('comments')
      .where('card_id', id)
      .join('users', 'comments.author_id', 'users.id')
      .select('comments.*', 'users.name as author_name')
      .orderBy('comments.created_at', 'asc');
    return reply.send(comments);
  });

  app.post('/cards/:id/comments', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { content } = request.body as { content: string };
    if (!content?.trim()) {
      return reply.status(400).send({ message: '댓글 내용을 입력하세요' });
    }
    const db = require('../../shared/database/connection').getDb();
    const { v4: uid } = require('uuid');
    await db('comments').insert({
      id: uid(), card_id: id, author_id: request.userId!, content,
    });

    // @ 멘션 알림 처리
    const mentions = content.match(/@(\S+)/g);
    if (mentions && mentions.length > 0) {
      const { notificationService } = require('../notification/service');
      const author = await db('users').where('id', request.userId!).first();
      const card = await db('cards').where('id', id).first();
      for (const mention of mentions) {
        const name = mention.replace('@', '');
        const user = await db('users').where('name', name).first();
        if (user && user.id !== request.userId!) {
          await notificationService.create({
            user_id: user.id,
            type: 'mention',
            title: `${author?.name}님이 댓글에서 회원님을 멘션했습니다`,
            body: content.substring(0, 100),
            link: `/cards/${id}`,
          });
        }
      }
    }

    return reply.status(201).send({ message: '댓글이 추가되었습니다' });
  });

  app.get('/cards/:id/subtasks', async (request, reply) => {
    const { id } = request.params as { id: string };
    const subtasks = await cardService.getSubtasks(id);
    return reply.send(subtasks);
  });

  app.post('/cards/:id/complete', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { comment?: string } | undefined;
    const result = await cardCompleteService.complete(
      id, request.userId!, body?.comment
    );
    return reply.send(result);
  });

  app.post('/cards/:id/reject', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { reason: string };
    if (!body?.reason) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'VALIDATION_ERROR',
        message: '수정 요청 사유를 입력하세요',
      });
    }
    const result = await cardRejectService.reject(
      id, request.userId!, body.reason
    );
    return reply.send(result);
  });
};

export default cardRoutes;
