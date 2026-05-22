import { getDb } from '../../shared/database/connection';
import { AppError } from '../../shared/errors/AppError';
import { v4 as uuid } from 'uuid';
import { TransferRequest } from '../../shared/types';
import { notificationService } from '../notification/service';

export class TransferService {
  async create(cardId: string, input: TransferRequest, fromUserId: string) {
    const db = getDb();

    return await db.transaction(async (trx) => {
      const card = await trx('cards').where('id', cardId).first();
      if (!card) {
        throw AppError.notFound('카드를 찾을 수 없습니다');
      }

      // 이관 대상이 프로젝트 멤버인지 확인
      const column = await trx('columns').where('id', card.column_id).first();
      const board = await trx('boards').where('id', column.board_id).first();
      const isMember = await trx('project_members')
        .where({ project_id: board.project_id, user_id: input.toUserId })
        .first();

      if (!isMember) {
        // 이관 대상을 자동으로 프로젝트 멤버로 추가
        const targetUser = await trx('users').where('id', input.toUserId).first();
        if (!targetUser) {
          throw AppError.badRequest(
            'INVALID_TRANSFER_TARGET',
            '이관 대상 사용자를 찾을 수 없습니다'
          );
        }
        const { v4: uuidGen } = require('uuid');
        await trx('project_members').insert({
          id: uuidGen(),
          project_id: board.project_id,
          user_id: input.toUserId,
          role: 'member',
        });
      }

      // Resolution 필수 체크
      const project = await trx('projects')
        .where('id', board.project_id)
        .first();

      if (project.resolution_required && !input.resolutionType) {
        throw AppError.unprocessable(
          'RESOLUTION_REQUIRED',
          '이 프로젝트는 이관 시 처리 결과 입력이 필수입니다'
        );
      }

      const transferId = uuid();
      await trx('transfers').insert({
        id: transferId,
        card_id: cardId,
        from_user_id: fromUserId,
        to_user_id: input.toUserId,
        resolution_type: input.resolutionType,
        comment: input.comment || null,
        is_auto: false,
      });

      // Resolution 기록
      await trx('resolutions').insert({
        id: uuid(),
        card_id: cardId,
        transfer_id: transferId,
        type: input.resolutionType,
        comment: input.comment || null,
        created_by: fromUserId,
      });

      // 담당자 변경
      let newAssignee = input.toUserId;
      if (input.resolutionType === 'rejected') {
        // 반려 시 이전 담당자(발신자)에게 재할당
        newAssignee = card.assignee_id || fromUserId;
      }

      await trx('cards')
        .where('id', cardId)
        .update({ assignee_id: newAssignee, updated_at: trx.fn.now() });

      // 타임라인 기록
      await trx('card_timeline').insert({
        id: uuid(),
        card_id: cardId,
        event_type: 'transferred',
        actor_id: fromUserId,
        payload: JSON.stringify({
          transfer_id: transferId,
          from_user_id: fromUserId,
          to_user_id: newAssignee,
          resolution_type: input.resolutionType,
          comment: input.comment,
        }),
      });

      // 알림 발송
      const fromUser = await trx('users').where('id', fromUserId).first();
      if (input.resolutionType === 'rejected') {
        await notificationService.sendRejectionNotification(
          newAssignee,
          fromUser?.name || '알 수 없음',
          card.title,
          cardId,
          board.project_id
        );
      } else {
        await notificationService.sendTransferNotification(
          newAssignee,
          fromUser?.name || '알 수 없음',
          card.title,
          cardId,
          board.project_id
        );
      }

      return {
        id: transferId,
        card_id: cardId,
        from_user_id: fromUserId,
        to_user_id: newAssignee,
        resolution_type: input.resolutionType,
        comment: input.comment,
      };
    });
  }

  async getHistory(cardId: string) {
    const db = getDb();
    return await db('transfers')
      .where('card_id', cardId)
      .join('users as from_user', 'transfers.from_user_id', 'from_user.id')
      .join('users as to_user', 'transfers.to_user_id', 'to_user.id')
      .select(
        'transfers.*',
        'from_user.name as from_user_name',
        'to_user.name as to_user_name'
      )
      .orderBy('transfers.created_at', 'asc');
  }
}

export const transferService = new TransferService();
