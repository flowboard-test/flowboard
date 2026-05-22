import { useState } from 'react';
import { useUiStore } from '@/stores/uiStore';

interface TransferDialogProps {
  cardId: string;
  members: Array<{ id: string; name: string }>;
  onSubmit: (data: {
    toUserId: string;
    resolutionType: string;
    comment: string;
  }) => void;
}

export function TransferDialog({ cardId: _cardId, members, onSubmit }: TransferDialogProps) {
  const closeDialog = useUiStore((s) => s.closeTransferDialog);
  const [toUserId, setToUserId] = useState('');
  const [resolutionType, setResolutionType] = useState('completed');
  const [comment, setComment] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!toUserId) return;
    onSubmit({ toUserId, resolutionType, comment });
    closeDialog();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 max-w-full">
        <h2 className="text-lg font-semibold mb-4">업무 이관</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              다음 담당자
            </label>
            <select
              value={toUserId}
              onChange={(e) => setToUserId(e.target.value)}
              className="w-full border rounded-md p-2 text-sm"
            >
              <option value="">선택하세요</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              처리 결과
            </label>
            <div className="flex gap-2 flex-wrap">
              {['approved', 'completed', 'rejected', 'hold'].map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setResolutionType(type)}
                  className={`px-3 py-1 rounded-full text-xs border
                    ${resolutionType === type
                      ? 'bg-blue-500 text-white border-blue-500'
                      : 'bg-white text-gray-700 border-gray-300'}`}
                >
                  {type === 'approved' && '승인'}
                  {type === 'completed' && '완료'}
                  {type === 'rejected' && '반려'}
                  {type === 'hold' && '보류'}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">코멘트</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full border rounded-md p-2 text-sm h-20"
              placeholder="이관 사유를 입력하세요"
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={closeDialog}
              className="px-4 py-2 text-sm border rounded-md">취소</button>
            <button type="submit"
              className="px-4 py-2 text-sm bg-blue-500 text-white rounded-md">
              이관 완료
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
