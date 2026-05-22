import { FastifyRequest, FastifyReply } from 'fastify';
import { getDb } from '../database/connection';
import { AppError } from '../errors/AppError';
import { ProjectRole } from '../types';

const ROLE_HIERARCHY: Record<ProjectRole, number> = {
  owner: 3,
  admin: 2,
  member: 1,
};

export function requireProjectRole(...allowedRoles: ProjectRole[]) {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    const userId = request.userId;
    if (!userId) {
      throw AppError.unauthorized('인증이 필요합니다');
    }

    const projectId =
      (request.params as Record<string, string>).id ||
      (request.params as Record<string, string>).projectId;

    if (!projectId) {
      throw AppError.badRequest(
        'MISSING_PROJECT_ID',
        '프로젝트 ID가 필요합니다'
      );
    }

    const db = getDb();
    const member = await db('project_members')
      .where({ project_id: projectId, user_id: userId })
      .first();

    if (!member) {
      throw AppError.forbidden(
        'FORBIDDEN',
        '이 프로젝트에 접근 권한이 없습니다'
      );
    }

    const userLevel = ROLE_HIERARCHY[member.role as ProjectRole] || 0;
    const minRequired = Math.min(
      ...allowedRoles.map((r) => ROLE_HIERARCHY[r])
    );

    if (userLevel < minRequired) {
      throw AppError.forbidden(
        'FORBIDDEN',
        '이 작업을 수행할 권한이 없습니다'
      );
    }

    // Attach member info to request for downstream use
    (request as any).projectMember = member;
  };
}
