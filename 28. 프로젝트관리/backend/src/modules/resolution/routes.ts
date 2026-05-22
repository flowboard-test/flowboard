import { FastifyPluginAsync } from 'fastify';
import { authenticate } from '../../shared/middleware/authenticate';
import { resolutionService } from './service';
import { z } from 'zod';

const createResolutionSchema = z.object({
  type: z.enum(['approved', 'rejected', 'completed', 'hold']),
  comment: z.string().max(5000).nullable().optional(),
});

const resolutionRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', authenticate);

  app.post('/cards/:id/resolutions', async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = createResolutionSchema.parse(request.body);
    const resolution = await resolutionService.create(
      id, input.type, input.comment || null, request.userId!
    );
    return reply.status(201).send(resolution);
  });

  app.get('/cards/:id/resolutions', async (request, reply) => {
    const { id } = request.params as { id: string };
    const history = await resolutionService.getHistory(id);
    return reply.send(history);
  });
};

export default resolutionRoutes;
