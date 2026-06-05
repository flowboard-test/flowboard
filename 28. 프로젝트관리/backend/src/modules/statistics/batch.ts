import { getDb } from '../../shared/database/connection';
import { v4 as uuid } from 'uuid';

export class StatisticsBatch {
  async runDailyBatch(targetDate?: string) {
    const db = getDb();
    const date = targetDate || new Date().toISOString().split('T')[0];

    // 1. 전체 통계 (stat_type: 'global')
    await this.generateGlobalStats(db, date);

    // 2. 프로젝트별 통계
    await this.generateProjectStats(db, date);

    // 3. 사용자별 통계
    await this.generateUserStats(db, date);

    console.log(`[Statistics] Daily batch completed for ${date}`);
  }

  private async generateGlobalStats(db: any, date: string) {
    const dayStart = `${date}T00:00:00`;
    const dayEnd = `${date}T23:59:59`;

    const created = await db('cards')
      .whereNull('parent_id')
      .whereBetween('created_at', [dayStart, dayEnd])
      .count('id as c').first();

    const completed = await db('cards')
      .whereNull('parent_id')
      .where('status', 'done')
      .whereBetween('updated_at', [dayStart, dayEnd])
      .count('id as c').first();

    const inProgress = await db('cards')
      .whereNull('parent_id')
      .where('status', 'in_progress')
      .count('id as c').first();

    const review = await db('cards')
      .whereNull('parent_id')
      .where('status', 'review')
      .count('id as c').first();

    const overdue = await db('cards')
      .whereNull('parent_id')
      .whereNot('status', 'done')
      .where('due_date', '<', date)
      .whereNotNull('due_date')
      .count('id as c').first();

    const total = await db('cards')
      .whereNull('parent_id')
      .count('id as c').first();

    await this.upsertStat(db, date, 'global', null, {
      created_count: Number(created?.c || 0),
      completed_count: Number(completed?.c || 0),
      in_progress_count: Number(inProgress?.c || 0),
      review_count: Number(review?.c || 0),
      overdue_count: Number(overdue?.c || 0),
      total_count: Number(total?.c || 0),
    });
  }

  private async generateProjectStats(db: any, date: string) {
    const projects = await db('projects').select('id');
    const dayStart = `${date}T00:00:00`;
    const dayEnd = `${date}T23:59:59`;

    for (const project of projects) {
      const board = await db('boards').where('project_id', project.id).first();
      if (!board) continue;
      const cols = await db('columns').where('board_id', board.id);
      const colIds = cols.map((c: any) => c.id);
      if (colIds.length === 0) continue;

      const created = await db('cards').whereIn('column_id', colIds)
        .whereNull('parent_id')
        .whereBetween('created_at', [dayStart, dayEnd])
        .count('id as c').first();
      const completed = await db('cards').whereIn('column_id', colIds)
        .whereNull('parent_id').where('status', 'done')
        .whereBetween('updated_at', [dayStart, dayEnd])
        .count('id as c').first();
      const inProgress = await db('cards').whereIn('column_id', colIds)
        .whereNull('parent_id').where('status', 'in_progress')
        .count('id as c').first();
      const review = await db('cards').whereIn('column_id', colIds)
        .whereNull('parent_id').where('status', 'review')
        .count('id as c').first();
      const overdue = await db('cards').whereIn('column_id', colIds)
        .whereNull('parent_id').whereNot('status', 'done')
        .where('due_date', '<', date).whereNotNull('due_date')
        .count('id as c').first();
      const total = await db('cards').whereIn('column_id', colIds)
        .whereNull('parent_id').count('id as c').first();

      await this.upsertStat(db, date, 'project', project.id, {
        created_count: Number(created?.c || 0),
        completed_count: Number(completed?.c || 0),
        in_progress_count: Number(inProgress?.c || 0),
        review_count: Number(review?.c || 0),
        overdue_count: Number(overdue?.c || 0),
        total_count: Number(total?.c || 0),
      });
    }
  }

  private async generateUserStats(db: any, date: string) {
    const users = await db('users').select('id');
    const dayStart = `${date}T00:00:00`;
    const dayEnd = `${date}T23:59:59`;

    for (const user of users) {
      const created = await db('cards')
        .where('created_by', user.id).whereNull('parent_id')
        .whereBetween('created_at', [dayStart, dayEnd])
        .count('id as c').first();
      const completed = await db('cards')
        .where('assignee_id', user.id).whereNull('parent_id')
        .where('status', 'done')
        .whereBetween('updated_at', [dayStart, dayEnd])
        .count('id as c').first();
      const inProgress = await db('cards')
        .where('assignee_id', user.id).whereNull('parent_id')
        .where('status', 'in_progress')
        .count('id as c').first();
      const review = await db('cards')
        .where('assignee_id', user.id).whereNull('parent_id')
        .where('status', 'review')
        .count('id as c').first();
      const overdue = await db('cards')
        .where('assignee_id', user.id).whereNull('parent_id')
        .whereNot('status', 'done')
        .where('due_date', '<', date).whereNotNull('due_date')
        .count('id as c').first();
      const total = await db('cards')
        .where('assignee_id', user.id).whereNull('parent_id')
        .count('id as c').first();

      await this.upsertStat(db, date, 'user', user.id, {
        created_count: Number(created?.c || 0),
        completed_count: Number(completed?.c || 0),
        in_progress_count: Number(inProgress?.c || 0),
        review_count: Number(review?.c || 0),
        overdue_count: Number(overdue?.c || 0),
        total_count: Number(total?.c || 0),
      });
    }
  }

  private async upsertStat(
    db: any, date: string, type: string,
    refId: string | null, data: any
  ) {
    const existing = await db('daily_stats')
      .where({ stat_date: date, stat_type: type, ref_id: refId })
      .first();
    if (existing) {
      await db('daily_stats')
        .where('id', existing.id)
        .update({ ...data, generated_at: db.fn.now() });
    } else {
      await db('daily_stats').insert({
        id: uuid(), stat_date: date, stat_type: type,
        ref_id: refId, ...data,
      });
    }
  }
}

export const statisticsBatch = new StatisticsBatch();
