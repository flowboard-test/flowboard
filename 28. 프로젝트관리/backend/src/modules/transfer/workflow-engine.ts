import { getDb } from '../../shared/database/connection';
import { AppError } from '../../shared/errors/AppError';
import { v4 as uuid } from 'uuid';
import { notificationService } from '../notification/service';

export class WorkflowEngine {
  /**
   * 카드가 특정 컬럼에 도달했을 때 워크플로우 체인을 확인하고
   * 자동 이관을 실행합니다.
   */
  async checkAndExecute(cardId: string, columnId: string, actorId: string) {
    const db = getDb();

    // 해당 컬럼에 활성 워크플로우 체인이 있는지 확인
    const chain = await db('workflow_chains')
      .where({ trigger_column_id: columnId, is_active: true })
      .first();

    if (!chain) return null;

    // 워크플로우 단계 조회
    const steps = await db('workflow_steps')
      .where('chain_id', chain.id)
      .orderBy('step_order', 'asc');

    if (steps.length === 0) return null;

    // 이 카드의 현재 워크플로우 진행 상태 확인
    const lastAutoTransfer = await db('transfers')
      .where({ card_id: cardId, is_auto: true })
      .orderBy('created_at', 'desc')
      .first();

    let nextStepIndex = 0;
    if (lastAutoTransfer && lastAutoTransfer.workflow_step_id) {
      const lastStep = steps.findIndex(
        (s) => s.id === lastAutoTransfer.workflow_step_id
      );
      nextStepIndex = lastStep + 1;
    }

    // 마지막 단계를 넘어서면 카드 완료 처리
    if (nextStepIndex >= steps.length) {
      await db('cards')
        .where('id', cardId)
        .update({ status: 'done', updated_at: db.fn.now() });

      await db('card_timeline').insert({
        id: uuid(),
        card_id: cardId,
        event_type: 'workflow_completed',
        actor_id: actorId,
        payload: JSON.stringify({ chain_id: chain.id }),
      });

      return { completed: true };
    }

    // 다음 단계 자동 이관 실행
    const nextStep = steps[nextStepIndex];
    const transferId = uuid();

    await db('transfers').insert({
      id: transferId,
      card_id: cardId,
      from_user_id: actorId,
      to_user_id: nextStep.assignee_id,
      resolution_type: 'completed',
      comment: `자동 워크플로우: ${chain.name} (${nextStepIndex + 1}/${steps.length})`,
      is_auto: true,
      workflow_step_id: nextStep.id,
    });

    // 담당자 변경
    await db('cards')
      .where('id', cardId)
      .update({ assignee_id: nextStep.assignee_id, updated_at: db.fn.now() });

    // Resolution 기록
    await db('resolutions').insert({
      id: uuid(),
      card_id: cardId,
      transfer_id: transferId,
      type: 'completed',
      comment: `자동 워크플로우 단계 ${nextStepIndex + 1} 완료`,
      created_by: actorId,
    });

    // 타임라인 기록
    await db('card_timeline').insert({
      id: uuid(),
      card_id: cardId,
      event_type: 'auto_transferred',
      actor_id: actorId,
      payload: JSON.stringify({
        transfer_id: transferId,
        to_user_id: nextStep.assignee_id,
        step_order: nextStep.step_order,
        chain_name: chain.name,
      }),
    });

    // 알림 발송
    const actor = await db('users').where('id', actorId).first();
    const card = await db('cards').where('id', cardId).first();
    if (actor && card) {
      const column = await db('columns').where('id', card.column_id).first();
      const board = await db('boards').where('id', column?.board_id).first();
      await notificationService.sendTransferNotification(
        nextStep.assignee_id,
        actor.name,
        card.title,
        cardId,
        board?.project_id || ''
      );
    }

    return { completed: false, transferId, nextAssignee: nextStep.assignee_id };
  }

  async createWorkflowChain(
    projectId: string,
    triggerColumnId: string,
    name: string,
    assigneeIds: string[]
  ) {
    const db = getDb();
    const chainId = uuid();

    await db('workflow_chains').insert({
      id: chainId,
      project_id: projectId,
      trigger_column_id: triggerColumnId,
      name,
    });

    for (let i = 0; i < assigneeIds.length; i++) {
      await db('workflow_steps').insert({
        id: uuid(),
        chain_id: chainId,
        assignee_id: assigneeIds[i],
        step_order: i,
      });
    }

    return chainId;
  }

  async getWorkflows(projectId: string) {
    const db = getDb();
    const chains = await db('workflow_chains')
      .where('project_id', projectId);

    const result = [];
    for (const chain of chains) {
      const steps = await db('workflow_steps')
        .where('chain_id', chain.id)
        .join('users', 'workflow_steps.assignee_id', 'users.id')
        .select('workflow_steps.*', 'users.name as assignee_name')
        .orderBy('step_order');
      result.push({ ...chain, steps });
    }
    return result;
  }

  async updateWorkflow(
    chainId: string,
    data: { name?: string; assignee_ids?: string[]; is_active?: boolean }
  ) {
    const db = getDb();
    const chain = await db('workflow_chains').where('id', chainId).first();
    if (!chain) throw AppError.notFound('워크플로우를 찾을 수 없습니다');

    // 이름/활성 상태 업데이트
    if (data.name || data.is_active !== undefined) {
      await db('workflow_chains').where('id', chainId).update({
        ...(data.name && { name: data.name }),
        ...(data.is_active !== undefined && { is_active: data.is_active }),
      });
    }

    // 단계 재설정
    if (data.assignee_ids && data.assignee_ids.length > 0) {
      await db('workflow_steps').where('chain_id', chainId).del();
      for (let i = 0; i < data.assignee_ids.length; i++) {
        await db('workflow_steps').insert({
          id: uuid(),
          chain_id: chainId,
          assignee_id: data.assignee_ids[i],
          step_order: i,
        });
      }
    }

    return await this.getWorkflowById(chainId);
  }

  async deleteWorkflow(chainId: string) {
    const db = getDb();
    await db('workflow_steps').where('chain_id', chainId).del();
    await db('workflow_chains').where('id', chainId).del();
  }

  async getWorkflowById(chainId: string) {
    const db = getDb();
    const chain = await db('workflow_chains').where('id', chainId).first();
    if (!chain) return null;
    const steps = await db('workflow_steps')
      .where('chain_id', chainId)
      .join('users', 'workflow_steps.assignee_id', 'users.id')
      .select('workflow_steps.*', 'users.name as assignee_name')
      .orderBy('step_order');
    return { ...chain, steps };
  }
}

export const workflowEngine = new WorkflowEngine();
