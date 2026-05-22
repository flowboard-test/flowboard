import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { useUiStore } from '@/stores/uiStore';
import { useBoardStore } from '@/stores/boardStore';
import { useRealtime } from '@/hooks/useRealtime';
import { BoardView } from '@/components/board/BoardView';
import { ListView } from '@/components/views/ListView';
import { GanttView } from '@/components/views/GanttView';
import { CalendarView } from '@/components/views/CalendarView';
import { DashboardView } from '@/components/dashboard/DashboardView';
import { CardDetailPanel } from '@/components/card/CardDetailPanel';
import { WorkflowSetup } from '@/components/board/WorkflowSetup';
import { useEffect, useState } from 'react';

export function ProjectPage() {
  const { id } = useParams<{ id: string }>();
  const viewMode = useUiStore((s) => s.viewMode);
  const setViewMode = useUiStore((s) => s.setViewMode);
  const selectedCardId = useUiStore((s) => s.selectedCardId);
  const setColumns = useBoardStore((s) => s.setColumns);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState('');
  const queryClient = useQueryClient();

  useRealtime(id || null);

  const { data: project } = useQuery<any>({
    queryKey: ['project', id],
    queryFn: () => apiClient(`/projects/${id}`),
    enabled: !!id,
  });

  const { data: board, isLoading } = useQuery<any>({
    queryKey: ['board', id],
    queryFn: () => apiClient(`/projects/${id}/board`),
    enabled: !!id,
  });

  const { data: dashboard } = useQuery<any>({
    queryKey: ['dashboard', id],
    queryFn: () => apiClient(`/projects/${id}/dashboard`),
    enabled: !!id && viewMode === 'dashboard',
  });

  const { data: members } = useQuery<any[]>({
    queryKey: ['members', id],
    queryFn: () => apiClient(`/projects/${id}/members`),
    enabled: !!id && viewMode === 'dashboard',
  });

  const renameProject = useMutation({
    mutationFn: (name: string) =>
      apiClient(`/projects/${id}`, {
        method: 'PUT',
        body: JSON.stringify({ name }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setIsEditingName(false);
    },
  });

  useEffect(() => {
    if (board?.columns) {
      setColumns(board.columns);
    }
  }, [board, setColumns]);

  if (isLoading) {
    return <div className="p-6 text-gray-500">로딩 중...</div>;
  }

  const views = [
    { key: 'board', label: '보드' },
    { key: 'list', label: '리스트' },
    { key: 'gantt', label: '간트' },
    { key: 'calendar', label: '캘린더' },
    { key: 'dashboard', label: '대시보드' },
  ] as const;

  const allCards = board?.columns?.flatMap((col: any) =>
    col.cards.flatMap((card: any) => [
      { ...card, column_name: col.name },
      ...(card.subtasks || []).map((sub: any) => ({
        ...sub,
        column_name: col.name,
        _isSubtask: true,
        _parentTitle: card.title,
      })),
    ])
  ) || [];

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-2 px-4 py-2 border-b bg-white">
        {isEditingName ? (
          <div className="flex items-center gap-2 mr-4">
            <input type="text" value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && editName.trim()) renameProject.mutate(editName);
                if (e.key === 'Escape') setIsEditingName(false);
              }}
              autoFocus
              className="border rounded px-2 py-1 text-sm font-semibold w-48" />
            <button onClick={() => editName.trim() && renameProject.mutate(editName)}
              className="text-xs text-blue-500">저장</button>
            <button onClick={() => setIsEditingName(false)}
              className="text-xs text-gray-400">취소</button>
          </div>
        ) : (
          <h2 className="font-semibold text-sm mr-4 cursor-pointer
            hover:text-blue-600"
            onClick={() => { setEditName(project?.name || ''); setIsEditingName(true); }}
            title="클릭하여 프로젝트명 수정">
            {project?.name || board?.name}
          </h2>
        )}
        {views.map((v) => (
          <button key={v.key}
            onClick={() => setViewMode(v.key as any)}
            className={`px-3 py-1 rounded text-xs
              ${viewMode === v.key
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
            {v.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden">
        {viewMode === 'board' && <BoardView />}
        {viewMode === 'list' && (
          <ListView cards={allCards} columns={board?.columns || []} />
        )}
        {viewMode === 'gantt' && <GanttView cards={allCards} />}
        {viewMode === 'calendar' && <CalendarView cards={allCards} />}
        {viewMode === 'dashboard' && (
          <DashboardView data={dashboard} cards={allCards} members={members || []} />
        )}
      </div>

      {selectedCardId && (
        <CardDetailPanel cardId={selectedCardId} projectId={id!} />
      )}

      {viewMode === 'board' && board?.columns && (
        <WorkflowSetup projectId={id!} columns={board.columns} />
      )}
    </div>
  );
}
