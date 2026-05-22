import { getDb } from '../../shared/database/connection';
import { AppError } from '../../shared/errors/AppError';
import { CreateProjectInput, UpdateProjectInput } from './schemas';
import { v4 as uuid } from 'uuid';

export class ProjectService {
  async create(input: CreateProjectInput, userId: string) {
    const db = getDb();
    const projectId = uuid();
    const boardId = uuid();

    return await db.transaction(async (trx) => {
      await trx('projects').insert({
        id: projectId,
        name: input.name,
        description: input.description || null,
        is_public: input.is_public,
        resolution_required: input.resolution_required,
        owner_id: userId,
      });

      const project = await trx('projects').where('id', projectId).first();

      // 생성자를 owner로 자동 등록
      await trx('project_members').insert({
        id: uuid(),
        project_id: projectId,
        user_id: userId,
        role: 'owner',
      });

      // 기본 보드 생성
      await trx('boards').insert({
        id: boardId,
        project_id: projectId,
        name: '기본 보드',
      });

      // 기본 컬럼 생성
      const defaultColumns = ['할 일', '진행 중', '검토', '완료'];
      for (let i = 0; i < defaultColumns.length; i++) {
        await trx('columns').insert({
          id: uuid(),
          board_id: boardId,
          name: defaultColumns[i],
          position: i,
        });
      }

      // 멤버 이메일로 자동 추가
      if (input.member_emails && input.member_emails.length > 0) {
        for (const email of input.member_emails) {
          const user = await trx('users').where('email', email).first();
          if (user && user.id !== userId) {
            await trx('project_members').insert({
              id: uuid(),
              project_id: projectId,
              user_id: user.id,
              role: 'member',
            });
          }
        }
      }

      // 워크플로우 체인 자동 생성
      if (input.workflow_assignee_ids && input.workflow_assignee_ids.length > 0) {
        // "진행 중" 컬럼을 트리거로 사용
        const inProgressCol = await trx('columns')
          .where('board_id', boardId)
          .where('name', '진행 중')
          .first();

        if (inProgressCol) {
          const chainId = uuid();
          await trx('workflow_chains').insert({
            id: chainId,
            project_id: projectId,
            trigger_column_id: inProgressCol.id,
            name: `${input.name} 업무 프로세스`,
            is_active: true,
          });

          for (let i = 0; i < input.workflow_assignee_ids.length; i++) {
            await trx('workflow_steps').insert({
              id: uuid(),
              chain_id: chainId,
              assignee_id: input.workflow_assignee_ids[i],
              step_order: i,
            });
          }
        }
      }

      return project;
    });
  }

  async list(userId: string) {
    const db = getDb();
    return await db('projects')
      .join('project_members', 'projects.id', 'project_members.project_id')
      .where('project_members.user_id', userId)
      .where('projects.is_archived', false)
      .select('projects.*', 'project_members.role as my_role');
  }

  async getById(projectId: string) {
    const db = getDb();
    const project = await db('projects').where('id', projectId).first();
    if (!project) {
      throw AppError.notFound('프로젝트를 찾을 수 없습니다');
    }
    return project;
  }

  async update(projectId: string, input: UpdateProjectInput) {
    const db = getDb();
    await db('projects')
      .where('id', projectId)
      .update({ ...input, updated_at: db.fn.now() });
    const updated = await db('projects').where('id', projectId).first();
    return updated;
  }

  async delete(projectId: string) {
    const db = getDb();
    await db('projects').where('id', projectId).del();
  }

  async addMember(projectId: string, userId: string, role: string) {
    const db = getDb();
    const existing = await db('project_members')
      .where({ project_id: projectId, user_id: userId })
      .first();

    if (existing) {
      throw AppError.badRequest('ALREADY_MEMBER', '이미 프로젝트 멤버입니다');
    }

    const user = await db('users').where('id', userId).first();
    if (!user) {
      throw AppError.notFound('사용자를 찾을 수 없습니다');
    }

    await db('project_members').insert({
      id: uuid(),
      project_id: projectId,
      user_id: userId,
      role,
    });
  }

  async updateMemberRole(projectId: string, userId: string, role: string) {
    const db = getDb();

    // owner로 변경 시 기존 owner를 admin으로 변경
    if (role === 'owner') {
      await db.transaction(async (trx) => {
        await trx('project_members')
          .where({ project_id: projectId, role: 'owner' })
          .update({ role: 'admin' });

        await trx('project_members')
          .where({ project_id: projectId, user_id: userId })
          .update({ role: 'owner' });

        await trx('projects')
          .where('id', projectId)
          .update({ owner_id: userId });
      });
    } else {
      await db('project_members')
        .where({ project_id: projectId, user_id: userId })
        .update({ role });
    }
  }

  async removeMember(projectId: string, userId: string) {
    const db = getDb();
    const member = await db('project_members')
      .where({ project_id: projectId, user_id: userId })
      .first();

    if (!member) {
      throw AppError.notFound('프로젝트 멤버를 찾을 수 없습니다');
    }

    if (member.role === 'owner') {
      throw AppError.unprocessable(
        'OWNER_TRANSFER_REQUIRED',
        '소유자를 제거하려면 먼저 소유권을 이전해야 합니다'
      );
    }

    await db('project_members')
      .where({ project_id: projectId, user_id: userId })
      .del();
  }

  async getMembers(projectId: string) {
    const db = getDb();
    return await db('project_members')
      .join('users', 'project_members.user_id', 'users.id')
      .where('project_members.project_id', projectId)
      .select(
        'users.id',
        'users.email',
        'users.name',
        'users.avatar_url',
        'project_members.role',
        'project_members.joined_at'
      );
  }
}

export const projectService = new ProjectService();
