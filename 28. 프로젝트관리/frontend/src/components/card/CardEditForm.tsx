import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

interface CardEditFormProps {
  card: any;
  projectId: string;
  onClose: () => void;
}

export function CardEditForm({ card, projectId, onClose }: CardEditFormProps) {
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description || '');
  const [priority, setPriority] = useState(card.priority);
  const [startDate, setStartDate] = useState(card.start_date || '');
  const [dueDate, setDueDate] = useState(card.due_date || '');
  const [assigneeId, setAssigneeId] = useState(card.assignee_id || '');
  const queryClient = useQueryClient();

  const { data: members } = useQuery<any[]>({
    queryKey: ['members', projectId],
    queryFn: () => apiClient(`/projects/${projectId}/members`),
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) =>
      apiClient(`/cards/${card.id}`, {
        method: 'PUT',
        body: JSON.stringify({ ...data, version: card.version }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['card', card.id] });
      queryClient.invalidateQueries({ queryKey: ['board', projectId] });
      onClose();
    },
  });

  function handleSave() {
    updateMutation.mutate({
      title, description: description || null,
      priority, assignee_id: assigneeId || null,
      start_date: startDate || null,
      due_date: dueDate || null,
    });
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs text-gray-500">제목</label>
        <input type="text" value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full border rounded px-2 py-1 text-sm" />
      </div>
      <div>
        <label className="text-xs text-gray-500">설명</label>
        <textarea value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full border rounded px-2 py-1 text-sm h-16" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-gray-500">우선순위</label>
          <select value={priority}
            onChange={(e) => setPriority(e.target.value)}
            className="w-full border rounded px-2 py-1 text-xs">
            <option value="urgent">긴급</option>
            <option value="high">높음</option>
            <option value="normal">보통</option>
            <option value="low">낮음</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-gray-500">담당자</label>
          <select value={assigneeId}
            onChange={(e) => setAssigneeId(e.target.value)}
            className="w-full border rounded px-2 py-1 text-xs">
            <option value="">미지정</option>
            {members?.map((m: any) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
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
      <div className="flex gap-2">
        <button onClick={handleSave}
          className="px-3 py-1.5 bg-blue-500 text-white rounded text-xs
            hover:bg-blue-600">저장</button>
        <button onClick={onClose}
          className="px-3 py-1.5 border rounded text-xs">취소</button>
      </div>
      {updateMutation.isError && (
        <p className="text-xs text-red-500">
          저장 실패. 다시 시도해주세요.
        </p>
      )}
    </div>
  );
}
