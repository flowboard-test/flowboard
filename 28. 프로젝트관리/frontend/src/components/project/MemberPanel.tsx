import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

interface MemberPanelProps {
  projectId: string;
}

export function MemberPanel({ projectId }: MemberPanelProps) {
  const { data: members } = useQuery<any[]>({
    queryKey: ['members', projectId],
    queryFn: () => apiClient(`/projects/${projectId}/members`),
  });

  const roleLabels: Record<string, string> = {
    owner: '소유자',
    admin: '관리자',
    member: '멤버',
    guest: '게스트',
  };

  const roleColors: Record<string, string> = {
    owner: 'bg-purple-100 text-purple-700',
    admin: 'bg-blue-100 text-blue-700',
    member: 'bg-gray-100 text-gray-600',
    guest: 'bg-yellow-100 text-yellow-700',
  };

  return (
    <div className="w-56 shrink-0 border-l bg-white overflow-y-auto
      hidden lg:block">
      <div className="p-3 border-b">
        <h3 className="text-xs font-semibold text-gray-500">
          프로젝트 멤버 ({members?.length || 0})
        </h3>
      </div>
      <div className="p-2 space-y-1">
        {members?.map((m: any) => (
          <div key={m.id} className="flex items-center gap-2 px-2 py-1.5
            rounded hover:bg-gray-50">
            <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center
              justify-center text-xs font-medium text-blue-700">
              {m.name?.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{m.name}</p>
              <span className={`text-xs px-1 rounded ${roleColors[m.role] || ''}`}>
                {roleLabels[m.role] || m.role}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
