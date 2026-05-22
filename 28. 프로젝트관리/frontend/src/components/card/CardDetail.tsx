import { useUiStore } from '@/stores/uiStore';

interface CardDetailProps {
  card: {
    id: string;
    title: string;
    description: string | null;
    priority: string;
    assignee_id: string | null;
    due_date: string | null;
    tags: string[];
    version: number;
  };
  transfers: Array<{
    id: string;
    from_user_name: string;
    to_user_name: string;
    resolution_type: string;
    comment: string | null;
    created_at: string;
  }>;
}

export function CardDetail({ card, transfers }: CardDetailProps) {
  const setSelectedCard = useUiStore((s) => s.setSelectedCard);
  const openTransferDialog = useUiStore((s) => s.openTransferDialog);

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-white shadow-xl
      border-l overflow-y-auto z-40">
      <div className="p-4 border-b flex justify-between items-center">
        <h2 className="font-semibold text-lg truncate">{card.title}</h2>
        <button onClick={() => setSelectedCard(null)}
          className="text-gray-400 hover:text-gray-600">✕</button>
      </div>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-gray-500">우선순위</span>
            <p className="font-medium">{card.priority}</p>
          </div>
          <div>
            <span className="text-gray-500">마감일</span>
            <p className="font-medium">{card.due_date || '-'}</p>
          </div>
        </div>

        {card.description && (
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">설명</h3>
            <p className="text-sm whitespace-pre-wrap">{card.description}</p>
          </div>
        )}

        {card.tags.length > 0 && (
          <div className="flex gap-1 flex-wrap">
            {card.tags.map((tag) => (
              <span key={tag}
                className="px-2 py-0.5 bg-gray-100 rounded text-xs">{tag}</span>
            ))}
          </div>
        )}

        <button onClick={openTransferDialog}
          className="w-full py-2 bg-blue-500 text-white rounded-md text-sm
            hover:bg-blue-600 transition-colors">
          내 업무 완료 + 이관하기
        </button>

        {/* 이관 타임라인 */}
        {transfers.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">
              이관 이력
            </h3>
            <div className="space-y-3">
              {transfers.map((t) => (
                <div key={t.id} className="border-l-2 border-blue-200 pl-3">
                  <p className="text-xs text-gray-500">{t.created_at}</p>
                  <p className="text-sm">
                    {t.from_user_name} → {t.to_user_name}
                  </p>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100">
                    {t.resolution_type}
                  </span>
                  {t.comment && (
                    <p className="text-xs text-gray-600 mt-1">{t.comment}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
