import { getDb } from '../../shared/database/connection';
import { notificationService } from '../notification/service';

let interval: NodeJS.Timeout | null = null;

// 다음 실행일 계산
function computeNextRun(recur: any, current: Date): Date {
  const next = new Date(current);
  const iv = recur.recur_interval || 1;
  switch (recur.recur_type) {
    case 'daily': next.setDate(next.getDate() + iv); break;
    case 'weekly': next.setDate(next.getDate() + 7 * iv); break;
    case 'monthly': next.setMonth(next.getMonth() + iv); break;
    case 'yearly': next.setFullYear(next.getFullYear() + iv); break;
    case 'weekday': {
      // 다음 평일
      do { next.setDate(next.getDate() + 1); }
      while (next.getDay() === 0 || next.getDay() === 6);
      break;
    }
    default: next.setDate(next.getDate() + 1);
  }
  return next;
}

export function startRecurringScheduler() {
  // 10분마다 체크
  interval = setInterval(runCheck, 10 * 60 * 1000);
  runCheck();
}

async function runCheck() {
  try {
    const db = getDb();
    const today = new Date().toISOString().split('T')[0];
    const due = await db('recurring_cards')
      .where('is_active', true)
      .where('next_run', '<=', today);

    for (const recur of due) {
      // 종료일 지났으면 비활성
      if (recur.end_date && recur.end_date < today) {
        await db('recurring_cards').where('id', recur.id)
          .update({ is_active: false });
        continue;
      }

      // 알림 생성 (생성자에게)
      await notificationService.create({
        userId: recur.created_by,
        type: 'recurring_due',
        title: '🔁 반복 업무 등록 시점',
        body: `'${recur.title}' 반복 업무를 등록할 시간입니다`,
        metadata: { recurringId: recur.id, projectId: recur.project_id },
      });

      // 다음 실행일 갱신
      const nextRun = computeNextRun(recur, new Date(recur.next_run));
      await db('recurring_cards').where('id', recur.id)
        .update({ next_run: nextRun.toISOString().split('T')[0] });
    }
  } catch (err) {
    console.error('[Recurring] check failed:', err);
  }
}

export function stopRecurringScheduler() {
  if (interval) clearInterval(interval);
}
