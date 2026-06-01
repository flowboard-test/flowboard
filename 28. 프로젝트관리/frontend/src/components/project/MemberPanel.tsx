import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

interface MemberPanelProps {
  projectId: string;
}

export function MemberPanel({ projectId }: MemberPanelProps) {
  const { data: members } = useQuery<any[]>({
    queryKey: ['members', projectId],
    queryFn: () => apiClient(`/projects/${projectId}/members`),
    refetchInterval: 30000, // 30초마다 갱신
  });

  function isOnline(lastLogin: string | null): boolean {
    if (!lastLogin) return false;
    const diff = Date.now() - new Date(lastLogin).getTime();
    return diff < 5 * 60 * 1000; // 5분 이내
  }

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
        <p className="text-xs text-green-500">
          {members?.filter((m: any) => isOnline(m.last_login_at)).length || 0}명 온라인
        </p>
      </div>
      <div className="p-2 space-y-1">
        {members?.sort((a: any, b: any) => {
          const aOnline = isOnline(a.last_login_at) ? 0 : 1;
          const bOnline = isOnline(b.last_login_at) ? 0 : 1;
          return aOnline - bOnline;
        }).map((m: any) => (
          <div key={m.id} className="flex items-center gap-2 px-2 py-1.5
            rounded hover:bg-gray-50">
            <div className="relative">
              <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center
                justify-center text-xs font-medium text-blue-700">
                {m.name?.charAt(0)}
              </div>
              <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5
                rounded-full border-2 border-white
                ${isOnline(m.last_login_at) ? 'bg-green-500' : 'bg-gray-300'}`} />
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
