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
