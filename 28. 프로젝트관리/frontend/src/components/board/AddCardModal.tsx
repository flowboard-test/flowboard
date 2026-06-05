import { useState } from 'react';
import { apiClient } from '@/api/client';
import { useQueryClient } from '@tanstack/react-query';

interface AddCardModalProps {
  columns: Array<{ id: string; name: string }>;
  projectId: string;
  onClose: () => void;
}

export function AddCardModal({ columns, projectId, onClose }: AddCardModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('normal');
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [attachFile, setAttachFile] = useState<File | null>(null);
  const queryClient = useQueryClient();

  // "할 일" 컬럼 찾기
  const todoCol = columns.find((c) => c.name === '할 일');
  const targetColId = todoCol?.id || columns[0]?.id;

  async function handleSubmit() {
    if (!title.trim() || !targetColId) return;
    const res: any = await apiClient(`/columns/${targetColId}/cards`, {
      method: 'POST',
      body: JSON.stringify({
        title, description: description || undefined,
        priority,
        start_date: startDate || undefined,
        due_date: dueDate || undefined,
      }),
    });
    if (attachFile && res?.id) {
      const reader = new FileReader();
      reader.onload = async () => {
        await apiClient(`/cards/${res.id}/attachments`, {
          method: 'POST',
          body: JSON.stringify({
            file_name: attachFile.name,
            file_size: attachFile.size,
            mime_type: attachFile.type,
            file_data: reader.result as string,
          }),
        });
        queryClient.invalidateQueries({ queryKey: ['board', projectId] });
      };
      reader.readAsDataURL(attachFile);
    }
    queryClient.invalidateQueries({ queryKey: ['board', projectId] });
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}>
      <div className="bg-white rounded-lg w-[440px] p-5 space-y-3"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center">
          <h2 className="text-sm font-semibold">새 카드 추가</h2>
          <button onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <input type="text" value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="카드 제목 *" autoFocus
          className="w-full border rounded px-3 py-2 text-sm" />
        <textarea value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="본문 내용 (선택)" rows={4}
          className="w-full border rounded px-3 py-2 text-sm resize-none" />
        <select value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="w-full border rounded px-3 py-2 text-sm">
          <option value="urgent">긴급</option>
          <option value="high">높음</option>
          <option value="normal">보통</option>
          <option value="low">낮음</option>
        </select>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-gray-500">시작일</label>
            <input type="datetime-local" value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full border rounded px-2 py-1 text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-500">종료일</label>
            <input type="datetime-local" value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full border rounded px-2 py-1 text-sm" />
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-500">첨부파일</label>
          <input type="file"
            onChange={(e) => setAttachFile(e.target.files?.[0] || null)}
            className="w-full text-sm mt-1" />
          {attachFile && (
            <span className="text-xs text-blue-500">{attachFile.name}</span>
          )}
        </div>
        <div className="flex justify-center gap-2 pt-2">
          <button onClick={handleSubmit}
            disabled={!title.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded text-sm
              hover:bg-blue-600 disabled:opacity-50">추가</button>
          <button onClick={onClose}
            className="px-4 py-2 border rounded text-sm hover:bg-gray-50">취소</button>
        </div>
      </div>
    </div>
  );
}
