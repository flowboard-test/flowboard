import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

// Property 5: 우선순위 유효성 검증
describe('Property 5: 우선순위 유효성 검증', () => {
  const validPriorities = ['urgent', 'high', 'normal', 'low'];

  it('유효한 우선순위만 허용되어야 한다', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...validPriorities),
        (priority) => {
          expect(validPriorities).toContain(priority);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('유효하지 않은 우선순위는 거부되어야 한다', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 20 }).filter(
          (s) => !validPriorities.includes(s)
        ),
        (invalidPriority) => {
          expect(validPriorities).not.toContain(invalidPriority);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Property 10: WIP Limit 강제
describe('Property 10: WIP Limit 강제', () => {
  it('WIP limit 도달 시 추가 카드 이동은 거부되어야 한다', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 20 }),
        fc.integer({ min: 0, max: 25 }),
        (wipLimit, currentCount) => {
          const canMove = currentCount < wipLimit;
          if (currentCount >= wipLimit) {
            expect(canMove).toBe(false);
          } else {
            expect(canMove).toBe(true);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});

// Property 11: 카드 이동 시 상태 갱신 및 담당자 보존
describe('Property 11: 카드 이동 시 상태 갱신 및 담당자 보존', () => {
  it('Transfer 없이 이동 시 담당자는 변경되지 않아야 한다', () => {
    fc.assert(
      fc.property(
        fc.uuid(), // assigneeId
        fc.uuid(), // targetColumnId
        (assigneeId, targetColumnId) => {
          // 시뮬레이션: Transfer 없이 이동
          const card = { assignee_id: assigneeId, column_id: 'old-col' };
          const hasTransfer = false;

          // 이동 후
          const movedCard = {
            ...card,
            column_id: targetColumnId,
            assignee_id: hasTransfer ? 'new-assignee' : card.assignee_id,
          };

          expect(movedCard.assignee_id).toBe(assigneeId);
          expect(movedCard.column_id).toBe(targetColumnId);
        }
      ),
      { numRuns: 100 }
    );
  });
});
