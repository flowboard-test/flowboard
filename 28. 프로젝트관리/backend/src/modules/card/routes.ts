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
    return reply.send(card);
  });

  app.put('/cards/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = updateCardSchema.parse(request.body);
    const card = await cardService.update(id, input);
    return reply.send(card);
  });

  app.delete('/cards/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    await cardService.delete(id);
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
    // 간단한 메타데이터 저장 (실제 S3 업로드는 추후 구현)
    const body = request.body as { file_name: string; file_size: number; mime_type: string };
    const db = require('../../shared/database/connection').getDb();
    const { v4: uid } = require('uuid');
    await db('attachments').insert({
      id: uid(), card_id: id, file_name: body.file_name || 'file',
      file_size: body.file_size || 0, mime_type: body.mime_type || 'application/octet-stream',
      s3_key: `uploads/${id}/${uid()}`, uploaded_by: request.userId!,
    });
    return reply.status(201).send({ message: '파일이 첨부되었습니다' });
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
