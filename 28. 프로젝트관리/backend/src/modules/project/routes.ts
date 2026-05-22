import { FastifyPluginAsync } from 'fastify';
import { authenticate } from '../../shared/middleware/authenticate';
import { requireProjectRole } from '../../shared/middleware/authorize';
import { projectService } from './service';
import {
  createProjectSchema,
  updateProjectSchema,
  addMemberSchema,
  updateMemberRoleSchema,
} from './schemas';

const projectRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', authenticate);

  app.post('/projects', async (request, reply) => {
    const input = createProjectSchema.parse(request.body);
    const project = await projectService.create(input, request.userId!);
    return reply.status(201).send(project);
  });

  app.get('/projects', async (request, reply) => {
    const projects = await projectService.list(request.userId!);
    return reply.send(projects);
  });

  app.get('/projects/:id', {
    preHandler: [requireProjectRole('member', 'admin', 'owner')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const project = await projectService.getById(id);
    return reply.send(project);
  });

  app.put('/projects/:id', {
    preHandler: [requireProjectRole('admin', 'owner')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = updateProjectSchema.parse(request.body);
    const project = await projectService.update(id, input);
    return reply.send(project);
  });

  app.delete('/projects/:id', {
    preHandler: [requireProjectRole('owner')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    await projectService.delete(id);
    return reply.status(204).send();
  });

  // 멤버 관리
  app.get('/projects/:id/members', {
    preHandler: [requireProjectRole('member', 'admin', 'owner')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const members = await projectService.getMembers(id);
    return reply.send(members);
  });

  app.post('/projects/:id/members', {
    preHandler: [requireProjectRole('admin', 'owner')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const input = addMemberSchema.parse(request.body);
    await projectService.addMember(id, input.user_id, input.role);
    return reply.status(201).send({ message: '멤버가 추가되었습니다' });
  });

  app.put('/projects/:id/members/:userId', {
    preHandler: [requireProjectRole('owner')],
  }, async (request, reply) => {
    const { id, userId } = request.params as { id: string; userId: string };
    const input = updateMemberRoleSchema.parse(request.body);
    await projectService.updateMemberRole(id, userId, input.role);
    return reply.send({ message: '역할이 변경되었습니다' });
  });

  app.delete('/projects/:id/members/:userId', {
    preHandler: [requireProjectRole('admin', 'owner')],
  }, async (request, reply) => {
    const { id, userId } = request.params as { id: string; userId: string };
    await projectService.removeMember(id, userId);
    return reply.status(204).send();
  });
};

export default projectRoutes;
