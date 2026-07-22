import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

export function WorkLogSection({ cardId }: { cardId: string }) {
  const [hours, setHours] = useState('');
  const [comment, setComment] = useState('');
  const [show, setShow] = useState(false);
  const queryClient = useQueryClient();

  const { data: logs } = useQuery<any[]>({
    queryKey: ['worklogs', cardId],
    queryFn: () => apiClient(`/cards/${cardId}/worklogs`),
  });

  const addLog = useMutation({
    mutationFn: () => apiClient(`/cards/${cardId}/worklogs`, {
      method: 'POST',
      body: JSON.stringify({ hours: parseFloat(hours), comment }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['worklogs', cardId] });
      setHours(''); setComment(''); setShow(false);
    },
  });

  const totalHours = logs?.reduce((sum, l) => sum + Number(l.hours), 0) || 0;

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-xs font-medium text-gray-500">
          작업 시간 (총 {totalHours}h)
        </h3>
        <button onClick={() => setShow(!show)}
          className="text-xs text-blue-500">+ 기록</button>
      </div>

      {show && (
        <div className="bg-gray-50 rounded p-2 space-y-2 mb-2">
          <div className="flex gap-2">
            <input type="number" value={hours}
              onChange={(e) => setHours(e.target.value)}
              placeholder="시간" step="0.5"
              className="border rounded px-2 py-1 text-xs w-20" />
            <input type="text" value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="작업 내용"
              className="border rounded px-2 py-1 text-xs flex-1" />
          </div>
          <button onClick={() => hours && addLog.mutate()}
            disabled={!hours}
            className="px-2 py-1 bg-blue-500 text-white rounded text-xs disabled:opacity-50">
            기록 추가
          </button>
        </div>
      )}
      {logs && logs.length > 0 && (
        <div className="space-y-1">
          {logs.map((l: any) => (
            <div key={l.id} className="flex gap-2 text-xs text-gray-600">
              <span className="font-medium">{l.hours}h</span>
              <span className="text-gray-400">{l.work_date}</span>
              <span>{l.user_name}</span>
              {l.comment && <span className="text-gray-500">- {l.comment}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
