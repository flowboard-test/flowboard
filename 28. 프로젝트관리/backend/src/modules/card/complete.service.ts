import { getDb } from '../../shared/database/connection';
import { AppError } from '../../shared/errors/AppError';
import { v4 as uuid } from 'uuid';
import { notificationService } from '../notification/service';

export class CardCompleteService {
  /**
   * 카드 완료 처리
   * - 워크플로우가 있으면 다음 담당자에게 자동 이관
   * - 없으면 단순 완료 처리
   */
  async complete(cardId: string, userId: string, comment?: string) {
    const db = getDb();

    const card = await db('cards').where('id', cardId).first();
    if (!card) throw AppError.notFound('카드를 찾을 수 없습니다');

    // 서브태스크 완료 검증
    const incompleteSubtasks = await db('cards')
      .where('parent_id', cardId)
      .whereNot('status', 'done')
      .count('id as count')
      .first();
    if (Number(incompleteSubtasks?.count || 0) > 0) {
      throw AppError.badRequest(
        'SUBTASKS_INCOMPLETE',
        '미완료된 하위 업무가 있습니다. 모든 하위 업무를 완료한 후 처리하세요.'
      );
    }

    const column = await db('columns').where('id', card.column_id).first();
    const board = await db('boards').where('id', column.board_id).first();

    // 보드의 컬럼들 조회 (칸반 이동용)
    const boardColumns = await db('columns')
      .where('board_id', column.board_id)
      .orderBy('position', 'asc');
    const inProgressCol = boardColumns.find((c: any) => c.name === '진행 중');
    const doneCol = boardColumns.find((c: any) => c.name === '완료');

    // 워크플로우 체인 확인
    const chain = await db('workflow_chains')
      .where({ project_id: board.project_id, is_active: true })
      .first();

    if (chain) {
      // 워크플로우 단계 조회
      const steps = await db('workflow_steps')
        .where('chain_id', chain.id)
        .orderBy('step_order', 'asc');

      // 현재 담당자가 몇 번째 단계인지 확인
      const currentStepIdx = steps.findIndex(
        (s) => s.assignee_id === userId
      );

      // 워크플로우에 없는 사람(카드 생성자 등)이 완료한 경우 → 첫 번째 담당자에게 이관
      if (currentStepIdx === -1) {
        const firstStep = steps[0];
        const transferId = uuid();

        await db('transfers').insert({
          id: transferId,
          card_id: cardId,
          from_user_id: userId,
          to_user_id: firstStep.assignee_id,
          resolution_type: 'completed',
          comment: comment || `${card.title} → 워크플로우 시작`,
          is_auto: true,
          workflow_step_id: firstStep.id,
        });

        const targetColId = inProgressCol ? inProgressCol.id : card.column_id;
        await db('cards').where('id', cardId).update({
          assignee_id: firstStep.assignee_id,
          status: 'in_progress',
          column_id: targetColId,
          updated_at: db.fn.now(),
        });

        await db('resolutions').insert({
          id: uuid(),
          card_id: cardId,
          transfer_id: transferId,
          type: 'completed',
          comment: comment || '워크플로우 시작',
          created_by: userId,
        });

        await db('card_timeline').insert({
          id: uuid(),
          card_id: cardId,
          event_type: 'auto_transferred',
          actor_id: userId,
          payload: JSON.stringify({
            from_user_id: userId,
            to_user_id: firstStep.assignee_id,
            step_order: firstStep.step_order,
            chain_name: chain.name,
          }),
        });

        const fromUser = await db('users').where('id', userId).first();
        await notificationService.sendTransferNotification(
          firstStep.assignee_id,
          fromUser?.name || '시스템',
          card.title,
          cardId,
          board.project_id
        );

        return {
          status: 'transferred',
          message: '워크플로우가 시작되었습니다. 첫 번째 담당자에게 전달되었습니다.',
          next_assignee_id: firstStep.assignee_id,
        };
      }

      // 이전 단계 완료 여부 검증
      if (currentStepIdx > 0) {
        const prevStep = steps[currentStepIdx - 1];
        // 이전 담당자가 이 카드를 완료 이관했는지 확인
        const prevCompleted = await db('transfers')
          .where('card_id', cardId)
          .where('from_user_id', prevStep.assignee_id)
          .where('resolution_type', 'completed')
          .first();

        if (!prevCompleted) {
          throw AppError.badRequest(
            'PREVIOUS_STEP_NOT_COMPLETED',
            `이전 단계 담당자가 아직 완료 처리하지 않았습니다. 이전 담당자의 완료 후 처리할 수 있습니다.`
          );
        }
      }

      if (currentStepIdx >= 0 && currentStepIdx < steps.length - 1) {
        // 다음 단계 담당자에게 이관
        const nextStep = steps[currentStepIdx + 1];
        const transferId = uuid();

        // Transfer 기록
        await db('transfers').insert({
          id: transferId,
          card_id: cardId,
          from_user_id: userId,
          to_user_id: nextStep.assignee_id,
          resolution_type: 'completed',
          comment: comment || `${card.title} 완료 → 다음 단계`,
          is_auto: true,
          workflow_step_id: nextStep.id,
        });

        // 카드 담당자 변경 + "진행 중" 컬럼으로 이동
        const targetColId = inProgressCol ? inProgressCol.id : card.column_id;
        await db('cards').where('id', cardId).update({
          assignee_id: nextStep.assignee_id,
          status: 'in_progress',
          column_id: targetColId,
          updated_at: db.fn.now(),
        });

        // Resolution 기록
        await db('resolutions').insert({
          id: uuid(),
          card_id: cardId,
          transfer_id: transferId,
          type: 'completed',
          comment: comment || '업무 완료 처리',
          created_by: userId,
        });

        // 타임라인 기록
        await db('card_timeline').insert({
          id: uuid(),
          card_id: cardId,
          event_type: 'auto_transferred',
          actor_id: userId,
          payload: JSON.stringify({
            from_user_id: userId,
            to_user_id: nextStep.assignee_id,
            step_order: nextStep.step_order,
            chain_name: chain.name,
          }),
        });

        // 다음 담당자에게 알림
        const fromUser = await db('users').where('id', userId).first();
        await notificationService.sendTransferNotification(
          nextStep.assignee_id,
          fromUser?.name || '시스템',
          card.title,
          cardId,
          board.project_id
        );

        return {
          status: 'transferred',
          message: '완료 처리되었습니다. 다음 담당자에게 전달되었습니다.',
          next_assignee_id: nextStep.assignee_id,
        };
      } else {
        // 마지막 단계이거나 워크플로우에 없는 사람 → 최종 완료 + "완료" 컬럼 이동
        const targetDoneCol = doneCol ? doneCol.id : card.column_id;
        await db('cards').where('id', cardId).update({
          status: 'done',
          column_id: targetDoneCol,
          updated_at: db.fn.now(),
        });

        await db('card_timeline').insert({
          id: uuid(),
          card_id: cardId,
          event_type: 'completed',
          actor_id: userId,
          payload: JSON.stringify({ comment }),
        });

        return { status: 'done', message: '업무가 최종 완료되었습니다.' };
      }
    } else {
      // 워크플로우 없음 → 단순 완료 처리 + "완료" 컬럼 이동
      const targetDoneCol = doneCol ? doneCol.id : card.column_id;
      await db('cards').where('id', cardId).update({
        status: 'done',
        column_id: targetDoneCol,
        updated_at: db.fn.now(),
      });

      await db('card_timeline').insert({
        id: uuid(),
        card_id: cardId,
        event_type: 'completed',
        actor_id: userId,
        payload: JSON.stringify({ comment }),
      });

      return { status: 'done', message: '업무가 완료되었습니다.' };
    }
  }
}

export const cardCompleteService = new CardCompleteService();
