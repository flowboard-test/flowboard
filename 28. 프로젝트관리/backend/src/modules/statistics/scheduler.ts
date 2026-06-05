import { statisticsBatch } from './batch';

let schedulerInterval: NodeJS.Timeout | null = null;

export function startStatisticsScheduler() {
  // 매시간 체크, 00시에 배치 실행
  schedulerInterval = setInterval(async () => {
    const now = new Date();
    if (now.getHours() === 0 && now.getMinutes() < 5) {
      const yesterday = new Date(now.getTime() - 86400000);
      const dateStr = yesterday.toISOString().split('T')[0];
      try {
        await statisticsBatch.runDailyBatch(dateStr);
      } catch (err) {
        console.error('[Statistics] Batch failed:', err);
      }
    }
  }, 5 * 60 * 1000); // 5분마다 체크
}

export function stopStatisticsScheduler() {
  if (schedulerInterval) clearInterval(schedulerInterval);
}
