import { FastifyRequest, FastifyReply } from 'fastify';
import { verifyToken } from '../../modules/auth/jwt';
import { AppError } from '../errors/AppError';

declare module 'fastify' {
  interface FastifyRequest {
    userId?: string;
    userEmail?: string;
  }
}

export async function authenticate(
  request: FastifyRequest,
  _reply: FastifyReply
) {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw AppError.unauthorized('인증 토큰이 필요합니다');
  }

  const token = authHeader.slice(7);
  const payload = verifyToken(token);

  if (!payload) {
    throw AppError.unauthorized('유효하지 않거나 만료된 토큰입니다');
  }

  request.userId = payload.userId;
  request.userEmail = payload.email;
}
