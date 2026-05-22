import { getDb } from '../../shared/database/connection';
import { AppError } from '../../shared/errors/AppError';
import { CreateCardInput, UpdateCardInput, MoveCardInput } from './schemas';
import { v4 as uuid } from 'uuid';

export class CardService {
  async create(columnId: string, input: CreateCardInput, userId: string) {
    const db = getDb();

    const column = await db('columns').where('id', columnId).first();
    if (!column) {
      throw AppError.notFound('컬럼을 찾을 수 없습니다');
    }

    // 우선순위 기반 position 계산
    // 긴급(0) > 높음(1) > 보통(2) > 낮음(3)
    const priorityWeight: Record<string, number> = {
      urgent: 0, high: 1, normal: 2, low: 3,
    };
    const newWeight = priorityWeight[input.priority] ?? 2;

    // 같은 컬럼의 기존 카드들 조회
    const existingCards = await db('cards')
      .where('column_id', columnId)
      .whereNull('parent_id')
      .orderBy('position', 'asc');

    // 새 카드가 들어갈 위치 찾기 (같은 우선순위 그룹의 마지막)
    let insertPosition = existingCards.length;
    for (let i = 0; i < existingCards.length; i++) {
      const cardWeight = priorityWeight[existingCards[i].priority] ?? 2;
      if (cardWeight > newWeight) {
        insertPosition = i;
        break;
      }
    }

    // 삽입 위치 이후 카드들 position 밀기
    await db('cards')
      .where('column_id', columnId)
      .whereNull('parent_id')
      .where('position', '>=', insertPosition)
      .increment('position', 1);

    const cardId = uuid();
    await db('cards').insert({
      id: cardId,
      column_id: columnId,
      title: input.title,
      description: input.description || null,
      priority: input.priority,
      assignee_id: input.assignee_id || null,
      start_date: input.start_date || null,
      due_date: input.due_date || null,
      tags: JSON.stringify(input.tags || []),
      position: insertPosition,
      created_by: userId,
    });

    const card = await db('cards').where('id', cardId).first();
    return card;
  }

  async getById(cardId: string) {
    const db = getDb();
    const card = await db('cards').where('id', cardId).first();
    if (!card) {
      throw AppError.notFound('카드를 찾을 수 없습니다');
    }
    return card;
  }

  async update(cardId: string, input: UpdateCardInput) {
    const db = getDb();
    const { version, ...data } = input;

    const result = await db('cards')
      .where({ id: cardId, version })
      .update({
        ...data,
        version: db.raw('version + 1'),
        updated_at: db.fn.now(),
      });

    if (result === 0) {
      const current = await db('cards').where('id', cardId).first();
      if (!current) {
        throw AppError.notFound('카드를 찾을 수 없습니다');
      }
      throw AppError.conflict(
        'VERSION_CONFLICT',
        '다른 사용자가 이 카드를 수정했습니다. 새로고침 후 다시 시도하세요.',
        { currentVersion: current.version }
      );
    }

    const updatedCard = await db('cards').where('id', cardId).first();

    // 상태가 done으로 변경되면 워크플로우 실행
    if (data.status === 'done' && updatedCard) {
      const { workflowEngine } = require('../transfer/workflow-engine');
      await workflowEngine.checkAndExecute(
        cardId, updatedCard.column_id, updatedCard.assignee_id || updatedCard.created_by
      );
    }

    return updatedCard;
  }

  async delete(cardId: string) {
    const db = getDb();
    await db('cards').where('id', cardId).del();
  }

  async move(cardId: string, input: MoveCardInput, userId: string) {
    const db = getDb();

    return await db.transaction(async (trx) => {
      const card = await trx('cards').where('id', cardId).first();
      if (!card) {
        throw AppError.notFound('카드를 찾을 수 없습니다');
      }

      const targetColumn = await trx('columns')
        .where('id', input.target_column_id)
        .first();
      if (!targetColumn) {
        throw AppError.notFound('대상 컬럼을 찾을 수 없습니다');
      }

      // WIP Limit 체크
      if (targetColumn.wip_limit) {
        const currentCount = await trx('cards')
          .where('column_id', input.target_column_id)
          .whereNull('parent_id')
          .count('id as count')
          .first();

        const count = Number(currentCount?.count || 0);
        // 같은 컬럼 내 이동이면 제외
        const isSameColumn = card.column_id === input.target_column_id;
        if (!isSameColumn && count >= targetColumn.wip_limit) {
          throw AppError.forbidden(
            'WIP_LIMIT_EXCEEDED',
            `'${targetColumn.name}' 컬럼의 WIP 제한(${targetColumn.wip_limit})을 초과했습니다`,
            { columnId: targetColumn.id, currentCount: count, wipLimit: targetColumn.wip_limit }
          );
        }
      }

      const fromColumnId = card.column_id;

      // 원래 컬럼에서 빠진 카드 뒤의 position 재정렬
      if (fromColumnId !== input.target_column_id) {
        await trx('cards')
          .where('column_id', fromColumnId)
          .whereNull('parent_id')
          .where('position', '>', card.position)
          .decrement('position', 1);
      }

      // 대상 컬럼에서 삽입 위치 이후 카드들 position 밀기
      await trx('cards')
        .where('column_id', input.target_column_id)
        .whereNull('parent_id')
        .where('position', '>=', input.position)
        .whereNot('id', cardId)
        .increment('position', 1);

      // 카드 이동
      await trx('cards')
        .where('id', cardId)
        .update({
          column_id: input.target_column_id,
          position: input.position,
          updated_at: trx.fn.now(),
        });

      // 타임라인 기록: 컬럼 이동
      if (fromColumnId !== input.target_column_id) {
        await trx('card_timeline').insert({
          id: uuid(),
          card_id: cardId,
          event_type: 'column_moved',
          actor_id: userId,
          payload: JSON.stringify({
            from_column_id: fromColumnId,
            to_column_id: input.target_column_id,
          }),
        });
      }

      // 동시 이관 처리
      if (input.transfer_to && input.resolution) {
        const transferId = uuid();
        await trx('transfers').insert({
          id: transferId,
          card_id: cardId,
          from_user_id: userId,
          to_user_id: input.transfer_to,
          resolution_type: input.resolution.type,
          comment: input.resolution.comment || null,
          is_auto: false,
        });

        // 담당자 변경
        let newAssignee = input.transfer_to;

        // 반려 시 이전 담당자에게 재할당
        if (input.resolution.type === 'rejected') {
          newAssignee = card.assignee_id || userId;
        }

        await trx('cards')
          .where('id', cardId)
          .update({ assignee_id: newAssignee });

        // Resolution 기록
        await trx('resolutions').insert({
          id: uuid(),
          card_id: cardId,
          transfer_id: transferId,
          type: input.resolution.type,
          comment: input.resolution.comment || null,
          created_by: userId,
        });

        // 타임라인 기록: 이관
        await trx('card_timeline').insert({
          id: uuid(),
          card_id: cardId,
          event_type: 'transferred',
          actor_id: userId,
          payload: JSON.stringify({
            from_user_id: userId,
            to_user_id: newAssignee,
            resolution_type: input.resolution.type,
          }),
        });
      }

      return await trx('cards').where('id', cardId).first();
    });
  }

  async createSubtask(parentId: string, input: CreateCardInput, userId: string) {
    const db = getDb();
    const parent = await db('cards').where('id', parentId).first();
    if (!parent) {
      throw AppError.notFound('상위 카드를 찾을 수 없습니다');
    }

    const maxPos = await db('cards')
      .where('parent_id', parentId)
      .max('position as max')
      .first();

    const position = (maxPos?.max ?? -1) + 1;

    const subtaskId = uuid();
    await db('cards').insert({
      id: subtaskId,
      column_id: parent.column_id,
      parent_id: parentId,
      title: input.title,
      description: input.description || null,
      priority: input.priority,
      assignee_id: input.assignee_id || null,
      start_date: input.start_date || null,
      due_date: input.due_date || null,
      tags: JSON.stringify(input.tags || []),
      position,
      created_by: userId,
    });

    const subtask = await db('cards').where('id', subtaskId).first();
    return subtask;
  }

  async getSubtasks(parentId: string) {
    const db = getDb();
    return await db('cards')
      .where('parent_id', parentId)
      .orderBy('position', 'asc');
  }
}

export const cardService = new CardService();
