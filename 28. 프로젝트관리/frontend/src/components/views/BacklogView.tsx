import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { useUiStore } from '@/stores/uiStore';

export function BacklogView({ projectId, cards }: { projectId: string; cards: any[] }) {
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [goal, setGoal] = useState('');
  const queryClient = useQueryClient();
  const setSelectedCard = useUiStore((s) => s.setSelectedCard);

  const { data: sprints } = useQuery<any[]>({
    queryKey: ['sprints', projectId],
    queryFn: () => apiClient(`/projects/${projectId}/sprints`),
  });

  const createSprint = useMutation({
    mutationFn: () => apiClient(`/projects/${projectId}/sprints`, {
      method: 'POST', body: JSON.stringify({ name, goal }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sprints', projectId] });
      setName(''); setGoal(''); setShowCreate(false);
    },
  });

  const updateSprint = useMutation({
    mutationFn: ({ id, status }: any) => apiClient(`/sprints/${id}`, {
      method: 'PUT', body: JSON.stringify({ status }),
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sprints', projectId] }),
  });

  const assignCard = useMutation({
    mutationFn: ({ cardId, sprintId }: any) => apiClient(`/cards/${cardId}/sprint`, {
      method: 'PUT', body: JSON.stringify({ sprint_id: sprintId }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['board', projectId] });
      queryClient.invalidateQueries({ queryKey: ['sprints', projectId] });
    },
  });

  const backlogCards = cards.filter((c) => !c.sprint_id && !c._isSubtask);

  return (
    <div className="p-4 h-full overflow-y-auto space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-sm font-semibold">스프린트 & 백로그</h2>
        <button onClick={() => setShowCreate(true)}
          className="px-3 py-1 bg-blue-500 text-white rounded text-xs">
          + 스프린트 생성
        </button>
      </div>

      {showCreate && (
        <div className="bg-gray-50 border rounded p-3 space-y-2">
          <input type="text" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="스프린트 이름 (예: Sprint 1)"
            className="w-full border rounded px-2 py-1 text-sm" />
          <input type="text" value={goal} onChange={(e) => setGoal(e.target.value)}
            placeholder="스프린트 목표"
            className="w-full border rounded px-2 py-1 text-sm" />
          <div className="flex gap-2">
            <button onClick={() => name && createSprint.mutate()}
              className="px-3 py-1 bg-blue-500 text-white rounded text-xs">생성</button>
            <button onClick={() => setShowCreate(false)}
              className="px-3 py-1 border rounded text-xs">취소</button>
          </div>
        </div>
      )}

      {/* 스프린트 목록 */}
      {sprints?.map((sprint: any) => {
        const sprintCards = cards.filter((c) => c.sprint_id === sprint.id && !c._isSubtask);
        const progress = sprint.card_count > 0
          ? Math.round((sprint.done_count / sprint.card_count) * 100) : 0;
        return (
          <div key={sprint.id} className="bg-white border rounded-lg p-3">
            <div className="flex justify-between items-center mb-2">
              <div>
                <span className="text-sm font-medium">{sprint.name}</span>
                <span className={`ml-2 text-xs px-1.5 py-0.5 rounded
                  ${sprint.status === 'active' ? 'bg-green-100 text-green-700' :
                    sprint.status === 'completed' ? 'bg-gray-100 text-gray-600' :
                    'bg-blue-100 text-blue-700'}`}>
                  {sprint.status === 'active' ? '진행중' :
                   sprint.status === 'completed' ? '완료' : '계획'}
                </span>
                {sprint.goal && <p className="text-xs text-gray-400 mt-0.5">{sprint.goal}</p>}
              </div>
              <div className="flex gap-1">
                {sprint.status === 'planned' && (
                  <button onClick={() => updateSprint.mutate({ id: sprint.id, status: 'active' })}
                    className="text-xs px-2 py-0.5 bg-green-500 text-white rounded">시작</button>
                )}
                {sprint.status === 'active' && (
                  <button onClick={() => updateSprint.mutate({ id: sprint.id, status: 'completed' })}
                    className="text-xs px-2 py-0.5 bg-gray-500 text-white rounded">완료</button>
                )}
              </div>
            </div>
            {/* 진행률 */}
            <div className="flex items-center gap-2 mb-2">
              <div className="flex-1 bg-gray-100 rounded-full h-2">
                <div className="bg-green-500 h-2 rounded-full"
                  style={{ width: `${progress}%` }} />
              </div>
              <span className="text-xs text-gray-500">
                {sprint.done_count}/{sprint.card_count}
              </span>
            </div>
            {/* 카드 목록 */}
            <div className="space-y-1">
              {sprintCards.map((c) => (
                <div key={c.id}
                  className="flex items-center gap-2 text-xs p-1.5 bg-gray-50 rounded">
                  <span onClick={() => setSelectedCard(c.id)}
                    className="flex-1 cursor-pointer hover:text-blue-500">{c.title}</span>
                  <button onClick={() => assignCard.mutate({ cardId: c.id, sprintId: null })}
                    className="text-gray-400 hover:text-red-500">제거</button>
                </div>
              ))}
            </div>
          </div>
        );
      })}

      {/* 백로그 */}
      <div className="bg-white border rounded-lg p-3">
        <h3 className="text-sm font-medium mb-2">백로그 ({backlogCards.length})</h3>
        <div className="space-y-1">
          {backlogCards.map((c) => (
            <div key={c.id}
              className="flex items-center gap-2 text-xs p-1.5 bg-gray-50 rounded">
              <span onClick={() => setSelectedCard(c.id)}
                className="flex-1 cursor-pointer hover:text-blue-500">{c.title}</span>
              {sprints && sprints.length > 0 && (
                <select onChange={(e) => e.target.value &&
                    assignCard.mutate({ cardId: c.id, sprintId: e.target.value })}
                  className="border rounded px-1 py-0.5 text-xs" defaultValue="">
                  <option value="">스프린트 배정</option>
                  {sprints.filter((s) => s.status !== 'completed').map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              )}
            </div>
          ))}
          {backlogCards.length === 0 && (
            <p className="text-xs text-gray-400">백로그가 비어있습니다</p>
          )}
        </div>
      </div>
    </div>
  );
}
