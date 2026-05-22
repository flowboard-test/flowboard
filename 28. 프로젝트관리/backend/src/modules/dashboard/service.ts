import { getDb } from '../../shared/database/connection';

export class DashboardService {
  async getProjectDashboard(projectId: string, period: string = 'weekly') {
    const db = getDb();

    const board = await db('boards')
      .where('project_id', projectId)
      .first();
    if (!board) return null;

    const columns = await db('columns')
      .where('board_id', board.id)
      .orderBy('position');

    const columnIds = columns.map((c) => c.id);

    // 전체 진행률
    const totalCards = await db('cards')
      .whereIn('column_id', columnIds)
      .whereNull('parent_id')
      .count('id as count')
      .first();

    const doneCards = await db('cards')
      .whereIn('column_id', columnIds)
      .whereNull('parent_id')
      .where('status', 'done')
      .count('id as count')
      .first();

    const total = Number(totalCards?.count || 0);
    const done = Number(doneCards?.count || 0);
    const progress = total > 0 ? Math.round((done / total) * 100) : 0;

    // 컬럼별 카드 수 분포
    const distribution = await db('cards')
      .whereIn('column_id', columnIds)
      .whereNull('parent_id')
      .groupBy('column_id')
      .select('column_id')
      .count('id as count');

    return {
      progress: { total, done, percentage: progress },
      columnDistribution: distribution.map((d) => ({
        column_id: d.column_id,
        column_name: columns.find((c) => c.id === d.column_id)?.name || '',
        count: Number(d.count),
      })),
      memberStats: await this.getMemberStats(projectId, columnIds),
    };
  }

  private async getMemberStats(projectId: string, columnIds: string[]) {
    const db = getDb();

    // 프로젝트 멤버 조회
    const members = await db('project_members')
      .join('users', 'project_members.user_id', 'users.id')
      .where('project_members.project_id', projectId)
      .select('users.id', 'users.name');

    const stats = [];
    for (const member of members) {
      // 할당된 카드 수
      const assigned = await db('cards')
        .whereIn('column_id', columnIds)
        .whereNull('parent_id')
        .where('assignee_id', member.id)
        .count('id as count')
        .first();

      // 완료 처리한 횟수 (transfers에서 from_user로 completed 이관한 수)
      const completed = await db('transfers')
        .join('cards', 'transfers.card_id', 'cards.id')
        .whereIn('cards.column_id', columnIds)
        .where('transfers.from_user_id', member.id)
        .where('transfers.resolution_type', 'completed')
        .count('transfers.id as count')
        .first();

      // 최종 완료 카드 (status=done이고 본인이 마지막 담당자)
      const finalDone = await db('cards')
        .whereIn('column_id', columnIds)
        .whereNull('parent_id')
        .where('assignee_id', member.id)
        .where('status', 'done')
        .count('id as count')
        .first();

      const totalCompleted = Number(completed?.count || 0) + Number(finalDone?.count || 0);

      stats.push({
        id: member.id,
        name: member.name,
        assigned: Number(assigned?.count || 0),
        completed: totalCompleted,
      });
    }

    return stats.filter((s) => s.assigned > 0 || s.completed > 0);
  }

  async getMyTasks(userId: string, filter?: string) {
    const db = getDb();
    let query = db('cards')
      .where('assignee_id', userId)
      .whereNull('parent_id')
      .orderBy('due_date', 'asc');

    if (filter === 'overdue') {
      query = query.where('due_date', '<', db.fn.now())
        .whereNot('status', 'done');
    } else if (filter === 'done') {
      query = query.where('status', 'done');
    } else if (filter === 'active') {
      query = query.whereNot('status', 'done');
    }

    const cards = await query;

    // 이관 정보 추가
    const cardIds = cards.map((c) => c.id);
    const transfers = cardIds.length > 0
      ? await db('transfers')
          .whereIn('card_id', cardIds)
          .where('to_user_id', userId)
          .join('users', 'transfers.from_user_id', 'users.id')
          .select('transfers.*', 'users.name as from_user_name')
          .orderBy('transfers.created_at', 'desc')
      : [];

    return cards.map((card) => ({
      ...card,
      transfer_info: transfers.find((t) => t.card_id === card.id) || null,
    }));
  }
}

export const dashboardService = new DashboardService();
