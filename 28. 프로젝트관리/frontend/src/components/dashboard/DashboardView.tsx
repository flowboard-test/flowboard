import { useState } from 'react';

interface DashboardData {
  progress: { total: number; done: number; percentage: number };
  columnDistribution: Array<{ column_name: string; count: number }>;
  memberStats?: Array<{ id: string; name: string; assigned: number; completed: number }>;
}

interface DashboardViewProps {
  data: DashboardData | null;
  cards?: any[];
  members?: any[];
}

export function DashboardView({ data, cards = [], members = [] }: DashboardViewProps) {
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('weekly');

  if (!data) {
    return <p className="p-4 text-gray-500">데이터를 불러오는 중...</p>;
  }

  const maxCount = Math.max(
    ...data.columnDistribution.map((d) => d.count), 1
  );

  // 마감 임박 카드 (3일 이내)
  const now = new Date();
  const threeDaysLater = new Date(now.getTime() + 3 * 86400000);
  const urgentCards = cards.filter((c: any) => {
    if (!c.due_date || c.status === 'done') return false;
    const due = new Date(c.due_date);
    return due <= threeDaysLater;
  }).sort((a: any, b: any) =>
    new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
  );

  // 기한 초과 카드
  const overdueCards = cards.filter((c: any) => {
    if (!c.due_date || c.status === 'done') return false;
    return new Date(c.due_date) < now;
  });

  // 멤버별 처리량 (서버 데이터 우선, 없으면 클라이언트 계산)
  const memberStats = data.memberStats || members.map((m: any) => {
    const assigned = cards.filter((c: any) => c.assignee_id === m.id);
    const done = assigned.filter((c: any) => c.status === 'done');
    return { ...m, assigned: assigned.length, completed: done.length };
  }).filter((m: any) => m.assigned > 0 || m.completed > 0);

  return (
    <div className="p-4 h-full overflow-y-auto space-y-4">
      {/* 기간 필터 */}
      <div className="flex gap-2">
        {(['daily', 'weekly', 'monthly'] as const).map((p) => (
          <button key={p} onClick={() => setPeriod(p)}
            className={`px-3 py-1 rounded text-xs
              ${period === p ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}>
            {p === 'daily' ? '일간' : p === 'weekly' ? '주간' : '월간'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 진행률 */}
        <div className="bg-white border rounded-lg p-4">
          <h3 className="text-sm font-semibold mb-2">프로젝트 진행률</h3>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-gray-200 rounded-full h-4">
              <div className="bg-blue-500 h-4 rounded-full transition-all"
                style={{ width: `${data.progress.percentage}%` }} />
            </div>
            <span className="text-lg font-bold text-blue-600">
              {data.progress.percentage}%
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            {data.progress.done} / {data.progress.total} 완료
          </p>
        </div>

        {/* 요약 카드 */}
        <div className="bg-white border rounded-lg p-4">
          <h3 className="text-sm font-semibold mb-2">요약</h3>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-2xl font-bold text-blue-600">{data.progress.total}</p>
              <p className="text-xs text-gray-500">전체</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{data.progress.done}</p>
              <p className="text-xs text-gray-500">완료</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{overdueCards.length}</p>
              <p className="text-xs text-gray-500">기한초과</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 컬럼별 분포 */}
        <div className="bg-white border rounded-lg p-4">
          <h3 className="text-sm font-semibold mb-3">컬럼별 카드 분포</h3>
          <div className="space-y-2">
            {data.columnDistribution.map((col) => (
              <div key={col.column_name} className="flex items-center gap-2">
                <span className="text-xs w-14 text-gray-600 truncate">
                  {col.column_name}
                </span>
                <div className="flex-1 bg-gray-100 rounded h-6">
                  <div className="bg-blue-400 h-6 rounded text-xs text-white
                    flex items-center px-2 transition-all"
                    style={{ width: `${(col.count / maxCount) * 100}%` }}>
                    {col.count}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 멤버별 처리량 */}
        <div className="bg-white border rounded-lg p-4">
          <h3 className="text-sm font-semibold mb-3">멤버별 처리량</h3>
          {memberStats.length > 0 ? (
            <div className="space-y-2">
              {memberStats.map((m: any) => (
                <div key={m.id} className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-gray-200 flex
                    items-center justify-center text-xs">
                    {m.name?.charAt(0)}
                  </div>
                  <span className="text-xs w-16 truncate">{m.name}</span>
                  <div className="flex-1 bg-gray-100 rounded h-4">
                    <div className="bg-green-400 h-4 rounded transition-all"
                      style={{ width: `${(m.assigned > 0 ? (m.completed / m.assigned) * 100 : 0)}%` }} />
                  </div>
                  <span className="text-xs text-gray-500">{m.completed}/{m.assigned}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400">담당자가 지정된 업무가 없습니다</p>
          )}
        </div>
      </div>

      {/* 마감 임박 / 기한 초과 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border rounded-lg p-4">
          <h3 className="text-sm font-semibold mb-2 text-orange-600">
            ⏰ 마감 임박 ({urgentCards.length})
          </h3>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {urgentCards.slice(0, 10).map((c: any) => (
              <div key={c.id} className="flex justify-between text-xs p-1.5
                bg-orange-50 rounded">
                <span className="truncate flex-1">{c.title}</span>
                <span className="text-orange-600 shrink-0 ml-2">
                  {c.due_date?.split('T')[0]}
                </span>
              </div>
            ))}
            {urgentCards.length === 0 && (
              <p className="text-xs text-gray-400">마감 임박 업무 없음</p>
            )}
          </div>
        </div>

        <div className="bg-white border rounded-lg p-4">
          <h3 className="text-sm font-semibold mb-2 text-red-600">
            🚨 기한 초과 ({overdueCards.length})
          </h3>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {overdueCards.slice(0, 10).map((c: any) => (
              <div key={c.id} className="flex justify-between text-xs p-1.5
                bg-red-50 rounded">
                <span className="truncate flex-1">{c.title}</span>
                <span className="text-red-600 shrink-0 ml-2">
                  {c.due_date?.split('T')[0]}
                </span>
              </div>
            ))}
            {overdueCards.length === 0 && (
              <p className="text-xs text-gray-400">기한 초과 업무 없음</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
