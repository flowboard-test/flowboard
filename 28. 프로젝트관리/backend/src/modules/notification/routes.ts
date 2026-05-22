import { FastifyPluginAsync } from 'fastify';
import { authenticate } from '../../shared/middleware/authenticate';
import { notificationService } from './service';
import { z } from 'zod';

const settingsSchema = z.object({
  notification_type: z.string(),
  channel_in_app: z.boolean().optional(),
  channel_email: z.boolean().optional(),
  channel_push: z.boolean().optional(),
});

const notificationRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', authenticate);

  app.get('/notifications', async (request, reply) => {
    const query = request.query as { limit?: string; offset?: string };
    const limit = parseInt(query.limit || '50', 10);
    const offset = parseInt(query.offset || '0', 10);
    const notifications = await notificationService.getByUser(
      request.userId!, limit, offset
    );
    return reply.send(notifications);
  });

  app.put('/notifications/:id/read', async (request, reply) => {
    const { id } = request.params as { id: string };
    await notificationService.markAsRead(id, request.userId!);
    return reply.send({ message: '읽음 처리되었습니다' });
  });

  app.put('/notifications/settings', async (request, reply) => {
    const input = settingsSchema.parse(request.body);
    const { notification_type, ...settings } = input;
    await notificationService.updateSettings(
      request.userId!, notification_type, settings
    );
    return reply.send({ message: '설정이 변경되었습니다' });
  });
};

export default notificationRoutes;
