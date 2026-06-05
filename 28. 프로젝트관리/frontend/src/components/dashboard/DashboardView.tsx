import { useState } from 'react';

interface DashboardData {
  progress: { total: number; done: number; percentage: number };
  columnDistribution: Array<{ column_name: string; count: number }>;
  columnDwellTime?: Array<{ column_name: string; avg_hours: number }>;
  memberStats?: Array<{ id: string; name: string; assigned: number; completed: number }>;
}

interface DashboardViewProps {
  data: DashboardData | null;
  cards?: any[];
  members?: any[];
  onCardClick?: (card: any) => void;
}

export function DashboardView({ data, cards = [], members = [], onCardClick }: DashboardViewProps) {
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [detailView, setDetailView] = useState<{ type: string; title: string; items: any[] } | null>(null);
  const [selectedCard, setSelectedCard] = useState<any | null>(null);

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
        <div className="bg-white border rounded-lg p-4 cursor-pointer hover:shadow-md"
          onClick={() => {
            const doneCards = cards.filter((c: any) => c.status === 'done');
            setDetailView({ type: 'progress', title: '📊 완료된 업무 목록', items: doneCards });
          }}>
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
            {data.progress.done} / {data.progress.total} 완료 (클릭하여 상세)
          </p>
        </div>

        {/* 요약 카드 */}
        <div className="bg-white border rounded-lg p-4">
          <h3 className="text-sm font-semibold mb-2">요약</h3>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="cursor-pointer hover:bg-blue-50 rounded p-1"
              onClick={() => setDetailView({ type: 'all', title: '📋 전체 업무', items: cards })}>
              <p className="text-2xl font-bold text-blue-600">{data.progress.total}</p>
              <p className="text-xs text-gray-500">전체</p>
            </div>
            <div className="cursor-pointer hover:bg-green-50 rounded p-1"
              onClick={() => setDetailView({ type: 'done', title: '✅ 완료 업무', items: cards.filter((c: any) => c.status === 'done') })}>
              <p className="text-2xl font-bold text-green-600">{data.progress.done}</p>
              <p className="text-xs text-gray-500">완료</p>
            </div>
            <div className="cursor-pointer hover:bg-red-50 rounded p-1"
              onClick={() => setDetailView({ type: 'overdue', title: '🚨 기한초과', items: overdueCards })}>
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
              <div key={col.column_name}
                className="flex items-center gap-2 cursor-pointer hover:bg-blue-50 rounded p-1"
                onClick={() => {
                  const colCards = cards.filter((c: any) => c.column_name === col.column_name);
                  setDetailView({ type: 'column', title: `📂 ${col.column_name} 업무 목록`, items: colCards });
                }}>
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
                <div key={m.id}
                  className="flex items-center gap-2 cursor-pointer hover:bg-green-50 rounded p-1"
                  onClick={() => {
                    const memberCards = cards.filter((c: any) => c.assignee_id === m.id);
                    setDetailView({ type: 'member', title: `👤 ${m.name} 업무 목록`, items: memberCards });
                  }}>
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

      {/* 병목 분석: 컬럼별 평균 체류 시간 */}
      {data.columnDwellTime && data.columnDwellTime.length > 0 && (
        <div className="bg-white border rounded-lg p-4">
          <h3 className="text-sm font-semibold mb-3">⏱ 컬럼별 평균 체류 시간 (병목 분석)</h3>
          <div className="space-y-2">
            {data.columnDwellTime.map((col) => (
              <div key={col.column_name} className="flex items-center gap-2">
                <span className="text-xs w-14 text-gray-600">{col.column_name}</span>
                <div className="flex-1 bg-gray-100 rounded h-5">
                  <div className="bg-purple-400 h-5 rounded text-xs text-white
                    flex items-center px-2"
                    style={{ width: `${Math.min(col.avg_hours * 5, 100)}%` }}>
                    {col.avg_hours}h
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 마감 임박 / 기한 초과 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white border rounded-lg p-4 cursor-pointer hover:shadow-md"
          onClick={() => setDetailView({ type: 'urgent', title: '⏰ 마감 임박 업무', items: urgentCards })}>
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

        <div className="bg-white border rounded-lg p-4 cursor-pointer hover:shadow-md"
          onClick={() => setDetailView({ type: 'overdue', title: '🚨 기한 초과 업무', items: overdueCards })}>
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

      {/* 상세 모달 */}
      {detailView && !selectedCard && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-[500px] max-h-[70vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-sm font-semibold">{detailView.title}</h2>
              <button onClick={() => setDetailView(null)}
                className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              {detailView.type === 'member' && detailView.items.length > 0 && (
                <div className="flex gap-2 mb-3 text-xs">
                  <span className="px-2 py-1 bg-green-100 text-green-700 rounded">
                    완료: {detailView.items.filter((c: any) => c.status === 'done').length}
                  </span>
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded">
                    진행중: {detailView.items.filter((c: any) => c.status !== 'done').length}
                  </span>
                </div>
              )}
              {detailView.items.length > 0 ? (
                <div className="space-y-2">
                  {detailView.items.map((t: any) => (
                    <div key={t.id} className="border rounded-lg p-3 cursor-pointer hover:bg-gray-50 hover:shadow-sm transition"
                      onClick={() => onCardClick ? onCardClick(t) : setSelectedCard(t)}>
                      <div className="flex justify-between items-start">
                        <h3 className="text-sm font-medium">{t.title}</h3>
                        <div className="flex gap-1">
                          {t.status === 'done' && (
                            <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700">완료</span>
                          )}
                          <span className={`text-xs px-1.5 py-0.5 rounded
                            ${t.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                              t.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                              'bg-gray-100 text-gray-600'}`}>
                            {t.priority}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-3 mt-2 text-xs text-gray-400">
                        {t.due_date && <span>마감: {t.due_date.split('T')[0]}</span>}
                        {t.column_name && <span>상태: {t.column_name}</span>}
                        {t.assignee_name && <span>담당: {t.assignee_name}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-400 py-8">업무가 없습니다</p>
              )}
            </div>
          </div>
        </div>
      )}
      {/* 카드 상세 모달 */}
      {selectedCard && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg w-[520px] max-h-[75vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-sm font-semibold">📝 업무 상세</h2>
              <button onClick={() => setSelectedCard(null)}
                className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div>
                <h3 className="text-lg font-semibold">{selectedCard.title}</h3>
                {selectedCard.description && (
                  <p className="text-sm text-gray-600 mt-2">{selectedCard.description}</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-gray-50 rounded p-2">
                  <span className="text-xs text-gray-400">상태</span>
                  <p className="font-medium">{selectedCard.column_name || selectedCard.status || '-'}</p>
                </div>
                <div className="bg-gray-50 rounded p-2">
                  <span className="text-xs text-gray-400">우선순위</span>
                  <p className={`font-medium ${
                    selectedCard.priority === 'urgent' ? 'text-red-600' :
                    selectedCard.priority === 'high' ? 'text-orange-600' : ''
                  }`}>{selectedCard.priority || '-'}</p>
                </div>
                <div className="bg-gray-50 rounded p-2">
                  <span className="text-xs text-gray-400">담당자</span>
                  <p className="font-medium">{selectedCard.assignee_name || '-'}</p>
                </div>
                <div className="bg-gray-50 rounded p-2">
                  <span className="text-xs text-gray-400">마감일</span>
                  <p className={`font-medium ${
                    selectedCard.due_date && new Date(selectedCard.due_date) < now ? 'text-red-600' : ''
                  }`}>{selectedCard.due_date?.split('T')[0] || '-'}</p>
                </div>
                <div className="bg-gray-50 rounded p-2">
                  <span className="text-xs text-gray-400">시작일</span>
                  <p className="font-medium">{selectedCard.start_date?.split('T')[0] || '-'}</p>
                </div>
                <div className="bg-gray-50 rounded p-2">
                  <span className="text-xs text-gray-400">생성일</span>
                  <p className="font-medium">{selectedCard.created_at?.split('T')[0] || '-'}</p>
                </div>
              </div>
            </div>
            <div className="p-3 border-t flex justify-end">
              <button onClick={() => setSelectedCard(null)}
                className="px-4 py-1.5 text-sm bg-gray-100 rounded hover:bg-gray-200">닫기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
