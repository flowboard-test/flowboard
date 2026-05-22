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
};

export default dashboardRoutes;
