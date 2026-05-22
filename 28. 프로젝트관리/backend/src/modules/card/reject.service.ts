import { getDb } from '../../shared/database/connection';
import { AppError } from '../../shared/errors/AppError';
import { v4 as uuid } from 'uuid';
import { notificationService } from '../notification/service';

export class CardRejectService {
  /**
   * 수정 요청 (반려)
   * - 이전 담당자에게 업무를 되돌려보냄
   * - 반려 사유를 기록
   */
  async reject(cardId: string, userId: string, reason: string) {
    const db = getDb();

    const card = await db('cards').where('id', cardId).first();
    if (!card) throw AppError.notFound('카드를 찾을 수 없습니다');

    // 가장 최근 이관 기록에서 이전 담당자 찾기
    const lastTransfer = await db('transfers')
      .where('card_id', cardId)
      .where('to_user_id', userId)
      .orderBy('created_at', 'desc')
      .first();

    if (!lastTransfer) {
      throw AppError.badRequest(
        'NO_PREVIOUS_ASSIGNEE',
        '이전 담당자를 찾을 수 없습니다. 이관 이력이 없습니다.'
      );
    }

    const previousAssignee = lastTransfer.from_user_id;
    const transferId = uuid();

    // 반려 Transfer 기록
    await db('transfers').insert({
      id: transferId,
      card_id: cardId,
      from_user_id: userId,
      to_user_id: previousAssignee,
      resolution_type: 'rejected',
      comment: reason,
      is_auto: false,
    });

    // 카드 담당자를 이전 담당자로 변경
    await db('cards').where('id', cardId).update({
      assignee_id: previousAssignee,
      status: 'todo',
      updated_at: db.fn.now(),
    });

    // Resolution 기록
    await db('resolutions').insert({
      id: uuid(),
      card_id: cardId,
      transfer_id: transferId,
      type: 'rejected',
      comment: reason,
      created_by: userId,
    });

    // 타임라인 기록
    await db('card_timeline').insert({
      id: uuid(),
      card_id: cardId,
      event_type: 'rejected',
      actor_id: userId,
      payload: JSON.stringify({
        from_user_id: userId,
        to_user_id: previousAssignee,
        reason,
      }),
    });

    // 이전 담당자에게 알림
    const rejecter = await db('users').where('id', userId).first();
    const column = await db('columns').where('id', card.column_id).first();
    const board = await db('boards').where('id', column?.board_id).first();

    await notificationService.sendRejectionNotification(
      previousAssignee,
      rejecter?.name || '담당자',
      card.title,
      cardId,
      board?.project_id || ''
    );

    return {
      status: 'rejected',
      message: '수정 요청이 전달되었습니다. 이전 담당자에게 업무가 재배정됩니다.',
      previous_assignee_id: previousAssignee,
    };
  }
}

export const cardRejectService = new CardRejectService();
