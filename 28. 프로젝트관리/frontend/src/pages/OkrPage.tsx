import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

export function OkrPage() {
  const { id } = useParams<{ id: string }>();
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState('');
  const queryClient = useQueryClient();

  const { data: objectives } = useQuery<any[]>({
    queryKey: ['okr', id],
    queryFn: () => apiClient(`/projects/${id}/objectives`),
    enabled: !!id,
  });

  const addObjective = useMutation({
    mutationFn: (data: { title: string }) =>
      apiClient(`/projects/${id}/objectives`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['okr', id] });
      setTitle('');
      setShowAdd(false);
    },
  });

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-lg font-bold">OKR 목표 관리</h1>
        <button onClick={() => setShowAdd(true)}
          className="px-3 py-1.5 bg-blue-500 text-white rounded text-sm">
          + 목표 추가
        </button>
      </div>

      {showAdd && (
        <div className="mb-4 bg-white border rounded-lg p-3 space-y-2">
          <input type="text" value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="목표 (Objective) 입력"
            className="w-full border rounded px-3 py-2 text-sm" />
          <div className="flex gap-2 justify-center">
            <button onClick={() => addObjective.mutate({ title })}
              disabled={!title.trim()}
              className="px-4 py-1.5 bg-blue-500 text-white rounded text-sm
                disabled:opacity-50">추가</button>
            <button onClick={() => setShowAdd(false)}
              className="px-4 py-1.5 border rounded text-sm">취소</button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {objectives?.map((obj: any) => (
          <div key={obj.id} className="bg-white border rounded-lg p-4">
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold text-sm">{obj.title}</h3>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5
                rounded">{obj.progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
              <div className="bg-blue-500 h-2 rounded-full transition-all"
                style={{ width: `${obj.progress}%` }} />
            </div>
            {obj.key_results?.map((kr: any) => (
              <div key={kr.id} className="flex items-center gap-2 ml-4 mb-1">
                <div className="w-3 h-3 rounded-full border-2 border-blue-300" />
                <span className="text-xs flex-1">{kr.title}</span>
                <span className="text-xs text-gray-500">
                  {kr.current_value}/{kr.target_value} {kr.unit}
                </span>
              </div>
            ))}
          </div>
        ))}
        {(!objectives || objectives.length === 0) && (
          <p className="text-center text-gray-500 py-8 text-sm">
            목표를 추가하여 OKR을 시작하세요
          </p>
        )}
      </div>
    </div>
  );
}
