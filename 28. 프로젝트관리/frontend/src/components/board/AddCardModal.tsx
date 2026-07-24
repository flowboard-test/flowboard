import { useState } from 'react';
import { apiClient } from '@/api/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { RichEditor } from '@/components/common/RichEditor';

interface AddCardModalProps {
  columns: Array<{ id: string; name: string }>;
  projectId: string;
  onClose: () => void;
}

export function AddCardModal({ columns, projectId, onClose }: AddCardModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [issueType, setIssueType] = useState('task');
  const [priority, setPriority] = useState('normal');
  const [assigneeId, setAssigneeId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [estimatedHours, setEstimatedHours] = useState('');
  const [labels, setLabels] = useState('');
  const [attachFiles, setAttachFiles] = useState<File[]>([]);
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);

  const { data: members } = useQuery<any[]>({
    queryKey: ['members', projectId],
    queryFn: () => apiClient(`/projects/${projectId}/members`),
  });

  const todoCol = columns.find((c) => c.name === '할 일');
  const targetColId = todoCol?.id || columns[0]?.id;

  async function handleSubmit() {
    if (!title.trim() || !targetColId) return;
    const tags = labels.split(',').map((l) => l.trim()).filter(Boolean);
    const res: any = await apiClient(`/columns/${targetColId}/cards`, {
      method: 'POST',
      body: JSON.stringify({
        title,
        description: description || undefined,
        priority,
        assignee_id: assigneeId || undefined,
        start_date: startDate || undefined,
        due_date: dueDate || undefined,
        tags,
      }),
    });
    // 첨부파일 업로드
    if (res?.id && attachFiles.length > 0) {
      for (const file of attachFiles) {
        const reader = new FileReader();
        reader.onload = async () => {
          await apiClient(`/cards/${res.id}/attachments`, {
            method: 'POST',
            body: JSON.stringify({
              file_name: file.name,
              file_size: file.size,
              mime_type: file.type,
              file_data: reader.result as string,
            }),
          });
        };
        reader.readAsDataURL(file);
      }
    }
    queryClient.invalidateQueries({ queryKey: ['board', projectId] });
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}>
      <div className="bg-white rounded-lg w-[600px] max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}>
        {/* 헤더 */}
        <div className="p-4 border-b flex justify-between items-center sticky top-0 bg-white">
          <h2 className="text-sm font-semibold">새 업무 생성</h2>
          <button onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        <div className="p-4 space-y-4">
          {/* 이슈 유형 + 제목 */}
          <div className="flex gap-2">
            <select value={issueType}
              onChange={(e) => setIssueType(e.target.value)}
              className="border rounded px-2 py-2 text-sm w-28 shrink-0">
              <option value="task">업무</option>
              <option value="bug">버그</option>
              <option value="feature">기능</option>
              <option value="improvement">개선</option>
              <option value="epic">에픽</option>
            </select>
            <input type="text" value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="제목을 입력하세요 *" autoFocus
              className="flex-1 border rounded px-3 py-2 text-sm" />
          </div>

          {/* 설명 */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">설명</label>
            <RichEditor value={description} onChange={setDescription}
              placeholder="업무에 대한 상세 설명을 입력하세요..."
              minHeight={140} />
          </div>

          {/* 2열 레이아웃 */}
          <div className="grid grid-cols-2 gap-4">
            {/* 우선순위 */}
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">우선순위</label>
              <select value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full border rounded px-2 py-2 text-sm">
                <option value="urgent">🔴 긴급</option>
                <option value="high">🟠 높음</option>
                <option value="normal">🔵 보통</option>
                <option value="low">⚪ 낮음</option>
              </select>
            </div>

            {/* 담당자 */}
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">담당자</label>
              <select value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full border rounded px-2 py-2 text-sm">
                <option value="">미지정</option>
                {members?.map((m: any) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            {/* 시작일 */}
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">시작일</label>
              <input type="datetime-local" value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border rounded px-2 py-2 text-sm" />
            </div>

            {/* 종료일 */}
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">마감일</label>
              <input type="datetime-local" value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full border rounded px-2 py-2 text-sm" />
            </div>

            {/* 예상 소요 시간 */}
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">예상 소요 (시간)</label>
              <input type="number" value={estimatedHours}
                onChange={(e) => setEstimatedHours(e.target.value)}
                placeholder="예: 8"
                className="w-full border rounded px-2 py-2 text-sm" />
            </div>

            {/* 보고자 */}
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">보고자</label>
              <input type="text" value={currentUser?.name || ''}
                readOnly
                className="w-full border rounded px-2 py-2 text-sm bg-gray-50" />
            </div>
          </div>

          {/* 라벨 */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">라벨 (쉼표 구분)</label>
            <input type="text" value={labels}
              onChange={(e) => setLabels(e.target.value)}
              placeholder="예: 프론트엔드, UI, 긴급수정"
              className="w-full border rounded px-3 py-2 text-sm" />
          </div>

          {/* 첨부파일 */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">첨부파일</label>
            <input type="file" multiple
              onChange={(e) => setAttachFiles(Array.from(e.target.files || []))}
              className="w-full text-sm" />
            {attachFiles.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {attachFiles.map((f, i) => (
                  <span key={i} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded">
                    📎 {f.name}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 하단 버튼 */}
        <div className="p-4 border-t flex justify-end gap-2 sticky bottom-0 bg-white">
          <button onClick={onClose}
            className="px-4 py-2 border rounded text-sm hover:bg-gray-50">취소</button>
          <button onClick={handleSubmit}
            disabled={!title.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded text-sm
              hover:bg-blue-600 disabled:opacity-50">생성</button>
        </div>
      </div>
    </div>
  );
}
