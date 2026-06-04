import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CardItem } from './CardItem';
import { apiClient } from '@/api/client';
import { useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';

interface ColumnProps {
  column: {
    id: string;
    name: string;
    wip_limit: number | null;
    cards: Array<{
      id: string;
      title: string;
      priority: string;
      assignee_id: string | null;
      due_date: string | null;
      start_date: string | null;
      position: number;
    }>;
  };
}

export function ColumnComponent({ column }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [startDate, setStartDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('normal');
  const [description, setDescription] = useState('');
  const [attachFile, setAttachFile] = useState<File | null>(null);
  const queryClient = useQueryClient();
  const { id: projectId } = useParams();
  const isOverLimit = column.wip_limit
    ? column.cards.length >= column.wip_limit
    : false;

  async function handleAddCard() {
    if (!newTitle.trim()) return;
    const res: any = await apiClient(`/columns/${column.id}/cards`, {
      method: 'POST',
      body: JSON.stringify({
        title: newTitle,
        description: description || undefined,
        priority,
        start_date: startDate || undefined,
        due_date: dueDate || undefined,
      }),
    });
    // 첨부파일이 있으면 업로드
    if (attachFile && res?.id) {
      await apiClient(`/cards/${res.id}/attachments`, {
        method: 'POST',
        body: JSON.stringify({
          file_name: attachFile.name,
          file_size: attachFile.size,
          mime_type: attachFile.type,
        }),
      });
    }
    setNewTitle('');
    setDescription('');
    setAttachFile(null);
    setStartDate('');
    setDueDate('');
    setPriority('normal');
    setIsAdding(false);
    queryClient.invalidateQueries({ queryKey: ['board', projectId] });
  }

  return (
    <div ref={setNodeRef}
      className={`flex flex-col w-72 min-w-72 max-h-full bg-gray-50 rounded-lg
        ${isOver ? 'ring-2 ring-blue-400' : ''}
        ${isOverLimit ? 'border-2 border-red-300' : ''}`}>
      <div className="flex items-center justify-between p-3 border-b">
        <h3 className="font-semibold text-sm">{column.name}</h3>
        <span className="text-xs text-gray-500">
          {column.cards.length}
          {column.wip_limit && ` / ${column.wip_limit}`}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        <SortableContext
          items={column.cards.map((c) => c.id)}
          strategy={verticalListSortingStrategy}>
          {column.cards.map((card) => (
            <CardItem key={card.id} card={card} />
          ))}
        </SortableContext>
      </div>
      <div className="p-2 border-t">
        {column.name === '할 일' && (
          <button onClick={() => setIsAdding(true)}
            className="w-full text-left text-sm text-gray-500
              hover:text-gray-700 px-2 py-1">
            + 카드 추가
          </button>
        )}
      </div>

      {/* 카드 생성 팝업 */}
      {isAdding && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-[420px] p-5 space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-semibold">새 카드 추가 - {column.name}</h2>
              <button onClick={() => setIsAdding(false)}
                className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <input type="text" value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddCard()}
              placeholder="카드 제목 *" autoFocus
              className="w-full border rounded px-3 py-2 text-sm" />
            <div className="border rounded overflow-hidden">
              <ReactQuill value={description}
                onChange={setDescription}
                placeholder="본문 내용 (선택)"
                theme="snow"
                style={{ height: '120px' }}
                modules={{ toolbar: [
                  ['bold', 'italic', 'underline'],
                  [{ list: 'ordered' }, { list: 'bullet' }],
                  ['link'],
                ] }} />
            </div>
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
              <button onClick={handleAddCard}
                className="px-4 py-2 bg-blue-500 text-white rounded text-sm
                  hover:bg-blue-600">추가</button>
              <button onClick={() => setIsAdding(false)}
                className="px-4 py-2 border rounded text-sm
                  hover:bg-gray-50">취소</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
