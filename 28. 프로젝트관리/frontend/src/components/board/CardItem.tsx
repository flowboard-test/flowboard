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
  };
}

const priorityColors: Record<string, string> = {
  urgent: 'border-l-red-500',
  high: 'border-l-orange-400',
  normal: 'border-l-blue-400',
  low: 'border-l-gray-300',
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
      className={`bg-white rounded-md p-3 shadow-sm border-l-4
        cursor-pointer hover:shadow-md transition-shadow
        ${priorityColors[card.priority] || 'border-l-gray-300'}
        ${isDragging ? 'opacity-50 rotate-1 shadow-lg' : ''}`}>
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
      </div>
    </div>
  );
}
