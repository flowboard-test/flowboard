import { getDb } from '../../shared/database/connection';
import { AppError } from '../../shared/errors/AppError';
import { v4 as uuid } from 'uuid';

export class BoardService {
  async getBoard(projectId: string) {
    const db = getDb();
    const board = await db('boards')
      .where('project_id', projectId)
      .first();

    if (!board) {
      throw AppError.notFound('보드를 찾을 수 없습니다');
    }

    const columns = await db('columns')
      .where('board_id', board.id)
      .orderBy('position', 'asc');

    const columnIds = columns.map((c) => c.id);
    const cards = columnIds.length > 0
      ? await db('cards')
          .whereIn('column_id', columnIds)
          .whereNull('parent_id')
          .orderBy('position', 'asc')
      : [];

    // 서브태스크도 조회
    const cardIds = cards.map((c) => c.id);
    const subtasks = cardIds.length > 0
      ? await db('cards')
          .whereIn('parent_id', cardIds)
          .orderBy('position', 'asc')
      : [];

    // Group cards by column + attach subtasks
    const cardsByColumn: Record<string, any[]> = {};
    const subtasksByParent: Record<string, any[]> = {};
    for (const sub of subtasks) {
      if (!subtasksByParent[sub.parent_id]) {
        subtasksByParent[sub.parent_id] = [];
      }
      subtasksByParent[sub.parent_id].push(sub);
    }

    for (const card of cards) {
      if (!cardsByColumn[card.column_id]) {
        cardsByColumn[card.column_id] = [];
      }
      cardsByColumn[card.column_id].push({
        ...card,
        subtasks: subtasksByParent[card.id] || [],
      });
    }

    return {
      ...board,
      columns: columns.map((col) => ({
        ...col,
        cards: cardsByColumn[col.id] || [],
      })),
    };
  }

  async createColumn(boardId: string, name: string, wipLimit?: number) {
    const db = getDb();
    const maxPos = await db('columns')
      .where('board_id', boardId)
      .max('position as max')
      .first();

    const position = (maxPos?.max ?? -1) + 1;

    const colId = uuid();
    await db('columns').insert({
      id: colId,
      board_id: boardId,
      name,
      position,
      wip_limit: wipLimit || null,
    });

    const column = await db('columns').where('id', colId).first();
    return column;
  }

  async updateColumn(columnId: string, data: { name?: string; wip_limit?: number | null }) {
    const db = getDb();
    await db('columns').where('id', columnId).update(data);
    const column = await db('columns').where('id', columnId).first();

    if (!column) {
      throw AppError.notFound('컬럼을 찾을 수 없습니다');
    }
    return column;
  }

  async reorderColumns(boardId: string, columnIds: string[]) {
    const db = getDb();
    await db.transaction(async (trx) => {
      for (let i = 0; i < columnIds.length; i++) {
        await trx('columns')
          .where({ id: columnIds[i], board_id: boardId })
          .update({ position: i });
      }
    });
  }

  async deleteColumn(columnId: string) {
    const db = getDb();
    const column = await db('columns').where('id', columnId).first();
    if (!column) {
      throw AppError.notFound('컬럼을 찾을 수 없습니다');
    }

    // 카드가 있는 컬럼은 삭제 불가
    const cardCount = await db('cards')
      .where('column_id', columnId)
      .count('id as count')
      .first();

    if (cardCount && Number(cardCount.count) > 0) {
      throw AppError.badRequest(
        'COLUMN_NOT_EMPTY',
        '카드가 있는 컬럼은 삭제할 수 없습니다. 카드를 먼저 이동하세요.'
      );
    }

    await db('columns').where('id', columnId).del();
  }

  async getBoardByProjectId(projectId: string) {
    const db = getDb();
    return await db('boards').where('project_id', projectId).first();
  }
}

export const boardService = new BoardService();
