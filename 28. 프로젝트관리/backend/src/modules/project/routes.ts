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

  // 게스트 초대
  app.post('/projects/:id/invite-guest', {
    preHandler: [requireProjectRole('admin', 'owner')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { email } = request.body as { email: string };
    const { getDb } = require('../../shared/database/connection');
    const { v4: uid } = require('uuid');
    const db = getDb();

    // 사용자 찾기 또는 생성
    let user = await db('users').where('email', email).first();
    if (!user) {
      const userId = uid();
      await db('users').insert({
        id: userId, email, name: email.split('@')[0], password_hash: null,
      });
      user = await db('users').where('id', userId).first();
    }

    // 이미 멤버인지 확인
    const existing = await db('project_members')
      .where({ project_id: id, user_id: user.id }).first();
    if (existing) {
      return reply.status(400).send({ message: '이미 프로젝트 멤버입니다' });
    }

    await db('project_members').insert({
      id: uid(), project_id: id, user_id: user.id, role: 'guest',
    });
    return reply.status(201).send({ message: '게스트가 초대되었습니다' });
  });

  // 채팅
  app.get('/projects/:id/chat', {
    preHandler: [requireProjectRole('member', 'admin', 'owner')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { getDb } = require('../../shared/database/connection');
    const db = getDb();
    const messages = await db('chat_messages')
      .where('project_id', id)
      .join('users', 'chat_messages.user_id', 'users.id')
      .select('chat_messages.*', 'users.name as user_name')
      .orderBy('chat_messages.created_at', 'asc')
      .limit(100);
    return reply.send(messages);
  });

  app.post('/projects/:id/chat', {
    preHandler: [requireProjectRole('member', 'admin', 'owner')],
  }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const { content } = request.body as { content: string };
    const { getDb } = require('../../shared/database/connection');
    const { v4: uid } = require('uuid');
    const db = getDb();
    await db('chat_messages').insert({
      id: uid(), project_id: id, user_id: request.userId!, content,
    });
    return reply.status(201).send({ message: 'sent' });
  });
};

export default projectRoutes;
