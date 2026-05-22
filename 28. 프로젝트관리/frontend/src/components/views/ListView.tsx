import { useState } from 'react';
import { useUiStore } from '@/stores/uiStore';

interface Card {
  id: string;
  title: string;
  priority: string;
  assignee_id: string | null;
  due_date: string | null;
  start_date: string | null;
  status: string;
  column_name?: string;
}

interface ListViewProps {
  cards: Card[];
  columns: Array<{ id: string; name: string }>;
}

type SortKey = 'priority' | 'due_date' | 'title';
type FilterStatus = 'all' | 'todo' | 'in_progress' | 'done';

const priorityOrder: Record<string, number> = {
  urgent: 0, high: 1, normal: 2, low: 3,
};

const priorityLabels: Record<string, string> = {
  urgent: '긴급', high: '높음', normal: '보통', low: '낮음',
};

const priorityColors: Record<string, string> = {
  urgent: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  normal: 'bg-blue-100 text-blue-700',
  low: 'bg-gray-100 text-gray-600',
};

export function ListView({ cards, columns }: ListViewProps) {
  const [sortBy, setSortBy] = useState<SortKey>('priority');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const setSelectedCard = useUiStore((s) => s.setSelectedCard);

  // 필터링
  let filtered = cards;
  if (filterStatus !== 'all') {
    filtered = filtered.filter((c) => c.status === filterStatus);
  }
  if (searchQuery) {
    filtered = filtered.filter((c) =>
      c.title.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }

  // 정렬
  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === 'priority') {
      return (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9);
    }
    if (sortBy === 'due_date') {
      if (!a.due_date) return 1;
      if (!b.due_date) return -1;
      return a.due_date.localeCompare(b.due_date);
    }
    return a.title.localeCompare(b.title);
  });

  // 그룹화
  const grouped: Record<string, Card[]> = {};
  for (const col of columns) {
    grouped[col.name] = sorted.filter((c) => c.column_name === col.name);
  }

  function isOverdue(card: Card) {
    if (!card.due_date || card.status === 'done') return false;
    return new Date(card.due_date) < new Date();
  }

  return (
    <div className="p-4 h-full overflow-y-auto">
      {/* 필터/정렬 바 */}
      <div className="flex gap-2 mb-4 flex-wrap items-center">
        <input type="text" placeholder="업무 검색..."
          value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
          className="border rounded px-3 py-1.5 text-sm w-48" />
        <select value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
          className="border rounded px-2 py-1.5 text-xs">
          <option value="all">전체 상태</option>
          <option value="todo">할 일</option>
          <option value="in_progress">진행 중</option>
          <option value="done">완료</option>
        </select>
        <select value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortKey)}
          className="border rounded px-2 py-1.5 text-xs">
          <option value="priority">우선순위순</option>
          <option value="due_date">마감일순</option>
          <option value="title">이름순</option>
        </select>
        <span className="text-xs text-gray-500 ml-auto">
          {sorted.length}개 업무
        </span>
      </div>

      {/* 그룹별 목록 */}
      {columns.map((col) => {
        const colCards = grouped[col.name] || [];
        if (colCards.length === 0 && filterStatus !== 'all') return null;
        return (
          <div key={col.id} className="mb-5">
            <h3 className="text-xs font-semibold text-gray-500 uppercase
              tracking-wide mb-2 px-1">
              {col.name} ({colCards.length})
            </h3>
            <div className="space-y-1">
              {colCards.map((card) => (
                <div key={card.id}
                  onClick={() => setSelectedCard(card.id)}
                  className="flex items-center gap-3 p-2.5 bg-white border
                    rounded-lg hover:shadow-sm cursor-pointer transition-shadow">
                  <span className={`px-1.5 py-0.5 rounded text-xs
                    ${priorityColors[card.priority]}`}>
                    {priorityLabels[card.priority]}
                  </span>
                  <span className="text-sm flex-1">{card.title}</span>
                  {isOverdue(card) && (
                    <span className="text-xs text-red-500 font-medium">기한초과</span>
                  )}
                  {card.due_date && (
                    <span className={`text-xs ${isOverdue(card) ? 'text-red-400' : 'text-gray-400'}`}>
                      {card.due_date.split('T')[0]}
                    </span>
                  )}
                </div>
              ))}
              {colCards.length === 0 && (
                <p className="text-xs text-gray-400 px-2 py-1">업무 없음</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
