import { useRef, useState } from 'react';

interface GanttCard {
  id: string;
  title: string;
  start_date: string | null;
  due_date: string | null;
  priority: string;
  column_name?: string;
  _isSubtask?: boolean;
  _parentTitle?: string;
}

interface GanttViewProps {
  cards: GanttCard[];
}

const CELL_WIDTH = 32;
const ROW_HEIGHT = 36;

const priorityColors: Record<string, string> = {
  urgent: 'bg-red-500',
  high: 'bg-orange-400',
  normal: 'bg-blue-400',
  low: 'bg-gray-400',
};

// 한국 공휴일 (2026년 기준 주요 공휴일)
const HOLIDAYS_2026 = [
  '2026-01-01', '2026-01-28', '2026-01-29', '2026-01-30',
  '2026-03-01', '2026-05-05', '2026-05-24', '2026-06-06',
  '2026-08-15', '2026-09-24', '2026-09-25', '2026-09-26',
  '2026-10-03', '2026-10-09', '2026-12-25',
];

function isHoliday(dateStr: string): boolean {
  return HOLIDAYS_2026.includes(dateStr);
}

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

type ViewScale = 'month' | 'week' | 'day';

export function GanttView({ cards }: GanttViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<ViewScale>('day');

  // 3개월 범위 계산 (오늘 기준 -2주 ~ +3개월)
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 14);
  const endDate = new Date(today);
  endDate.setMonth(endDate.getMonth() + 3);

  // 날짜 배열 생성
  const days: Date[] = [];
  const current = new Date(startDate);
  while (current <= endDate) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  // 월 그룹
  const months: { label: string; span: number }[] = [];
  let prevMonth = -1;
  for (const day of days) {
    const m = day.getMonth();
    if (m !== prevMonth) {
      months.push({
        label: `${day.getFullYear()}년 ${m + 1}월`,
        span: 0,
      });
      prevMonth = m;
    }
    months[months.length - 1].span++;
  }

  // 주 그룹
  const weeks: { label: string; span: number }[] = [];
  let weekStart: Date | null = null;
  let weekSpan = 0;
  for (let i = 0; i < days.length; i++) {
    if (days[i].getDay() === 1 || i === 0) {
      if (weekStart && weekSpan > 0) {
        weeks.push({
          label: `${weekStart.getMonth() + 1}/${weekStart.getDate()}~`,
          span: weekSpan,
        });
      }
      weekStart = days[i];
      weekSpan = 0;
    }
    weekSpan++;
  }
  if (weekStart && weekSpan > 0) {
    weeks.push({
      label: `${weekStart.getMonth() + 1}/${weekStart.getDate()}~`,
      span: weekSpan,
    });
  }

  const validCards = cards.filter((c) => c.start_date && c.due_date);
  const startTime = startDate.getTime();

  function getBarPosition(card: GanttCard) {
    const s = new Date(card.start_date!).getTime();
    const e = new Date(card.due_date!).getTime();
    const leftDays = Math.max((s - startTime) / 86400000, 0);
    const duration = Math.max((e - s) / 86400000 + 1, 1);
    return {
      left: leftDays * CELL_WIDTH,
      width: duration * CELL_WIDTH,
    };
  }

  const totalWidth = days.length * CELL_WIDTH;

  return (
    <div className="h-full flex flex-col">
      {/* 스케일 전환 */}
      <div className="flex gap-2 p-2 border-b bg-white shrink-0">
        {(['day', 'week', 'month'] as ViewScale[]).map((s) => (
          <button key={s} onClick={() => setScale(s)}
            className={`px-3 py-1 rounded text-xs
              ${scale === s ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}>
            {s === 'day' ? '일' : s === 'week' ? '주' : '월'}
          </button>
        ))}
        <span className="text-xs text-gray-500 ml-2 self-center">
          {validCards.length}개 업무 표시
        </span>
      </div>

      {validCards.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-gray-500
          text-sm">
          시작일/종료일이 설정된 카드가 없습니다.
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          {/* 왼쪽: 업무명 고정 */}
          <div className="w-48 shrink-0 border-r bg-white z-10">
            <div className="h-16 border-b flex items-end p-2">
              <span className="text-xs font-medium text-gray-500">업무명</span>
            </div>
            {validCards.map((card) => (
              <div key={card.id}
                className="flex items-center px-2 border-b"
                style={{ height: ROW_HEIGHT }}>
                <span className={`w-2 h-2 rounded-full mr-2 shrink-0
                  ${priorityColors[card.priority]}`} />
                <span className={`text-xs truncate
                  ${card._isSubtask ? 'pl-3 text-gray-500' : ''}`}>
                  {card._isSubtask ? '└ ' : ''}{card.title}
                </span>
              </div>
            ))}
          </div>

          {/* 오른쪽: 날짜 스크롤 영역 */}
          <div ref={scrollRef} className="flex-1 overflow-x-auto">
            <div style={{ width: totalWidth, minWidth: '100%' }}>
              {/* 월 헤더 */}
              <div className="flex h-8 border-b">
                {months.map((m, i) => (
                  <div key={i}
                    className="border-r text-xs font-medium text-gray-700
                      flex items-center px-1"
                    style={{ width: m.span * CELL_WIDTH }}>
                    {m.label}
                  </div>
                ))}
              </div>

              {/* 일 헤더 */}
              <div className="flex h-8 border-b">
                {days.map((day, i) => {
                  const dateStr = formatDate(day);
                  const weekend = isWeekend(day);
                  const holiday = isHoliday(dateStr);
                  const isToday = formatDate(today) === dateStr;
                  return (
                    <div key={i}
                      className={`text-center text-xs border-r flex
                        items-center justify-center
                        ${weekend ? 'bg-gray-100 text-gray-400' : ''}
                        ${holiday ? 'bg-red-50 text-red-400' : ''}
                        ${isToday ? 'bg-blue-100 font-bold' : ''}`}
                      style={{ width: CELL_WIDTH }}>
                      {scale === 'day' ? day.getDate() :
                       scale === 'week' && day.getDay() === 1 ? day.getDate() :
                       scale === 'month' && day.getDate() === 1 ? day.getDate() : ''}
                    </div>
                  );
                })}
              </div>

              {/* 카드 바 */}
              {validCards.map((card) => {
                const pos = getBarPosition(card);
                return (
                  <div key={card.id} className="relative border-b"
                    style={{ height: ROW_HEIGHT }}>
                    {/* 배경: 주말/휴일 표시 */}
                    <div className="absolute inset-0 flex">
                      {days.map((day, i) => {
                        const dateStr = formatDate(day);
                        const weekend = isWeekend(day);
                        const holiday = isHoliday(dateStr);
                        return (
                          <div key={i}
                            className={`border-r
                              ${weekend ? 'bg-gray-50' : ''}
                              ${holiday ? 'bg-red-50/50' : ''}`}
                            style={{ width: CELL_WIDTH }} />
                        );
                      })}
                    </div>
                    {/* 바 */}
                    <div
                      className={`absolute top-1.5 h-5 rounded-sm text-xs
                        text-white flex items-center px-1 truncate shadow-sm
                        ${priorityColors[card.priority]}`}
                      style={{
                        left: pos.left,
                        width: Math.max(pos.width, CELL_WIDTH),
                      }}
                      title={`${card.title}\n${card.start_date} ~ ${card.due_date}`}>
                      {pos.width > CELL_WIDTH * 3 ? card.title : ''}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
