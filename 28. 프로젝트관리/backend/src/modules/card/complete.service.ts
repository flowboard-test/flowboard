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

    const column = await db('columns').where('id', card.column_id).first();
    const board = await db('boards').where('id', column.board_id).first();

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

        // 카드 담당자 변경 (다음 사람에게)
        await db('cards').where('id', cardId).update({
          assignee_id: nextStep.assignee_id,
          status: 'todo',
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
        // 마지막 단계이거나 워크플로우에 없는 사람 → 최종 완료
        await db('cards').where('id', cardId).update({
          status: 'done',
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
      // 워크플로우 없음 → 단순 완료 처리
      await db('cards').where('id', cardId).update({
        status: 'done',
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
