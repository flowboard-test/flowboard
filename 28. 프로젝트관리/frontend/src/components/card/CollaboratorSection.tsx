import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

interface Props {
  cardId: string;
  members: any[];
}

export function CollaboratorSection({ cardId, members }: Props) {
  const [adding, setAdding] = useState(false);
  const queryClient = useQueryClient();

  const { data: collabs } = useQuery<any[]>({
    queryKey: ['collaborators', cardId],
    queryFn: () => apiClient(`/cards/${cardId}/collaborators`),
  });

  const addCollab = useMutation({
    mutationFn: (userId: string) => apiClient(`/cards/${cardId}/collaborators`, {
      method: 'POST', body: JSON.stringify({ user_id: userId }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['collaborators', cardId] });
      setAdding(false);
    },
  });

  const removeCollab = useMutation({
    mutationFn: (userId: string) =>
      apiClient(`/cards/${cardId}/collaborators/${userId}`, { method: 'DELETE' }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['collaborators', cardId] }),
  });

  const collabIds = (collabs || []).map((c: any) => c.user_id);
  const available = members.filter((m: any) => !collabIds.includes(m.id));

  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-gray-500 text-xs">참여자</span>
        <button onClick={() => setAdding(!adding)}
          className="text-xs text-blue-500">+ 추가</button>
      </div>
      <div className="flex flex-wrap gap-1">
        {collabs?.map((c: any) => (
          <span key={c.id}
            className="flex items-center gap-1 text-xs bg-gray-100 rounded-full px-2 py-0.5">
            <span className="w-4 h-4 rounded-full bg-blue-200 flex items-center
              justify-center text-[10px]">{c.name?.charAt(0)}</span>
            {c.name}
            <button onClick={() => removeCollab.mutate(c.user_id)}
              className="text-gray-400 hover:text-red-500">✕</button>
          </span>
        ))}
        {(!collabs || collabs.length === 0) && !adding && (
          <span className="text-xs text-gray-400">참여자 없음</span>
        )}
      </div>
      {adding && (
        <select
          onChange={(e) => e.target.value && addCollab.mutate(e.target.value)}
          className="mt-1 w-full border rounded px-2 py-1 text-xs" defaultValue="">
          <option value="">직원 선택...</option>
          {available.map((m: any) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      )}
    </div>
  );
}
