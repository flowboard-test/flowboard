import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

const linkTypeLabels: Record<string, string> = {
  blocks: '차단함',
  blocked_by: '차단됨',
  relates: '관련됨',
  duplicates: '중복됨',
};

export function CardLinkSection({ cardId, projectCards }: {
  cardId: string;
  projectCards: any[];
}) {
  const [show, setShow] = useState(false);
  const [linkType, setLinkType] = useState('relates');
  const [targetId, setTargetId] = useState('');
  const queryClient = useQueryClient();

  const { data: links } = useQuery<any[]>({
    queryKey: ['links', cardId],
    queryFn: () => apiClient(`/cards/${cardId}/links`),
  });

  const addLink = useMutation({
    mutationFn: () => apiClient(`/cards/${cardId}/links`, {
      method: 'POST',
      body: JSON.stringify({ target_card_id: targetId, link_type: linkType }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['links', cardId] });
      setTargetId(''); setShow(false);
    },
  });

  const deleteLink = useMutation({
    mutationFn: (linkId: string) =>
      apiClient(`/cards/${cardId}/links/${linkId}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['links', cardId] }),
  });

  const candidates = projectCards.filter((c) => c.id !== cardId);

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-xs font-medium text-gray-500">연결된 이슈</h3>
        <button onClick={() => setShow(!show)}
          className="text-xs text-blue-500">+ 연결</button>
      </div>
      {show && (
        <div className="bg-gray-50 rounded p-2 space-y-2 mb-2">
          <select value={linkType}
            onChange={(e) => setLinkType(e.target.value)}
            className="border rounded px-2 py-1 text-xs w-full">
            <option value="blocks">차단함</option>
            <option value="blocked_by">차단됨</option>
            <option value="relates">관련됨</option>
            <option value="duplicates">중복됨</option>
          </select>
          <select value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            className="border rounded px-2 py-1 text-xs w-full">
            <option value="">이슈 선택</option>
            {candidates.map((c) => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
          <button onClick={() => targetId && addLink.mutate()}
            disabled={!targetId}
            className="px-2 py-1 bg-blue-500 text-white rounded text-xs disabled:opacity-50">
            연결 추가
          </button>
        </div>
      )}
      {links && links.length > 0 && (
        <div className="space-y-1">
          {links.map((l: any) => (
            <div key={l.id} className="flex items-center gap-2 text-xs">
              <span className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">
                {linkTypeLabels[l.link_type]}
              </span>
              <span className="flex-1 truncate">{l.target_title}</span>
              {l.target_status === 'done' && (
                <span className="text-green-600">✓</span>
              )}
              <button onClick={() => deleteLink.mutate(l.id)}
                className="text-red-400 hover:text-red-600">✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
