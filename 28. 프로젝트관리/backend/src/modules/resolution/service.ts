import { getDb } from '../../shared/database/connection';
import { AppError } from '../../shared/errors/AppError';
import { v4 as uuid } from 'uuid';

export class ResolutionService {
  async create(
    cardId: string,
    type: string,
    comment: string | null,
    userId: string
  ) {
    const db = getDb();

    const card = await db('cards').where('id', cardId).first();
    if (!card) {
      throw AppError.notFound('카드를 찾을 수 없습니다');
    }

    const resId = uuid();
    await db('resolutions').insert({
      id: resId,
      card_id: cardId,
      type,
      comment,
      created_by: userId,
    });

    const resolution = await db('resolutions').where('id', resId).first();

    // 타임라인 기록
    await db('card_timeline').insert({
      id: uuid(),
      card_id: cardId,
      event_type: 'resolution_recorded',
      actor_id: userId,
      payload: JSON.stringify({ type, comment }),
    });

    return resolution;
  }

  async getHistory(cardId: string) {
    const db = getDb();
    return await db('resolutions')
      .where('card_id', cardId)
      .join('users', 'resolutions.created_by', 'users.id')
      .select('resolutions.*', 'users.name as created_by_name')
      .orderBy('resolutions.created_at', 'asc');
  }
}

export const resolutionService = new ResolutionService();
