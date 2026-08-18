import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useUiStore } from '@/stores/uiStore';

interface CardItemProps {
  card: {
    id: string;
    title: string;
    priority: string;
    assignee_id: string | null;
    due_date: string | null;
    task_mode?: string;
  };
}

const priorityColors: Record<string, string> = {
  urgent: 'border-l-4 border-l-red-500 bg-red-50/30',
  high: 'border-l-4 border-l-orange-400 bg-orange-50/30',
  normal: 'border-l-4 border-l-blue-400',
  low: 'border-l-4 border-l-gray-300',
};

const priorityLabels: Record<string, string> = {
  urgent: '긴급',
  high: '높음',
  normal: '보통',
  low: '낮음',
};

export function CardItem({ card }: CardItemProps) {
  const {
    attributes, listeners, setNodeRef,
    transform, transition, isDragging,
  } = useSortable({ id: card.id });
  const setSelectedCard = useUiStore((s) => s.setSelectedCard);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}
      onClick={() => setSelectedCard(card.id)}
      className={`bg-white rounded-xl p-3 border border-gray-100
        cursor-pointer hover:shadow-md hover:border-gray-200 transition-all hover:-translate-y-0.5
        ${(card as any).task_mode === 'shared'
          ? 'border-l-4 border-l-violet-400 bg-violet-50/20'
          : priorityColors[card.priority] || 'border-l-4 border-l-gray-300'}
        ${isDragging ? 'opacity-50 rotate-1 shadow-lg' : ''}`}>
      <div className="flex items-center justify-between mb-1">
        {(card as any).issue_key ? (
          <span className="text-[10px] text-gray-400 font-mono">{(card as any).issue_key}</span>
        ) : <span />}
        {(card as any).task_mode === 'shared' ? (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full
            bg-violet-100 text-violet-700 font-medium">👥 공동</span>
        ) : (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full
            bg-sky-100 text-sky-700 font-medium">🔄 순차</span>
        )}
      </div>
      <p className="text-sm font-medium">{card.title}</p>
      <div className="flex items-center gap-2 mt-2">
        <span className={`text-xs px-1.5 py-0.5 rounded
          ${card.priority === 'urgent' ? 'bg-red-100 text-red-700' :
            card.priority === 'high' ? 'bg-orange-100 text-orange-700' :
            'bg-gray-100 text-gray-600'}`}>
          {priorityLabels[card.priority] || '보통'}
        </span>
        {card.due_date && (
          <span className="text-xs text-gray-500">
            {card.due_date.split('T')[0]}
          </span>
        )}
        {(card as any).view_count > 0 && (
          <span className="text-xs text-gray-400 ml-auto">
            👁 {(card as any).view_count}
          </span>
        )}
      </div>
    </div>
  );
}
