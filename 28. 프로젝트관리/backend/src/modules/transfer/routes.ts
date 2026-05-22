import { FastifyPluginAsync } from 'fastify';
import { authenticate } from '../../shared/middleware/authenticate';
import { transferService } from './service';
import { workflowEngine } from './workflow-engine';
import { z } from 'zod';

const transferSchema = z.object({
  toUserId: z.string().uuid(),
  resolutionType: z.enum(['approved', 'rejected', 'completed', 'hold']),
  comment: z.string().max(5000).optional(),
  attachments: z.array(z.string()).optional(),
});

const workflowSchema = z.object({
  name: z.string().min(1).max(200),
  trigger_column_id: z.string().uuid(),
  assignee_ids: z.array(z.string().uuid()).min(1),
});

const transferRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', authenticate);

  app.post('/cards/:id/transfers', async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = transferSchema.parse(request.body);
    const transfer = await transferService.create(
      id, input, request.userId!
    );
    return reply.status(201).send(transfer);
  });

  app.get('/cards/:id/transfers', async (request, reply) => {
    const { id } = request.params as { id: string };
    const history = await transferService.getHistory(id);
    return reply.send(history);
  });

  // 워크플로우 체인 API
  app.post('/projects/:id/workflows', async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = workflowSchema.parse(request.body);
    const chainId = await workflowEngine.createWorkflowChain(
      id, input.trigger_column_id, input.name, input.assignee_ids
    );
    return reply.status(201).send({ id: chainId });
  });

  app.get('/projects/:id/workflows', async (request, reply) => {
    const { id } = request.params as { id: string };
    const workflows = await workflowEngine.getWorkflows(id);
    return reply.send(workflows);
  });

  app.put('/workflows/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as {
      name?: string;
      assignee_ids?: string[];
      is_active?: boolean;
    };
    const updated = await workflowEngine.updateWorkflow(id, body);
    return reply.send(updated);
  });

  app.delete('/workflows/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    await workflowEngine.deleteWorkflow(id);
    return reply.status(204).send();
  });
};

export default transferRoutes;
