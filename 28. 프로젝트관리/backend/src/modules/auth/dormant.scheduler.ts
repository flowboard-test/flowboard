import { getDb } from '../../shared/database/connection';
import { notificationService } from '../notification/service';
import { v4 as uuid } from 'uuid';

/**
 * 6개월 미접속 계정 처리 정책
 * 
 * 1. 5개월 경과: 휴면 예정 알림 발송
 * 2. 6개월 경과: 휴면 계정 전환 (is_dormant = true)
 * 3. 7개월 경과: 계정 삭제 (개인정보 파기)
 */
export class DormantScheduler {
  async checkDormantAccounts() {
    const db = getDb();
    const now = new Date();

    // 5개월 전 날짜 (휴면 예정 알림)
    const fiveMonthsAgo = new Date(now);
    fiveMonthsAgo.setMonth(fiveMonthsAgo.getMonth() - 5);

    // 6개월 전 날짜 (휴면 전환)
    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // 7개월 전 날짜 (계정 삭제)
    const sevenMonthsAgo = new Date(now);
    sevenMonthsAgo.setMonth(sevenMonthsAgo.getMonth() - 7);

    // 1단계: 5개월 경과 - 휴면 예정 알림
    await this.notifyUpcomingDormant(db, fiveMonthsAgo, sixMonthsAgo);

    // 2단계: 6개월 경과 - 휴면 전환
    await this.convertToDormant(db, sixMonthsAgo);

    // 3단계: 7개월 경과 - 계정 삭제
    await this.deleteExpiredAccounts(db, sevenMonthsAgo);
  }

  private async notifyUpcomingDormant(db: any, fiveMonthsAgo: Date, sixMonthsAgo: Date) {
    const users = await db('users')
      .where('last_login_at', '<', fiveMonthsAgo.toISOString())
      .where('last_login_at', '>=', sixMonthsAgo.toISOString())
      .where('is_dormant', false)
      .whereNull('dormant_notified_at');

    for (const user of users) {
      await notificationService.create({
        userId: user.id,
        type: 'deadline_d3' as any,
        title: '휴면 계정 전환 예정',
        body: '30일 이내 로그인하지 않으면 휴면 계정으로 전환됩니다. 로그인하여 계정을 유지하세요.',
        metadata: { type: 'dormant_warning' },
      });

      await db('users').where('id', user.id).update({
        dormant_notified_at: db.fn.now(),
      });
    }

    if (users.length > 0) {
      console.log(`Dormant warning sent to ${users.length} users`);
    }
  }

  private async convertToDormant(db: any, sixMonthsAgo: Date) {
    const result = await db('users')
      .where('last_login_at', '<', sixMonthsAgo.toISOString())
      .where('is_dormant', false)
      .update({ is_dormant: true });

    if (result > 0) {
      console.log(`${result} accounts converted to dormant`);
    }
  }

  private async deleteExpiredAccounts(db: any, sevenMonthsAgo: Date) {
    const users = await db('users')
      .where('last_login_at', '<', sevenMonthsAgo.toISOString())
      .where('is_dormant', true);

    for (const user of users) {
      // 개인정보 파기 (관련 데이터 삭제)
      await db('notifications').where('user_id', user.id).del();
      await db('notification_settings').where('user_id', user.id).del();
      await db('user_profiles').where('user_id', user.id).del();
      await db('project_members').where('user_id', user.id).del();
      await db('comments').where('author_id', user.id).del();

      // 사용자 삭제 (CASCADE로 연관 데이터 정리)
      await db('users').where('id', user.id).del();
    }

    if (users.length > 0) {
      console.log(`${users.length} expired dormant accounts deleted`);
    }
  }
}

export const dormantScheduler = new DormantScheduler();
