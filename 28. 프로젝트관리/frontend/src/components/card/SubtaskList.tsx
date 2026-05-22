import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { SubtaskEditModal } from './SubtaskEditModal';

interface SubtaskListProps {
  cardId: string;
  projectId: string;
}

export function SubtaskList({ cardId, projectId }: SubtaskListProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingSub, setEditingSub] = useState<any>(null);
  const [title, setTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [priority, setPriority] = useState('normal');
  const queryClient = useQueryClient();

  const { data: subtasks } = useQuery<any[]>({
    queryKey: ['subtasks', cardId],
    queryFn: () => apiClient(`/cards/${cardId}/subtasks`),
  });

  const { data: members } = useQuery<any[]>({
    queryKey: ['members', projectId],
    queryFn: () => apiClient(`/projects/${projectId}/members`),
    enabled: isAdding,
  });

  const addMutation = useMutation({
    mutationFn: (data: any) =>
      apiClient(`/cards/${cardId}/subtasks`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subtasks', cardId] });
      queryClient.invalidateQueries({ queryKey: ['board', projectId] });
      resetForm();
    },
  });

  function resetForm() {
    setTitle('');
    setStartDate('');
    setDueDate('');
    setAssigneeId('');
    setPriority('normal');
    setIsAdding(false);
  }

  function handleAdd() {
    if (!title.trim()) return;
    addMutation.mutate({
      title,
      priority,
      start_date: startDate || undefined,
      due_date: dueDate || undefined,
      assignee_id: assigneeId || undefined,
    });
  }

  const completedCount = subtasks?.filter(
    (s) => s.status === 'done'
  ).length || 0;
  const totalCount = subtasks?.length || 0;

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-xs font-medium text-gray-500">
          하위 업무 ({completedCount}/{totalCount})
        </h3>
        <button onClick={() => setIsAdding(true)}
          className="text-xs text-blue-500">+ 추가</button>
      </div>

      {subtasks && subtasks.length > 0 && (
        <div className="space-y-1.5">
          {subtasks.map((sub: any) => (
            <div key={sub.id}
              onClick={() => setEditingSub(sub)}
              className="p-2 rounded bg-gray-50 border text-xs cursor-pointer
                hover:bg-gray-100">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full
                  ${sub.status === 'done' ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className={`flex-1 ${sub.status === 'done'
                  ? 'line-through text-gray-400' : ''}`}>
                  {sub.title}
                </span>
                <span className="text-gray-400">{sub.priority}</span>
              </div>
              {(sub.start_date || sub.due_date || sub.assignee_id) && (
                <div className="flex gap-2 mt-1 text-gray-400 pl-4">
                  {sub.start_date && <span>시작: {sub.start_date.split('T')[0]}</span>}
                  {sub.due_date && <span>종료: {sub.due_date.split('T')[0]}</span>}
                  {sub.assignee_id && <span>담당자 지정됨</span>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {isAdding && (
        <div className="mt-2 space-y-2 bg-gray-50 rounded p-2 border">
          <input type="text" value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="하위 업무 제목" autoFocus
            className="w-full border rounded px-2 py-1 text-xs" />
          <select value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="w-full border rounded px-2 py-1 text-xs">
            <option value="urgent">긴급</option>
            <option value="high">높음</option>
            <option value="normal">보통</option>
            <option value="low">낮음</option>
          </select>
          <select value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
            className="w-full border rounded px-2 py-1 text-xs">
            <option value="">담당자 선택</option>
            {members?.map((m: any) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-1">
            <div>
              <label className="text-xs text-gray-500">시작일</label>
              <input type="datetime-local" value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border rounded px-1 py-0.5 text-xs" />
            </div>
            <div>
              <label className="text-xs text-gray-500">종료일</label>
              <input type="datetime-local" value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full border rounded px-1 py-0.5 text-xs" />
            </div>
          </div>
          <div className="flex gap-1">
            <button onClick={handleAdd}
              className="px-2 py-1 bg-blue-500 text-white rounded text-xs">
              추가</button>
            <button onClick={resetForm}
              className="px-2 py-1 border rounded text-xs">취소</button>
          </div>
        </div>
      )}

      {editingSub && (
        <SubtaskEditModal
          subtask={editingSub}
          projectId={projectId}
          parentCardId={cardId}
          onClose={() => setEditingSub(null)}
        />
      )}
    </div>
  );
}
