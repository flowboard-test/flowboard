import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

interface WorkflowSetupProps {
  projectId: string;
  columns: Array<{ id: string; name: string }>;
}

export function WorkflowSetup({ projectId, columns }: WorkflowSetupProps) {
  const [show, setShow] = useState(false);
  const [name, setName] = useState('');
  const [triggerColumnId, setTriggerColumnId] = useState('');
  const [assigneeIds, setAssigneeIds] = useState<string[]>(['']);
  const queryClient = useQueryClient();

  const { data: members } = useQuery<any[]>({
    queryKey: ['members', projectId],
    queryFn: () => apiClient(`/projects/${projectId}/members`),
    enabled: show,
  });

  const { data: workflows } = useQuery<any[]>({
    queryKey: ['workflows', projectId],
    queryFn: () => apiClient(`/projects/${projectId}/workflows`),
  });

  const createMutation = useMutation({
    mutationFn: (data: any) =>
      apiClient(`/projects/${projectId}/workflows`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows', projectId] });
      setShow(false);
      setName('');
      setAssigneeIds(['']);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (chainId: string) =>
      apiClient(`/workflows/${chainId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows', projectId] });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (data: { id: string; is_active: boolean }) =>
      apiClient(`/workflows/${data.id}`, {
        method: 'PUT',
        body: JSON.stringify({ is_active: data.is_active }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows', projectId] });
    },
  });

  return (
    <div className="border-t p-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-semibold">업무 진행 순서 (워크플로우)</h3>
        <button onClick={() => setShow(!show)}
          className="text-xs text-blue-500">
          {show ? '닫기' : '+ 설정'}
        </button>
      </div>

      {/* 기존 워크플로우 목록 */}
      {workflows && workflows.length > 0 && (
        <div className="space-y-2 mb-3">
          {workflows.map((wf: any) => (
            <div key={wf.id} className="bg-gray-50 rounded p-2 text-xs">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="font-medium">
                    {wf.name}
                    {!wf.is_active && (
                      <span className="ml-1 text-gray-400">(비활성)</span>
                    )}
                  </p>
                  <p className="text-gray-500 mt-0.5">
                    {wf.steps?.map((s: any) => s.assignee_name).join(' → ')}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => toggleActiveMutation.mutate({
                      id: wf.id, is_active: !wf.is_active
                    })}
                    className={`px-1.5 py-0.5 rounded text-xs
                      ${wf.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
                    {wf.is_active ? '활성' : '비활성'}
                  </button>
                  <button onClick={() => deleteMutation.mutate(wf.id)}
                    className="px-1.5 py-0.5 bg-red-100 text-red-600 rounded text-xs">
                    삭제
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {show && (
        <div className="space-y-3 bg-gray-50 rounded-lg p-3">
          <input type="text" placeholder="워크플로우 이름"
            value={name} onChange={(e) => setName(e.target.value)}
            className="w-full border rounded px-2 py-1 text-sm" />

          <div>
            <label className="text-xs text-gray-600">트리거 컬럼</label>
            <select value={triggerColumnId}
              onChange={(e) => setTriggerColumnId(e.target.value)}
              className="w-full border rounded px-2 py-1 text-sm mt-1">
              <option value="">컬럼 선택</option>
              {columns.map((col) => (
                <option key={col.id} value={col.id}>{col.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs text-gray-600">
              처리 순서 (순서대로 업무가 넘어갑니다)
            </label>
            {assigneeIds.map((id, i) => (
              <div key={i} className="flex gap-1 mt-1 items-center">
                <span className="text-xs text-gray-400 w-5">{i + 1}.</span>
                <select value={id}
                  onChange={(e) => {
                    const updated = [...assigneeIds];
                    updated[i] = e.target.value;
                    setAssigneeIds(updated);
                  }}
                  className="flex-1 border rounded px-2 py-1 text-sm">
                  <option value="">담당자 선택</option>
                  {members?.map((m: any) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </select>
                {assigneeIds.length > 1 && (
                  <button onClick={() =>
                    setAssigneeIds(assigneeIds.filter((_, j) => j !== i))}
                    className="text-red-400 text-xs">✕</button>
                )}
              </div>
            ))}
            <button onClick={() => setAssigneeIds([...assigneeIds, ''])}
              className="text-blue-500 text-xs mt-1">+ 다음 담당자</button>
          </div>

          <button
            onClick={() => createMutation.mutate({
              name,
              trigger_column_id: triggerColumnId,
              assignee_ids: assigneeIds.filter((id) => id),
            })}
            disabled={!name || !triggerColumnId || assigneeIds.filter(Boolean).length === 0}
            className="w-full py-1.5 bg-blue-500 text-white rounded text-xs
              disabled:opacity-50">
            워크플로우 생성
          </button>
        </div>
      )}
    </div>
  );
}
