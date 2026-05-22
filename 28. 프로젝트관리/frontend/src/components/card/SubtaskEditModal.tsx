import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

interface SubtaskEditModalProps {
  subtask: any;
  projectId: string;
  parentCardId: string;
  onClose: () => void;
}

export function SubtaskEditModal({
  subtask, projectId, parentCardId, onClose
}: SubtaskEditModalProps) {
  const [title, setTitle] = useState(subtask.title);
  const [priority, setPriority] = useState(subtask.priority);
  const [startDate, setStartDate] = useState(subtask.start_date || '');
  const [dueDate, setDueDate] = useState(subtask.due_date || '');
  const [assigneeId, setAssigneeId] = useState(subtask.assignee_id || '');
  const [status, setStatus] = useState(subtask.status);
  const queryClient = useQueryClient();

  const { data: members } = useQuery<any[]>({
    queryKey: ['members', projectId],
    queryFn: () => apiClient(`/projects/${projectId}/members`),
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) =>
      apiClient(`/cards/${subtask.id}`, {
        method: 'PUT',
        body: JSON.stringify({ ...data, version: subtask.version }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['subtasks', parentCardId] });
      queryClient.invalidateQueries({ queryKey: ['board', projectId] });
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center
      justify-center z-50">
      <div className="bg-white rounded-lg p-5 w-80">
        <h3 className="text-sm font-semibold mb-3">하위 업무 수정</h3>
        <div className="space-y-2">
          <input type="text" value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border rounded px-2 py-1 text-sm" />
          <div className="grid grid-cols-2 gap-2">
            <select value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="border rounded px-2 py-1 text-xs">
              <option value="urgent">긴급</option>
              <option value="high">높음</option>
              <option value="normal">보통</option>
              <option value="low">낮음</option>
            </select>
            <select value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="border rounded px-2 py-1 text-xs">
              <option value="todo">할 일</option>
              <option value="in_progress">진행 중</option>
              <option value="done">완료</option>
            </select>
          </div>
          <select value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
            className="w-full border rounded px-2 py-1 text-xs">
            <option value="">담당자 미지정</option>
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
          <div className="flex gap-2 justify-end pt-2">
            <button onClick={onClose}
              className="px-3 py-1 border rounded text-xs">취소</button>
            <button onClick={() => updateMutation.mutate({
              title, priority, status,
              assignee_id: assigneeId || null,
              start_date: startDate || null,
              due_date: dueDate || null,
            })}
              className="px-3 py-1 bg-blue-500 text-white rounded text-xs">
              저장</button>
          </div>
        </div>
      </div>
    </div>
  );
}
