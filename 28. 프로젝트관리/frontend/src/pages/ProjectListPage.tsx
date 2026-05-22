import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { Project } from '@/types';
import { OrgMemberPicker } from '@/components/common/OrgMemberPicker';

interface SelectedMember {
  id: string;
  name: string;
  email: string;
}

export function ProjectListPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [showOrgPicker, setShowOrgPicker] = useState(false);
  const [newName, setNewName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<SelectedMember[]>([]);
  const [workflowSteps, setWorkflowSteps] = useState<SelectedMember[]>([]);
  const queryClient = useQueryClient();

  const { data: projects, isLoading } = useQuery<Project[]>({
    queryKey: ['projects'],
    queryFn: () => apiClient('/projects'),
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; memberEmails: string[]; workflowSteps: string[] }) =>
      apiClient('/projects', {
        method: 'POST',
        body: JSON.stringify({
          name: data.name,
          member_emails: data.memberEmails,
          workflow_assignee_ids: data.workflowSteps,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setShowCreate(false);
      setNewName('');
      setSelectedMembers([]);
      setWorkflowSteps([]);
    },
  });

  function handleAddMembers(users: Array<{ id: string; name: string; email: string }>) {
    const newMembers = users.filter(
      (u) => !selectedMembers.some((m) => m.id === u.id)
    );
    setSelectedMembers([...selectedMembers, ...newMembers]);
    setShowOrgPicker(false);
  }

  function removeMember(id: string) {
    setSelectedMembers(selectedMembers.filter((m) => m.id !== id));
  }

  if (isLoading) {
    return <div className="p-6 text-gray-500">로딩 중...</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-xl font-bold">프로젝트</h1>
        <button onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded-md text-sm
            hover:bg-blue-600">
          + 새 프로젝트
        </button>
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center
          justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[420px] max-w-full space-y-4">
            <h3 className="text-lg font-semibold text-center">새 프로젝트 만들기</h3>
            <input type="text" placeholder="프로젝트 이름"
              value={newName} onChange={(e) => setNewName(e.target.value)}
              autoFocus
              className="w-full border rounded-md px-3 py-2 text-sm" />

            <div>
              <label className="text-xs font-medium text-gray-600">
                프로젝트 멤버
              </label>
              <div className="mt-1 space-y-1 max-h-32 overflow-y-auto">
                {selectedMembers.map((m) => (
                  <div key={m.id} className="flex items-center gap-2
                    bg-gray-50 rounded px-2 py-1">
                    <span className="text-xs flex-1">{m.name} ({m.email})</span>
                    <button onClick={() => removeMember(m.id)}
                      className="text-red-400 text-xs">✕</button>
                  </div>
                ))}
              </div>
              <button onClick={() => setShowOrgPicker(true)}
                className="text-blue-500 text-xs mt-1">
                + 조직도에서 멤버 추가
              </button>
            </div>

            {/* 업무 프로세스 순서 설정 */}
            <div>
              <label className="text-xs font-medium text-gray-600">
                업무 프로세스 순서 (완료 시 자동 이관)
              </label>
              <p className="text-xs text-gray-400 mt-0.5">
                위에서 추가한 멤버 중 업무 순서를 지정하세요
              </p>
              <div className="mt-2 space-y-1">
                {workflowSteps.map((step, i) => (
                  <div key={step.id} className="flex items-center gap-2
                    bg-blue-50 rounded px-2 py-1.5">
                    <span className="text-xs font-bold text-blue-600 w-5">
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="text-xs flex-1">{step.name}</span>
                    <button onClick={() =>
                      setWorkflowSteps(workflowSteps.filter((_, j) => j !== i))}
                      className="text-red-400 text-xs">✕</button>
                  </div>
                ))}
              </div>
              {selectedMembers.length > 0 && (
                <select
                  value=""
                  onChange={(e) => {
                    const member = selectedMembers.find((m) => m.id === e.target.value);
                    if (member && !workflowSteps.some((s) => s.id === member.id)) {
                      setWorkflowSteps([...workflowSteps, member]);
                    }
                  }}
                  className="w-full border rounded px-2 py-1 text-xs mt-2">
                  <option value="">+ 다음 순서 담당자 추가</option>
                  {selectedMembers
                    .filter((m) => !workflowSteps.some((s) => s.id === m.id))
                    .map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                </select>
              )}
            </div>

            <div className="flex gap-2 justify-center pt-2">
              <button
                onClick={() => createMutation.mutate({
                  name: newName,
                  memberEmails: selectedMembers.map((m) => m.email),
                  workflowSteps: workflowSteps.map((m) => m.id),
                })}
                disabled={!newName.trim()}
                className="px-6 py-2 bg-blue-500 text-white rounded-md text-sm
                  disabled:opacity-50 hover:bg-blue-600">생성</button>
              <button onClick={() => { setShowCreate(false); setSelectedMembers([]); setNewName(''); setWorkflowSteps([]); }}
                className="px-6 py-2 border rounded-md text-sm">취소</button>
            </div>
          </div>
        </div>
      )}

      {showOrgPicker && (
        <OrgMemberPicker
          onSelect={handleAddMembers}
          onClose={() => setShowOrgPicker(false)}
          excludeIds={selectedMembers.map((m) => m.id)}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects?.map((project) => (
          <Link key={project.id} to={`/projects/${project.id}`}
            className="block bg-white border rounded-lg p-4 hover:shadow-md
              transition-shadow">
            <h3 className="font-semibold">{project.name}</h3>
            <p className="text-sm text-gray-500 mt-1 line-clamp-2">
              {project.description || '설명 없음'}
            </p>
            <p className="text-xs text-gray-400 mt-2">
              {new Date(project.created_at).toLocaleDateString('ko-KR')}
            </p>
          </Link>
        ))}
      </div>

      {projects?.length === 0 && (
        <p className="text-center text-gray-500 py-12">
          프로젝트가 없습니다. 새 프로젝트를 만들어보세요.
        </p>
      )}
    </div>
  );
}
