import { FastifyPluginAsync } from 'fastify';
import { authService } from './service';
import { accountService } from './account.service';
import { externalAuthService } from './external-auth.service';
import { organizationService } from './organization.service';
import { registerSchema, loginSchema, refreshSchema } from './schemas';
import { generateToken, generateRefreshToken, verifyToken } from './jwt';
import { authenticate } from '../../shared/middleware/authenticate';
import { z } from 'zod';

const authRoutes: FastifyPluginAsync = async (app) => {
  // 로그인/회원가입은 분당 10회로 제한 (brute force 방어)
  app.post('/register', {
    config: { rateLimit: { max: 10, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const input = registerSchema.parse(request.body);
    const user = await authService.register(input);
    const token = generateToken({ userId: user.id, email: user.email });
    const refreshToken = generateRefreshToken({
      userId: user.id,
      email: user.email,
    });

    return reply.status(201).send({
      user,
      token,
      refreshToken,
    });
  });

  app.post('/login', {
    config: { rateLimit: { max: 5, timeWindow: '1 minute' } },
  }, async (request, reply) => {
    const input = loginSchema.parse(request.body);
    const user = await authService.login(input);
    const token = generateToken({ userId: user.id, email: user.email });
    const refreshToken = generateRefreshToken({
      userId: user.id,
      email: user.email,
    });

    return reply.send({ user, token, refreshToken });
  });

  app.post('/refresh', async (request, reply) => {
    const { refreshToken } = refreshSchema.parse(request.body);
    const payload = verifyToken(refreshToken);
    if (!payload) {
      return reply.status(401).send({
        statusCode: 401,
        error: 'UNAUTHORIZED',
        message: '유효하지 않은 리프레시 토큰입니다',
      });
    }

    const user = await authService.getUserById(payload.userId);
    const newToken = generateToken({ userId: user.id, email: user.email });
    const newRefreshToken = generateRefreshToken({
      userId: user.id,
      email: user.email,
    });

    return reply.send({
      user,
      token: newToken,
      refreshToken: newRefreshToken,
    });
  });

  // === 계정 관리 (인증 필요) ===

  app.get('/me', { preHandler: [authenticate] }, async (request, reply) => {
    const profile = await accountService.getProfile(request.userId!);
    return reply.send(profile);
  });

  app.put('/me', { preHandler: [authenticate] }, async (request, reply) => {
    const schema = z.object({
      name: z.string().min(1).max(100).optional(),
      avatar_url: z.string().optional(),
    });
    const input = schema.parse(request.body);
    const updated = await accountService.updateProfile(request.userId!, input);
    return reply.send(updated);
  });

  app.put('/me/password', { preHandler: [authenticate] }, async (request, reply) => {
    const schema = z.object({
      current_password: z.string().min(1),
      new_password: z.string().min(8, '새 비밀번호는 8자 이상이어야 합니다'),
    });
    const input = schema.parse(request.body);
    await accountService.changePassword(
      request.userId!, input.current_password, input.new_password
    );
    return reply.send({ message: '비밀번호가 변경되었습니다' });
  });

  app.get('/users', { preHandler: [authenticate] }, async (request, reply) => {
    const query = request.query as { search?: string };
    const users = await accountService.listUsers(query.search);
    return reply.send(users);
  });

  app.delete('/me', { preHandler: [authenticate] }, async (request, reply) => {
    await accountService.deleteAccount(request.userId!);
    return reply.status(204).send();
  });

  // === 외부 그룹웨어 연동 ===

  app.post('/external/login', async (request, reply) => {
    const schema = z.object({
      provider: z.string().min(1),
      token: z.string().min(1),
    });
    const input = schema.parse(request.body);
    const result = await externalAuthService.authenticateWithExternal(
      input.provider, input.token
    );
    return reply.send(result);
  });

  app.get('/external/status', { preHandler: [authenticate] }, async (request, reply) => {
    const status = await externalAuthService.getLinkStatus(request.userId!);
    return reply.send(status);
  });

  app.delete('/external/unlink', { preHandler: [authenticate] }, async (request, reply) => {
    await externalAuthService.unlinkExternal(request.userId!);
    return reply.send({ message: '연동이 해제되었습니다' });
  });

  // === 조직도 ===

  app.get('/organization', { preHandler: [authenticate] }, async (request, reply) => {
    const tree = await organizationService.getOrganizationTree();
    return reply.send(tree);
  });

  app.get('/organization/search', { preHandler: [authenticate] }, async (request, reply) => {
    const { q } = request.query as { q?: string };
    if (!q) return reply.send([]);
    const users = await organizationService.searchUsers(q);
    return reply.send(users);
  });

  app.post('/organization/departments', { preHandler: [authenticate] }, async (request, reply) => {
    const schema = z.object({
      name: z.string().min(1).max(100),
      parent_id: z.string().uuid().optional(),
      order: z.number().int().optional(),
    });
    const input = schema.parse(request.body);
    const dept = await organizationService.createDepartment(
      input.name, input.parent_id, input.order
    );
    return reply.status(201).send(dept);
  });
};

export default authRoutes;
