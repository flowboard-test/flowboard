import { getDb } from '../../shared/database/connection';
import { notificationService } from './service';
import { v4 as uuid } from 'uuid';

export class DeadlineScheduler {
  /**
   * 매일 실행: D-3, D-1, D-day, 기한 초과 카드에 알림 발송
   */
  async checkDeadlines() {
    const db = getDb();
    const today = new Date().toISOString().split('T')[0];

    const d1 = this.addDays(today, 1);
    const d3 = this.addDays(today, 3);

    // D-3 카드
    await this.sendDeadlineAlerts(db, d3, 'deadline_d3', 'D-3 마감 임박');

    // D-1 카드
    await this.sendDeadlineAlerts(db, d1, 'deadline_d1', 'D-1 마감 임박');

    // D-day 카드
    await this.sendDeadlineAlerts(db, today, 'deadline_dday', 'D-day 마감일');

    // 기한 초과 카드
    await this.sendOverdueAlerts(db, today);

    // 마감 임박 시 워크플로우 이전 담당자 독촉 알림
    await this.sendWorkflowUrgentAlerts(db, d3);
  }

  private async sendDeadlineAlerts(
    db: any, targetDate: string, type: string, titlePrefix: string
  ) {
    const cards = await db('cards')
      .where('due_date', targetDate)
      .whereNot('status', 'done')
      .whereNotNull('assignee_id')
      .whereNull('parent_id');

    for (const card of cards) {
      // 중복 발송 방지
      const alreadySent = await db('notification_sent_log')
        .where({
          card_id: card.id,
          notification_type: type,
          sent_date: targetDate,
        })
        .first();

      if (alreadySent) continue;

      await notificationService.create({
        userId: card.assignee_id,
        type: type as any,
        title: titlePrefix,
        body: `'${card.title}' 업무의 마감일이 다가옵니다`,
        metadata: { cardId: card.id },
      });

      await db('notification_sent_log').insert({
        id: uuid(),
        card_id: card.id,
        notification_type: type,
        sent_date: targetDate,
      });
    }
  }

  private async sendOverdueAlerts(db: any, today: string) {
    const cards = await db('cards')
      .where('due_date', '<', today)
      .whereNot('status', 'done')
      .whereNotNull('assignee_id')
      .whereNull('parent_id');

    for (const card of cards) {
      const alreadySent = await db('notification_sent_log')
        .where({
          card_id: card.id,
          notification_type: 'overdue',
          sent_date: today,
        })
        .first();

      if (alreadySent) continue;

      // 담당자에게 알림
      await notificationService.create({
        userId: card.assignee_id,
        type: 'overdue',
        title: '기한 초과',
        body: `'${card.title}' 업무의 마감일이 지났습니다`,
        metadata: { cardId: card.id },
      });

      // 프로젝트 관리자에게도 알림
      const column = await db('columns').where('id', card.column_id).first();
      const board = await db('boards').where('id', column?.board_id).first();
      if (board) {
        const admins = await db('project_members')
          .where('project_id', board.project_id)
          .whereIn('role', ['owner', 'admin']);

        for (const admin of admins) {
          if (admin.user_id !== card.assignee_id) {
            await notificationService.create({
              userId: admin.user_id,
              type: 'overdue',
              title: '기한 초과 (관리자 알림)',
              body: `'${card.title}' 업무의 마감일이 지났습니다`,
              metadata: { cardId: card.id },
            });
          }
        }
      }

      await db('notification_sent_log').insert({
        id: uuid(),
        card_id: card.id,
        notification_type: 'overdue',
        sent_date: today,
      });
    }
  }

  private addDays(dateStr: string, days: number): string {
    const date = new Date(dateStr);
    date.setDate(date.getDate() + days);
    return date.toISOString().split('T')[0];
  }

  /**
   * 마감 임박 카드에서 워크플로우 이전 담당자에게 독촉 알림
   * 현재 담당자가 대기 중인데 이전 담당자가 아직 완료하지 않은 경우
   */
  private async sendWorkflowUrgentAlerts(db: any, deadlineDate: string) {
    // 마감 3일 이내 미완료 카드 조회
    const urgentCards = await db('cards')
      .where('due_date', '<=', deadlineDate)
      .whereNot('status', 'done')
      .whereNotNull('assignee_id')
      .whereNull('parent_id');

    for (const card of urgentCards) {
      const column = await db('columns').where('id', card.column_id).first();
      if (!column) continue;
      const board = await db('boards').where('id', column.board_id).first();
      if (!board) continue;

      // 워크플로우 체인 확인
      const chain = await db('workflow_chains')
        .where({ project_id: board.project_id, is_active: true })
        .first();
      if (!chain) continue;

      const steps = await db('workflow_steps')
        .where('chain_id', chain.id)
        .orderBy('step_order', 'asc');

      // 현재 담당자의 단계 확인
      const currentIdx = steps.findIndex(
        (s: any) => s.assignee_id === card.assignee_id
      );
      if (currentIdx <= 0) continue;

      // 이전 담당자가 완료했는지 확인
      const prevStep = steps[currentIdx - 1];
      const prevCompleted = await db('transfers')
        .where('card_id', card.id)
        .where('from_user_id', prevStep.assignee_id)
        .where('resolution_type', 'completed')
        .first();

      if (prevCompleted) continue; // 이미 완료됨

      // 중복 발송 방지
      const alreadySent = await db('notification_sent_log')
        .where({
          card_id: card.id,
          notification_type: 'workflow_urgent',
          sent_date: new Date().toISOString().split('T')[0],
        })
        .first();
      if (alreadySent) continue;

      // 이전 담당자에게 독촉 알림 발송
      await notificationService.create({
        userId: prevStep.assignee_id,
        type: 'deadline_d3' as any,
        title: '업무 처리 요청 (마감 임박)',
        body: `'${card.title}' 업무의 마감이 임박했습니다. 빠른 처리를 부탁드립니다.`,
        metadata: { cardId: card.id, projectId: board.project_id },
      });

      await db('notification_sent_log').insert({
        id: uuid(),
        card_id: card.id,
        notification_type: 'workflow_urgent',
        sent_date: new Date().toISOString().split('T')[0],
      });
    }
  }
}

export const deadlineScheduler = new DeadlineScheduler();
