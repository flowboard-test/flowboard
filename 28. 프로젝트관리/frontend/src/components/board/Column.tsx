import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CardItem } from './CardItem';
import { apiClient } from '@/api/client';
import { useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';

interface ColumnProps {
  column: {
    id: string;
    name: string;
    wip_limit: number | null;
    cards: Array<{
      id: string;
      title: string;
      priority: string;
      assignee_id: string | null;
      due_date: string | null;
      start_date: string | null;
      position: number;
    }>;
  };
}

export function ColumnComponent({ column }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('normal');
  const queryClient = useQueryClient();
  const { id: projectId } = useParams();
  const isOverLimit = column.wip_limit
    ? column.cards.length >= column.wip_limit
    : false;

  async function handleAddCard() {
    if (!newTitle.trim()) return;
    await apiClient(`/columns/${column.id}/cards`, {
      method: 'POST',
      body: JSON.stringify({
        title: newTitle,
        priority,
        start_date: startDate || undefined,
        due_date: dueDate || undefined,
      }),
    });
    setNewTitle('');
    setStartDate('');
    setDueDate('');
    setPriority('normal');
    setIsAdding(false);
    queryClient.invalidateQueries({ queryKey: ['board', projectId] });
  }

  return (
    <div ref={setNodeRef}
      className={`flex flex-col w-72 min-w-72 bg-gray-50 rounded-lg
        ${isOver ? 'ring-2 ring-blue-400' : ''}
        ${isOverLimit ? 'border-2 border-red-300' : ''}`}>
      <div className="flex items-center justify-between p-3 border-b">
        <h3 className="font-semibold text-sm">{column.name}</h3>
        <span className="text-xs text-gray-500">
          {column.cards.length}
          {column.wip_limit && ` / ${column.wip_limit}`}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        <SortableContext
          items={column.cards.map((c) => c.id)}
          strategy={verticalListSortingStrategy}>
          {column.cards.map((card) => (
            <CardItem key={card.id} card={card} />
          ))}
        </SortableContext>
      </div>
      <div className="p-2 border-t">
        {isAdding ? (
          <div className="space-y-2">
            <input type="text" value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddCard()}
              placeholder="카드 제목"
              autoFocus
              className="w-full border rounded px-2 py-1 text-sm" />
            <select value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full border rounded px-2 py-1 text-xs">
              <option value="urgent">긴급</option>
              <option value="high">높음</option>
              <option value="normal">보통</option>
              <option value="low">낮음</option>
            </select>
            <div className="grid grid-cols-2 gap-1">
              <div>
                <label className="text-xs text-gray-500">시작일</label>
                <input type="datetime-local" value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full border rounded px-1 py-0.5 text-xs" />
              </div>
              <div>
                <label className="text-xs text-gray-500">종료일</label>
                <input type="datetime-local" value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full border rounded px-1 py-0.5 text-xs" />
              </div>
            </div>
            <div className="flex gap-1">
              <button onClick={handleAddCard}
                className="px-2 py-1 bg-blue-500 text-white rounded text-xs">
                추가</button>
              <button onClick={() => setIsAdding(false)}
                className="px-2 py-1 border rounded text-xs">
                취소</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setIsAdding(true)}
            className="w-full text-left text-sm text-gray-500
              hover:text-gray-700 px-2 py-1">
            + 카드 추가
          </button>
        )}
      </div>
    </div>
  );
}
