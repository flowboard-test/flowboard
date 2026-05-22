import { FastifyPluginAsync } from 'fastify';
import { authenticate } from '../../shared/middleware/authenticate';
import { requireProjectRole } from '../../shared/middleware/authorize';
import { boardService } from './service';
import { z } from 'zod';

const createColumnSchema = z.object({
  name: z.string().min(1).max(100),
  wip_limit: z.number().int().positive().optional(),
});

const updateColumnSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  wip_limit: z.number().int().positive().nullable().optional(),
});

const reorderSchema = z.object({
  board_id: z.string().uuid(),
  column_ids: z.array(z.string().uuid()),
});

const boardRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', authenticate);

  app.get('/projects/:id/board', {
    preHandler: [requireProjectRole('member', 'admin', 'owner')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const board = await boardService.getBoard(id);
    return reply.send(board);
  });

  app.post('/projects/:id/columns', {
    preHandler: [requireProjectRole('admin', 'owner')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = createColumnSchema.parse(request.body);
    const board = await boardService.getBoardByProjectId(id);
    if (!board) {
      return reply.status(404).send({ message: '보드를 찾을 수 없습니다' });
    }
    const column = await boardService.createColumn(
      board.id, input.name, input.wip_limit
    );
    return reply.status(201).send(column);
  });

  app.put('/columns/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = updateColumnSchema.parse(request.body);
    const column = await boardService.updateColumn(id, input);
    return reply.send(column);
  });

  app.put('/columns/reorder', async (request, reply) => {
    const input = reorderSchema.parse(request.body);
    await boardService.reorderColumns(input.board_id, input.column_ids);
    return reply.send({ message: '컬럼 순서가 변경되었습니다' });
  });

  app.delete('/columns/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    await boardService.deleteColumn(id);
    return reply.status(204).send();
  });
};

export default boardRoutes;
