import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CardItem } from './CardItem';

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
  const isOverLimit = column.wip_limit
    ? column.cards.length >= column.wip_limit
    : false;

  const columnColors: Record<string, string> = {
    '할 일': 'border-t-4 border-t-blue-400',
    '진행 중': 'border-t-4 border-t-yellow-400',
    '검토': 'border-t-4 border-t-purple-400',
    '완료': 'border-t-4 border-t-green-400',
  };

  return (
    <div ref={setNodeRef}
      className={`flex flex-col w-72 min-w-72 max-h-full bg-white rounded-lg shadow-sm
        ${columnColors[column.name] || 'border-t-4 border-t-gray-300'}
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
    </div>
  );
}
