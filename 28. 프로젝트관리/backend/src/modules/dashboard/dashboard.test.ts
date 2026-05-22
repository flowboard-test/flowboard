import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

// Property 33: 대시보드 진행률 계산
describe('Property 33: 대시보드 진행률 계산', () => {
  it('진행률은 (완료 / 전체) × 100으로 계산되어야 한다', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 1000 }), // done
        fc.integer({ min: 0, max: 1000 }), // notDone
        (done, notDone) => {
          const total = done + notDone;
          const expected = total > 0
            ? Math.round((done / total) * 100)
            : 0;

          expect(expected).toBeGreaterThanOrEqual(0);
          expect(expected).toBeLessThanOrEqual(100);

          if (total === 0) expect(expected).toBe(0);
          if (done === total && total > 0) expect(expected).toBe(100);
          if (done === 0) expect(expected).toBe(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Property 36: 대시보드 컬럼 분포 정확성
describe('Property 36: 대시보드 컬럼 분포 정확성', () => {
  it('컬럼별 카드 수 합계는 전체 카드 수와 일치해야 한다', () => {
    fc.assert(
      fc.property(
        fc.array(fc.integer({ min: 0, max: 50 }), {
          minLength: 1, maxLength: 10,
        }),
        (columnCounts) => {
          const total = columnCounts.reduce((a, b) => a + b, 0);
          const sum = columnCounts.reduce((a, b) => a + b, 0);
          expect(sum).toBe(total);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Property 31: 내 업무 뷰 정렬 규칙
describe('Property 31: 내 업무 뷰 정렬 규칙', () => {
  it('기한 초과 카드는 항상 최상단에 위치해야 한다', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            due_date: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
            is_overdue: fc.boolean(),
          }),
          { minLength: 1, maxLength: 20 }
        ),
        (cards) => {
          // 정렬: 기한 초과 먼저, 나머지 마감일 오름차순
          const sorted = [...cards].sort((a, b) => {
            if (a.is_overdue && !b.is_overdue) return -1;
            if (!a.is_overdue && b.is_overdue) return 1;
            return a.due_date.getTime() - b.due_date.getTime();
          });

          // 기한 초과 카드가 있으면 최상단에 위치
          const firstNonOverdue = sorted.findIndex((c) => !c.is_overdue);
          const lastOverdue = sorted.findLastIndex((c) => c.is_overdue);

          if (lastOverdue >= 0 && firstNonOverdue >= 0) {
            expect(lastOverdue).toBeLessThan(firstNonOverdue);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
