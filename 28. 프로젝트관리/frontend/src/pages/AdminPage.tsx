import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { useAuthStore } from '@/stores/authStore';

type AdminTab = 'users' | 'org' | 'monitor';

export function AdminPage() {
  const [tab, setTab] = useState<AdminTab>('users');

  const tabs = [
    { key: 'users', label: '사용자 관리' },
    { key: 'org', label: '조직 관리' },
    { key: 'monitor', label: '서비스 관제' },
  ] as const;

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <h1 className="text-xl font-bold mb-4">관리자</h1>
      <div className="flex gap-2 mb-4 border-b pb-2">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-t text-sm
              ${tab === t.key ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'users' && <UserManagement />}
      {tab === 'org' && <OrgManagement />}
      {tab === 'monitor' && <ServiceMonitor />}
    </div>
  );
}

function UserManagement() {
  const [search, setSearch] = useState('');

  const { data: users } = useQuery<any[]>({
    queryKey: ['admin-users', search],
    queryFn: () => apiClient('/auth/users', {
      params: search ? { search } : undefined,
    }),
  });

  return (
    <div>
      <div className="flex gap-2 mb-3">
        <input type="text" value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="이름/이메일 검색"
          className="border rounded px-3 py-1.5 text-sm flex-1" />
      </div>
      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-3 py-2 text-xs">이름</th>
              <th className="text-left px-3 py-2 text-xs">이메일</th>
              <th className="text-left px-3 py-2 text-xs">마지막 로그인</th>
              <th className="text-left px-3 py-2 text-xs">상태</th>
            </tr>
          </thead>
          <tbody>
            {users?.map((u: any) => (
              <tr key={u.id} className="border-t hover:bg-gray-50">
                <td className="px-3 py-2">{u.name}</td>
                <td className="px-3 py-2 text-gray-500">{u.email}</td>
                <td className="px-3 py-2 text-xs text-gray-400">
                  {u.last_login_at
                    ? new Date(u.last_login_at).toLocaleString('ko-KR')
                    : '-'}
                </td>
                <td className="px-3 py-2">
                  <span className={`text-xs px-1.5 py-0.5 rounded
                    ${u.is_dormant ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                    {u.is_dormant ? '휴면' : '활성'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-400 mt-2">총 {users?.length || 0}명</p>
    </div>
  );
}

function OrgManagement() {
  const [file, setFile] = useState<File | null>(null);
  const [uploadMsg, setUploadMsg] = useState('');
  const [deptName, setDeptName] = useState('');
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.token);

  const { data: departments } = useQuery<any>({
    queryKey: ['admin-departments'],
    queryFn: () => apiClient('/auth/organization'),
  });

  async function handleExcelUpload() {
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('/api/admin/upload-org', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    const data = await res.json();
    setUploadMsg(data.message || '업로드 완료');
    queryClient.invalidateQueries({ queryKey: ['admin-departments'] });
    setFile(null);
  }

  const addDept = useMutation({
    mutationFn: (name: string) =>
      apiClient('/auth/organization/departments', {
        method: 'POST',
        body: JSON.stringify({ name }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-departments'] });
      setDeptName('');
    },
  });

  return (
    <div className="space-y-4">
      {/* 엑셀 대량 등록 */}
      <div className="bg-white border rounded-lg p-4">
        <h3 className="text-sm font-semibold mb-2">조직도 엑셀 대량 등록</h3>
        <p className="text-xs text-gray-500 mb-2">
          엑셀 형식: 이름, 이메일, 부서, 직급, 전화번호
        </p>
        <div className="flex gap-2">
          <input type="file" accept=".xlsx,.csv"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="text-xs" />
          <button onClick={handleExcelUpload} disabled={!file}
            className="px-3 py-1 bg-blue-500 text-white rounded text-xs
              disabled:opacity-50">업로드</button>
        </div>
        {uploadMsg && <p className="text-xs text-green-600 mt-1">{uploadMsg}</p>}
      </div>

      {/* 부서 관리 */}
      <div className="bg-white border rounded-lg p-4">
        <h3 className="text-sm font-semibold mb-2">부서 관리</h3>
        <div className="flex gap-2 mb-3">
          <input type="text" value={deptName}
            onChange={(e) => setDeptName(e.target.value)}
            placeholder="새 부서명"
            className="border rounded px-2 py-1 text-sm flex-1" />
          <button onClick={() => addDept.mutate(deptName)}
            disabled={!deptName.trim()}
            className="px-3 py-1 bg-blue-500 text-white rounded text-xs
              disabled:opacity-50">추가</button>
        </div>
        <div className="space-y-1">
          {departments?.departments?.map((d: any) => (
            <div key={d.id} className="flex items-center gap-2 px-2 py-1
              bg-gray-50 rounded text-xs">
              <span className="flex-1">{d.name}</span>
              <span className="text-gray-400">{d.users?.length || 0}명</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ServiceMonitor() {
  const { data: stats } = useQuery<any>({
    queryKey: ['admin-stats'],
    queryFn: () => apiClient('/admin/stats'),
    refetchInterval: 10000,
  });

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="전체 사용자" value={stats?.totalUsers || 0} />
        <StatCard label="활성 사용자" value={stats?.activeUsers || 0} color="green" />
        <StatCard label="휴면 계정" value={stats?.dormantUsers || 0} color="red" />
        <StatCard label="전체 프로젝트" value={stats?.totalProjects || 0} color="blue" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="전체 업무" value={stats?.totalCards || 0} />
        <StatCard label="완료 업무" value={stats?.completedCards || 0} color="green" />
        <StatCard label="오늘 로그인" value={stats?.todayLogins || 0} color="blue" />
        <StatCard label="이번 주 생성" value={stats?.weeklyCards || 0} />
      </div>
    </div>
  );
}

function StatCard({ label, value, color = 'gray' }: {
  label: string; value: number; color?: string;
}) {
  const colors: Record<string, string> = {
    gray: 'text-gray-800',
    green: 'text-green-600',
    red: 'text-red-600',
    blue: 'text-blue-600',
  };
  return (
    <div className="bg-white border rounded-lg p-3 text-center">
      <p className={`text-2xl font-bold ${colors[color]}`}>{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}
