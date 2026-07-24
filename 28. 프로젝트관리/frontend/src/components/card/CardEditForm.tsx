import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { RichEditor } from '@/components/common/RichEditor';

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
  const [recurType, setRecurType] = useState('none');
  const [recurId, setRecurId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: members } = useQuery<any[]>({
    queryKey: ['members', projectId],
    queryFn: () => apiClient(`/projects/${projectId}/members`),
  });

  // 이 카드와 연결된 반복 규칙 찾기
  useQuery<any[]>({
    queryKey: ['recurring', projectId],
    queryFn: async () => {
      const list: any[] = await apiClient(`/projects/${projectId}/recurring`);
      const matched = list.find((r) => r.title === card.title);
      if (matched) {
        setRecurId(matched.id);
        setRecurType(matched.recur_type);
      }
      return list;
    },
  });

  const saveRecur = useMutation({
    mutationFn: () => {
      if (recurId) {
        // 기존 규칙 수정 (비활성화 or 타입 변경)
        return apiClient(`/recurring/${recurId}`, {
          method: 'PUT',
          body: JSON.stringify({ is_active: recurType !== 'none' }),
        });
      } else if (recurType !== 'none' && dueDate) {
        // 신규 규칙 생성
        return apiClient(`/projects/${projectId}/recurring`, {
          method: 'POST',
          body: JSON.stringify({
            column_id: card.column_id, title, description,
            priority, assignee_id: assigneeId || null, tags: [],
            recur_type: recurType, recur_interval: 1,
            next_run: dueDate.split('T')[0],
          }),
        });
      }
      return Promise.resolve();
    },
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

  async function handleSave() {
    await saveRecur.mutateAsync();
    queryClient.invalidateQueries({ queryKey: ['recurring', projectId] });
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
        <RichEditor value={description} onChange={setDescription}
          placeholder="설명을 입력하세요..." minHeight={100} />
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
      <div>
        <label className="text-xs text-gray-500">🔁 반복</label>
        <select value={recurType}
          onChange={(e) => setRecurType(e.target.value)}
          className="w-full border rounded px-2 py-1 text-xs">
          <option value="none">반복 안함</option>
          <option value="daily">매일</option>
          <option value="weekly">매주</option>
          <option value="monthly">매월</option>
          <option value="yearly">매년</option>
          <option value="weekday">주중 매일(월-금)</option>
        </select>
        {recurId && (
          <p className="text-xs text-blue-500 mt-1">기존 반복 규칙과 연결됨</p>
        )}
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
