import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { useAuthStore } from '@/stores/authStore';
import { useNavigate } from 'react-router-dom';

type AdminTab = 'org' | 'position' | 'rank' | 'permission' | 'upload' | 'overview' | 'statistics';

export function AdminPage() {
  const [tab, setTab] = useState<AdminTab>('org');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [rightPanel, setRightPanel] = useState<'user' | 'addDept' | 'addUser' | null>(null);
  const queryClient = useQueryClient();

  const tabs = [
    { key: 'org', label: '조직도 관리' },
    { key: 'position', label: '직위 관리' },
    { key: 'rank', label: '직책 관리' },
    { key: 'permission', label: '권한 관리' },
    { key: 'upload', label: '조직도 업로드' },
    { key: 'overview', label: '프로젝트 현황' },
    { key: 'statistics', label: '통계' },
  ] as const;

  const { data: orgData } = useQuery<any>({
    queryKey: ['admin-org'],
    queryFn: () => apiClient('/auth/organization'),
  });

  const { } = useQuery<any[]>({
    queryKey: ['admin-users', search],
    queryFn: () => apiClient('/auth/users', {
      params: search ? { search } : undefined,
    }),
  });

  return (
    <div className="h-full flex flex-col">
      {/* 상단 탭 */}
      <div className="border-b bg-white px-4">
        <div className="flex gap-0">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-sm border-b-2 -mb-px
                ${tab === t.key
                  ? 'border-blue-500 text-blue-600 font-medium'
                  : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'org' && (
        <div className="flex-1 flex overflow-hidden">
          {/* 좌측: 조직도 트리 */}
          <div className="w-64 border-r bg-white overflow-y-auto">
            {/* 버튼 바 */}
            <div className="p-2 border-b flex gap-1">
              <button onClick={() => { setRightPanel('addDept'); setSelectedUser(null); }}
                className="px-2 py-1 bg-gray-100 rounded text-xs hover:bg-gray-200">
                부서 추가
              </button>
              <button onClick={() => { setRightPanel('addUser'); setSelectedUser(null); }}
                className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200">
                사용자 추가
              </button>
            </div>
            {/* 검색 */}
            <div className="p-2 border-b">
              <input type="text" value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="이름/아이디/부서/직위"
                className="w-full border rounded px-2 py-1 text-xs" />
            </div>
            {/* 트리 */}
            <div className="p-2">
              <OrgTree orgData={orgData}
                selectedId={selectedUser?.id}
                search={search}
                onSelect={(u: any) => { setSelectedUser(u); setRightPanel('user'); }}
                onMoveUser={async (userId: string, deptName: string) => {
                  try {
                    await apiClient(`/admin/users/${userId}/department`, {
                      method: 'PUT',
                      body: JSON.stringify({ department: deptName }),
                    });
                    queryClient.invalidateQueries({ queryKey: ['admin-org'] });
                    if (selectedUser?.id === userId) {
                      setSelectedUser({ ...selectedUser, department: deptName });
                    }
                  } catch {
                    alert('부서 이동에 실패했습니다');
                  }
                }} />
            </div>
          </div>

          {/* 우측: 상세 폼 */}
          <div className="flex-1 overflow-y-auto bg-gray-50">
            {rightPanel === 'user' && selectedUser && (
              <UserDetailForm user={selectedUser}
                onUpdate={() => {
                  queryClient.invalidateQueries({ queryKey: ['admin-users'] });
                  queryClient.invalidateQueries({ queryKey: ['admin-org'] });
                }} />
            )}
            {rightPanel === 'addDept' && (
              <AddDeptForm onDone={() => {
                queryClient.invalidateQueries({ queryKey: ['admin-org'] });
                setRightPanel(null);
              }} />
            )}
            {rightPanel === 'addUser' && (
              <AddUserForm onDone={() => {
                queryClient.invalidateQueries({ queryKey: ['admin-users'] });
                queryClient.invalidateQueries({ queryKey: ['admin-org'] });
                setRightPanel(null);
              }} />
            )}
            {!rightPanel && (
              <div className="flex items-center justify-center h-full
                text-gray-400 text-sm">
                좌측에서 사용자를 선택하거나 추가 버튼을 클릭하세요
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'upload' && <UploadTab />}
      {tab === 'permission' && <PermissionTab />}
      {tab === 'position' && <PositionTab />}
      {tab === 'rank' && <RankTab />}
      {tab === 'overview' && <ProjectOverviewTab />}
      {tab === 'statistics' && <StatisticsTab />}
    </div>
  );
}

// === 조직도 트리 ===
function OrgTree({ orgData, selectedId, onSelect, onMoveUser, search }: any) {
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());
  const [dragOverDept, setDragOverDept] = useState<string | null>(null);
  const [deptOrder, setDeptOrder] = useState<string[]>([]);

  const allDepts = [...(orgData?.departments || [])];
  const allUnassigned = orgData?.unassigned || [];

  // 검색 필터링
  const searchLower = (search || '').toLowerCase();
  const filteredDepts = allDepts.map((dept: any) => {
    if (!searchLower) return dept;
    const matchDept = dept.name.toLowerCase().includes(searchLower);
    const matchUsers = dept.users?.filter((u: any) =>
      u.name.toLowerCase().includes(searchLower) ||
      u.email?.toLowerCase().includes(searchLower) ||
      u.position?.toLowerCase().includes(searchLower)
    ) || [];
    if (matchDept || matchUsers.length > 0) {
      return { ...dept, users: matchDept ? dept.users : matchUsers };
    }
    return null;
  }).filter(Boolean);

  const filteredUnassigned = searchLower
    ? allUnassigned.filter((u: any) =>
        u.name.toLowerCase().includes(searchLower) ||
        u.email?.toLowerCase().includes(searchLower)
      )
    : allUnassigned;

  // 정렬
  const orderedDepts = deptOrder.length > 0
    ? deptOrder.map((id) => filteredDepts.find((d: any) => d.id === id)).filter(Boolean)
    : filteredDepts.sort((a: any, b: any) => a.name.localeCompare(b.name, 'ko'));

  function toggleDept(deptId: string) {
    const next = new Set(expandedDepts);
    if (next.has(deptId)) next.delete(deptId);
    else next.add(deptId);
    setExpandedDepts(next);
  }

  // 검색 중이면 모든 부서 펼침
  const isSearching = searchLower.length > 0;
  function isDeptExpanded(deptId: string) {
    return isSearching || expandedDepts.has(deptId);
  }

  function handleDeptDrop(draggedId: string, targetId: string) {
    if (draggedId === targetId) return;
    const ids = orderedDepts.map((d: any) => d.id);
    const fromIdx = ids.indexOf(draggedId);
    const toIdx = ids.indexOf(targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    ids.splice(fromIdx, 1);
    ids.splice(toIdx, 0, draggedId);
    setDeptOrder(ids);
  }

  async function handleDropUser(userId: string, deptName: string) {
    await onMoveUser(userId, deptName);
    setDragOverDept(null);
  }

  return (
    <div className="text-xs">
      <div className="font-medium text-gray-700 mb-2 px-1">🏢 FlowBoard</div>

      {orderedDepts.map((dept: any) => (
        <div key={dept.id} className="ml-3 mb-0.5"
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData('type', 'dept');
            e.dataTransfer.setData('deptId', dept.id);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOverDept(dept.id);
          }}
          onDragLeave={() => setDragOverDept(null)}
          onDrop={(e) => {
            e.preventDefault();
            const type = e.dataTransfer.getData('type');
            if (type === 'user') {
              const userId = e.dataTransfer.getData('userId');
              handleDropUser(userId, dept.name);
            } else if (type === 'dept') {
              const draggedId = e.dataTransfer.getData('deptId');
              handleDeptDrop(draggedId, dept.id);
            }
            setDragOverDept(null);
          }}>
          <div
            onClick={() => toggleDept(dept.id)}
            className={`flex items-center gap-1 py-1 px-1 rounded
              cursor-pointer hover:bg-gray-100
              ${dragOverDept === dept.id ? 'bg-blue-100 ring-1 ring-blue-400' : ''}`}>
            <span>{isDeptExpanded(dept.id) ? '📂' : '📁'}</span>
            <span className="font-medium text-gray-600">{dept.name}</span>
            <span className="text-gray-400 ml-auto">
              {dept.users?.length || 0}
            </span>
          </div>


          {/* 부서 펼침 시 소속 사용자 표시 */}
          {isDeptExpanded(dept.id) && dept.users?.map((u: any) => (
            <div key={u.id}
              draggable
              onDragStart={(e) => {
                e.stopPropagation();
                e.dataTransfer.setData('type', 'user');
                e.dataTransfer.setData('userId', u.id);
              }}
              onClick={() => onSelect(u)}
              className={`ml-4 py-0.5 px-1 rounded cursor-grab active:cursor-grabbing
                ${selectedId === u.id ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}>
              👤 {u.name} {u.position ? `(${u.position})` : ''}
            </div>
          ))}
        </div>
      ))}

      {/* 부서미지정 */}
      {filteredUnassigned.length > 0 && (
        <div className="ml-3 mt-2">
          <div className="font-medium text-gray-400 py-1 px-1">
            📁 부서미지정 ({filteredUnassigned.length})
          </div>
          {filteredUnassigned.map((u: any) => (
            <div key={u.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('type', 'user');
                e.dataTransfer.setData('userId', u.id);
              }}
              onClick={() => onSelect(u)}
              className={`ml-4 py-0.5 px-1 rounded cursor-grab active:cursor-grabbing
                ${selectedId === u.id ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}>
              👤 {u.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// === 사용자 상세 폼 ===
function UserDetailForm({ user, onUpdate }: { user: any; onUpdate: () => void }) {
  const [form, setForm] = useState({
    name: user.name || '',
    email: user.email || '',
    department: user.department || '',
    position: user.position || '',
    phone: user.phone || '',
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) =>
      apiClient(`/auth/me`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: onUpdate,
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiClient(`/admin/users/${user.id}`, { method: 'DELETE' }),
    onSuccess: onUpdate,
  });

  // user 변경 시 폼 리셋
  useEffect(() => {
    setForm({
      name: user.name || '', email: user.email || '',
      department: user.department || '', position: user.position || '',
      phone: user.phone || '',
    });
  }, [user.id, user.department]);

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-sm font-semibold">사용자 정보</h2>
        <div className="flex gap-2">
          <button onClick={() => updateMutation.mutate({ name: form.name })}
            className="px-3 py-1 bg-blue-500 text-white rounded text-xs">
            저장</button>
          <button onClick={() => {
            if (confirm('이 사용자를 삭제하시겠습니까?'))
              deleteMutation.mutate();
          }}
            className="px-3 py-1 bg-red-500 text-white rounded text-xs">
            삭제</button>
        </div>
      </div>

      <div className="bg-white border rounded-lg p-4 space-y-3">
        <FormRow label="사용자 ID" value={user.id} readonly />
        <FormRow label="이메일*" value={form.email}
          onChange={(v) => setForm({ ...form, email: v })} />
        <FormRow label="한글이름*" value={form.name}
          onChange={(v) => setForm({ ...form, name: v })} />
        <FormRow label="소속부서" value={form.department}
          onChange={(v) => setForm({ ...form, department: v })} />
        <FormRow label="직위" value={form.position}
          onChange={(v) => setForm({ ...form, position: v })} />
        <FormRow label="휴대전화" value={form.phone}
          onChange={(v) => setForm({ ...form, phone: v })} />
        <FormRow label="마지막 로그인"
          value={user.last_login_at
            ? new Date(user.last_login_at).toLocaleString('ko-KR')
            : '없음'} readonly />
        <FormRow label="상태"
          value={user.is_dormant ? '휴면' : '활성'} readonly />
      </div>

      {/* 비밀번호 변경 */}
      <PasswordResetSection userId={user.id} />
    </div>
  );
}

function FormRow({ label, value, onChange, readonly }: {
  label: string; value: string; onChange?: (v: string) => void; readonly?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <label className="w-24 text-xs text-gray-600 shrink-0 text-right">
        {label}
      </label>
      {readonly ? (
        <span className="text-sm text-gray-500">{value}</span>
      ) : (
        <input type="text" value={value}
          onChange={(e) => onChange?.(e.target.value)}
          className="flex-1 border rounded px-2 py-1 text-sm" />
      )}
    </div>
  );
}

// === 부서 추가 버튼 ===
// === 기타 탭 (간단 구현) ===
function UploadTab() {
  const [file, setFile] = useState<File | null>(null);
  const [msg, setMsg] = useState('');
  const token = useAuthStore((s) => s.token);

  async function upload() {
    if (!file) return;
    const fd = new FormData(); fd.append('file', file);
    await fetch('/api/admin/upload-org', {
      method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd,
    });
    setMsg('업로드 완료 (처리 중)');
  }

  function downloadSample() {
    const header = '이름,이메일,부서,직위,전화번호';
    const rows = [
      '홍길동,hong@company.com,개발팀,시니어,010-1234-5678',
      '김영희,kim@company.com,기획팀,팀장,010-2345-6789',
      '이철수,lee@company.com,디자인팀,선임,010-3456-7890',
      '박민수,park@company.com,QA팀,매니저,010-4567-8901',
      '정수진,jung@company.com,마케팅팀,대리,010-5678-9012',
    ];
    const csv = '\uFEFF' + header + '\n' + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '조직도_업로드_양식.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-6 max-w-lg">
      <h2 className="text-sm font-semibold mb-3">조직도 엑셀 업로드</h2>

      <div className="bg-white border rounded-lg p-4 mb-4">
        <h3 className="text-xs font-medium mb-2">업로드 양식</h3>
        <table className="w-full text-xs border mb-3">
          <thead className="bg-gray-50">
            <tr>
              <th className="border px-2 py-1">이름*</th>
              <th className="border px-2 py-1">이메일*</th>
              <th className="border px-2 py-1">부서</th>
              <th className="border px-2 py-1">직위</th>
              <th className="border px-2 py-1">전화번호</th>
            </tr>
          </thead>
          <tbody>
            <tr className="text-gray-400">
              <td className="border px-2 py-1">홍길동</td>
              <td className="border px-2 py-1">hong@company.com</td>
              <td className="border px-2 py-1">개발팀</td>
              <td className="border px-2 py-1">시니어</td>
              <td className="border px-2 py-1">010-1234-5678</td>
            </tr>
          </tbody>
        </table>
        <button onClick={downloadSample}
          className="px-3 py-1.5 bg-green-500 text-white rounded text-xs
            hover:bg-green-600">
          📥 샘플 양식 다운로드 (CSV)
        </button>
      </div>

      <div className="bg-white border rounded-lg p-4">
        <h3 className="text-xs font-medium mb-2">파일 업로드</h3>
        <p className="text-xs text-gray-500 mb-2">
          CSV 또는 XLSX 파일을 선택하세요. (* 필수 항목)
        </p>
        <div className="flex gap-2 items-center">
          <input type="file" accept=".xlsx,.csv"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="text-xs" />
          <button onClick={upload} disabled={!file}
            className="px-3 py-1.5 bg-blue-500 text-white rounded text-xs
              disabled:opacity-50">업로드</button>
        </div>
        {msg && <p className="text-xs text-green-600 mt-2">{msg}</p>}
      </div>
    </div>
  );
}

function PositionTab() {
  const [name, setName] = useState('');
  const queryClient = useQueryClient();

  const { data: positions } = useQuery<any[]>({
    queryKey: ['admin-positions'],
    queryFn: () => apiClient('/admin/positions'),
  });

  const addMut = useMutation({
    mutationFn: (data: { name: string; level: number }) =>
      apiClient('/admin/positions', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-positions'] }); setName(''); },
  });

  const delMut = useMutation({
    mutationFn: (id: string) => apiClient(`/admin/positions/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-positions'] }),
  });

  return (
    <div className="p-6 max-w-lg">
      <h2 className="text-sm font-semibold mb-3">직위 관리</h2>
      <p className="text-xs text-gray-500 mb-3">팀장, 선임, 사원 등 조직 내 직위를 관리합니다.</p>

      {/* 추가 폼 */}
      <div className="flex gap-2 mb-4 bg-white border rounded-lg p-3">
        <input type="text" value={name} onChange={(e) => setName(e.target.value)}
          placeholder="직위명 (예: 팀장)" className="border rounded px-2 py-1 text-sm flex-1" />
        <button onClick={() => addMut.mutate({ name, level: positions?.length || 0 })} disabled={!name.trim()}
          className="px-4 py-1 bg-blue-500 text-white rounded text-sm disabled:opacity-50">추가</button>
      </div>

      {/* 등록된 직위 목록 */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <div className="px-3 py-2 bg-gray-50 border-b">
          <span className="text-xs font-medium text-gray-600">
            등록된 직위 ({positions?.length || 0}개)
          </span>
        </div>
        {positions && positions.length > 0 ? (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left px-3 py-1.5 text-xs">순서</th>
                <th className="text-left px-3 py-1.5 text-xs">직위명</th>
                <th className="text-right px-3 py-1.5 text-xs">관리</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((p: any, i: number) => (
                <tr key={p.id} className="border-b hover:bg-gray-50">
                  <td className="px-3 py-2 text-gray-400">{i + 1}</td>
                  <td className="px-3 py-2 font-medium">{p.name}</td>
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => delMut.mutate(p.id)}
                      className="text-xs text-red-400 hover:text-red-600">삭제</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="p-4 text-center text-xs text-gray-400">등록된 직위가 없습니다</p>
        )}
      </div>
    </div>
  );
}
function RankTab() {
  const [name, setName] = useState('');
  const queryClient = useQueryClient();

  const { data: ranks } = useQuery<any[]>({
    queryKey: ['admin-ranks'],
    queryFn: () => apiClient('/admin/ranks'),
  });

  const addMut = useMutation({
    mutationFn: (data: { name: string; level: number }) =>
      apiClient('/admin/ranks', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-ranks'] }); setName(''); },
  });

  const delMut = useMutation({
    mutationFn: (id: string) => apiClient(`/admin/ranks/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-ranks'] }),
  });

  return (
    <div className="p-6 max-w-lg">
      <h2 className="text-sm font-semibold mb-3">직책 관리</h2>
      <p className="text-xs text-gray-500 mb-3">부장, 차장, 과장, 대리, 주임 등 직책을 관리합니다.</p>
      <div className="flex gap-2 mb-4">
        <input type="text" value={name} onChange={(e) => setName(e.target.value)}
          placeholder="직책명 (예: 부장)" className="border rounded px-2 py-1 text-sm flex-1" />
        <button onClick={() => addMut.mutate({ name, level: ranks?.length || 0 })} disabled={!name.trim()}
          className="px-3 py-1 bg-blue-500 text-white rounded text-xs disabled:opacity-50">추가</button>
      </div>
      <div className="space-y-1">
        {ranks?.map((r: any) => (
          <div key={r.id} className="flex items-center gap-2 bg-white border rounded px-3 py-2">
            <span className="text-sm flex-1">{r.name}</span>
            <span className="text-xs text-gray-400">Lv.{r.level}</span>
            <button onClick={() => delMut.mutate(r.id)}
              className="text-xs text-red-400 hover:text-red-600">삭제</button>
          </div>
        ))}
      </div>
    </div>
  );
}
function PermissionTab() {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [perms, setPerms] = useState<string[]>([]);
  const queryClient = useQueryClient();

  const allPermissions = [
    'project.create', 'project.delete', 'project.edit',
    'card.create', 'card.edit', 'card.delete', 'card.complete',
    'member.invite', 'member.remove',
    'workflow.create', 'workflow.edit',
    'admin.access', 'admin.users', 'admin.org',
  ];

  const { data: groups } = useQuery<any[]>({
    queryKey: ['admin-permissions'],
    queryFn: () => apiClient('/admin/permissions'),
  });

  const addMut = useMutation({
    mutationFn: (data: any) =>
      apiClient('/admin/permissions', { method: 'POST', body: JSON.stringify(data) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-permissions'] });
      setName(''); setDesc(''); setPerms([]);
    },
  });

  const delMut = useMutation({
    mutationFn: (id: string) => apiClient(`/admin/permissions/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-permissions'] }),
  });

  return (
    <div className="p-6 max-w-2xl">
      <h2 className="text-sm font-semibold mb-3">권한 그룹 관리</h2>
      <div className="bg-white border rounded-lg p-4 mb-4 space-y-2">
        <input type="text" value={name} onChange={(e) => setName(e.target.value)}
          placeholder="권한 그룹명 (예: 프로젝트 관리자)"
          className="w-full border rounded px-2 py-1 text-sm" />
        <input type="text" value={desc} onChange={(e) => setDesc(e.target.value)}
          placeholder="설명"
          className="w-full border rounded px-2 py-1 text-sm" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-1">
          {allPermissions.map((p) => (
            <label key={p} className="flex items-center gap-1 text-xs">
              <input type="checkbox" checked={perms.includes(p)}
                onChange={(e) => setPerms(e.target.checked
                  ? [...perms, p] : perms.filter((x) => x !== p))}
                className="w-3 h-3" />
              {p}
            </label>
          ))}
        </div>
        <button onClick={() => addMut.mutate({ name, description: desc, permissions: perms })}
          disabled={!name.trim()}
          className="px-3 py-1 bg-blue-500 text-white rounded text-xs disabled:opacity-50">
          권한 그룹 추가
        </button>
      </div>
      <div className="space-y-2">
        {groups?.map((g: any) => (
          <div key={g.id} className="bg-white border rounded-lg p-3">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium">{g.name}</p>
                <p className="text-xs text-gray-500">{g.description}</p>
              </div>
              <button onClick={() => delMut.mutate(g.id)}
                className="text-xs text-red-400">삭제</button>
            </div>
            <div className="flex flex-wrap gap-1 mt-1">
              {JSON.parse(g.permissions || '[]').map((p: string) => (
                <span key={p} className="text-xs bg-gray-100 px-1.5 py-0.5 rounded">
                  {p}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// === 부서 추가 폼 (우측 패널) ===
function AddDeptForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState('');
  const addDept = useMutation({
    mutationFn: (n: string) =>
      apiClient('/auth/organization/departments', {
        method: 'POST', body: JSON.stringify({ name: n }),
      }),
    onSuccess: onDone,
  });

  return (
    <div className="p-6 max-w-md">
      <h2 className="text-sm font-semibold mb-4">부서 추가</h2>
      <div className="bg-white border rounded-lg p-4 space-y-3">
        <FormRow label="부서명*" value={name}
          onChange={(v) => setName(v)} />
        <div className="flex gap-2 justify-center pt-2">
          <button onClick={() => addDept.mutate(name)}
            disabled={!name.trim()}
            className="px-4 py-1.5 bg-blue-500 text-white rounded text-sm
              disabled:opacity-50">추가</button>
          <button onClick={onDone}
            className="px-4 py-1.5 border rounded text-sm">취소</button>
        </div>
      </div>
    </div>
  );
}

// === 사용자 추가 폼 (우측 패널) ===
function AddUserForm({ onDone }: { onDone: () => void }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [dept, setDept] = useState('');
  const [position, setPosition] = useState('');
  const [phone, setPhone] = useState('');

  const addUser = useMutation({
    mutationFn: (data: any) =>
      apiClient('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ ...data, password: 'password123' }),
      }),
    onSuccess: onDone,
  });

  return (
    <div className="p-6 max-w-md">
      <h2 className="text-sm font-semibold mb-4">사용자 추가</h2>
      <div className="bg-white border rounded-lg p-4 space-y-3">
        <FormRow label="이메일*" value={email} onChange={setEmail} />
        <FormRow label="한글이름*" value={name} onChange={setName} />
        <FormRow label="소속부서" value={dept} onChange={setDept} />
        <FormRow label="직위" value={position} onChange={setPosition} />
        <FormRow label="휴대전화" value={phone} onChange={setPhone} />
        <p className="text-xs text-gray-400">
          * 초기 비밀번호: password123
        </p>
        <div className="flex gap-2 justify-center pt-2">
          <button onClick={() => addUser.mutate({ name, email })}
            disabled={!name.trim() || !email.trim()}
            className="px-4 py-1.5 bg-blue-500 text-white rounded text-sm
              disabled:opacity-50">등록</button>
          <button onClick={onDone}
            className="px-4 py-1.5 border rounded text-sm">취소</button>
        </div>
      </div>
    </div>
  );
}

// === 비밀번호 초기화 섹션 ===
function PasswordResetSection({ userId }: { userId: string }) {
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [msg, setMsg] = useState('');

  const resetMut = useMutation({
    mutationFn: (password: string) =>
      apiClient(`/admin/users/${userId}/password`, {
        method: 'PUT',
        body: JSON.stringify({ password }),
      }),
    onSuccess: () => {
      setMsg('비밀번호가 변경되었습니다');
      setNewPw('');
      setConfirmPw('');
      setTimeout(() => setMsg(''), 3000);
    },
    onError: (err: any) => {
      setMsg(err.data?.message || '변경 실패');
    },
  });

  return (
    <div className="bg-white border rounded-lg p-4 mt-4 space-y-2">
      <h3 className="text-xs font-semibold">비밀번호 변경</h3>
      <div className="flex items-center gap-3">
        <label className="w-24 text-xs text-gray-600 text-right shrink-0">
          새 비밀번호
        </label>
        <input type="password" value={newPw}
          onChange={(e) => setNewPw(e.target.value)}
          placeholder="8자 이상"
          className="flex-1 border rounded px-2 py-1 text-sm" />
      </div>
      <div className="flex items-center gap-3">
        <label className="w-24 text-xs text-gray-600 text-right shrink-0">
          비밀번호 확인
        </label>
        <input type="password" value={confirmPw}
          onChange={(e) => setConfirmPw(e.target.value)}
          placeholder="비밀번호 재입력"
          className="flex-1 border rounded px-2 py-1 text-sm" />
      </div>
      {newPw && confirmPw && newPw !== confirmPw && (
        <p className="text-xs text-red-500 ml-27">비밀번호가 일치하지 않습니다</p>
      )}
      <div className="flex gap-2 ml-27">
        <button
          onClick={() => resetMut.mutate(newPw)}
          disabled={!newPw || newPw.length < 8 || newPw !== confirmPw}
          className="px-3 py-1 bg-blue-500 text-white rounded text-xs
            disabled:opacity-50">변경</button>
        <button
          onClick={() => resetMut.mutate('password123')}
          className="px-3 py-1 border border-orange-300 text-orange-600
            rounded text-xs hover:bg-orange-50">
          초기화 (password123)
        </button>
      </div>
      {msg && (
        <p className={`text-xs ml-27 ${msg.includes('실패') ? 'text-red-500' : 'text-green-600'}`}>
          {msg}
        </p>
      )}
    </div>
  );
}

// === 전체 프로젝트 현황 ===
function ProjectOverviewTab() {
  const navigate = useNavigate();
  const [detailModal, setDetailModal] = useState<{ projectId: string; projectName: string; type: 'done' | 'overdue' } | null>(null);
  const [filter, setFilter] = useState<'all' | 'done' | 'overdue'>('all');

  const { data: stats } = useQuery<any>({
    queryKey: ['admin-stats'],
    queryFn: () => apiClient('/admin/stats'),
  });

  const { data: projects } = useQuery<any[]>({
    queryKey: ['admin-projects-overview'],
    queryFn: () => apiClient('/admin/projects-overview'),
  });

  // 필터링된 프로젝트
  const filteredProjects = projects?.filter((p: any) => {
    if (filter === 'done') return p.done > 0;
    if (filter === 'overdue') return p.overdue > 0;
    return true;
  }) || [];

  return (
    <div className="p-6 max-w-4xl">
      <h2 className="text-sm font-semibold mb-4">전체 프로젝트 현황</h2>

      {/* 요약 카드 (클릭으로 필터) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div onClick={() => setFilter('all')}
          className={`bg-white border rounded-lg p-3 text-center cursor-pointer
            hover:shadow-md transition-shadow
            ${filter === 'all' ? 'ring-2 ring-blue-400' : ''}`}>
          <p className="text-2xl font-bold text-blue-600">{stats?.totalProjects || 0}</p>
          <p className="text-xs text-gray-500">전체 프로젝트</p>
        </div>
        <div className="bg-white border rounded-lg p-3 text-center">
          <p className="text-2xl font-bold text-gray-800">{stats?.totalCards || 0}</p>
          <p className="text-xs text-gray-500">전체 업무</p>
        </div>
        <div onClick={() => setFilter('done')}
          className={`bg-white border rounded-lg p-3 text-center cursor-pointer
            hover:shadow-md transition-shadow
            ${filter === 'done' ? 'ring-2 ring-green-400' : ''}`}>
          <p className="text-2xl font-bold text-green-600">{stats?.completedCards || 0}</p>
          <p className="text-xs text-gray-500">완료된 업무</p>
        </div>
        <div onClick={() => setFilter('overdue')}
          className={`bg-white border rounded-lg p-3 text-center cursor-pointer
            hover:shadow-md transition-shadow
            ${filter === 'overdue' ? 'ring-2 ring-red-400' : ''}`}>
          <p className="text-2xl font-bold text-red-600">
            {projects?.reduce((sum, p) => sum + (p.overdue || 0), 0) || 0}
          </p>
          <p className="text-xs text-gray-500">기한 초과</p>
        </div>
      </div>

      {/* 필터 표시 */}
      {filter !== 'all' && (
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs text-gray-500">
            필터: {filter === 'done' ? '완료 업무가 있는 프로젝트' : '기한 초과 업무가 있는 프로젝트'}
          </span>
          <button onClick={() => setFilter('all')}
            className="text-xs text-blue-500">전체 보기</button>
        </div>
      )}

      {/* 프로젝트별 상세 */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-3 py-2 text-xs">프로젝트</th>
              <th className="text-left px-3 py-2 text-xs">개설자</th>
              <th className="text-center px-3 py-2 text-xs">전체</th>
              <th className="text-center px-3 py-2 text-xs">완료</th>
              <th className="text-center px-3 py-2 text-xs">기한초과</th>
              <th className="text-center px-3 py-2 text-xs">진행률</th>
            </tr>
          </thead>
          <tbody>
            {filteredProjects.map((p: any) => (
              <tr key={p.id} className="border-t hover:bg-gray-50 cursor-pointer"
                onClick={() => navigate(`/projects/${p.id}`)}>
                <td className="px-3 py-2 font-medium text-blue-600 hover:underline">
                  {p.name}
                </td>
                <td className="px-3 py-2 text-gray-500">{p.owner_name}</td>
                <td className="px-3 py-2 text-center">{p.total}</td>
                <td className="px-3 py-2 text-center text-green-600 cursor-pointer hover:underline"
                  onClick={(e) => { e.stopPropagation(); if (p.done > 0) setDetailModal({ projectId: p.id, projectName: p.name, type: 'done' }); }}>
                  {p.done}
                </td>
                <td className="px-3 py-2 text-center text-red-600 cursor-pointer hover:underline"
                  onClick={(e) => { e.stopPropagation(); if (p.overdue > 0) setDetailModal({ projectId: p.id, projectName: p.name, type: 'overdue' }); }}>
                  {p.overdue}
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-1">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${p.progress}%` }} />
                    </div>
                    <span className="text-xs text-gray-600 w-8">{p.progress}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {(!projects || projects.length === 0) && (
          <p className="p-4 text-center text-gray-400 text-sm">프로젝트가 없습니다</p>
        )}
      </div>

      {detailModal && (
        <TaskDetailModal
          projectId={detailModal.projectId}
          projectName={detailModal.projectName}
          type={detailModal.type}
          onClose={() => setDetailModal(null)}
        />
      )}
    </div>
  );
}

// === 업무 상세 목록 모달 ===
function TaskDetailModal({ projectId, projectName, type, onClose }: {
  projectId: string; projectName: string; type: 'done' | 'overdue'; onClose: () => void;
}) {
  const { data: tasks } = useQuery<any[]>({
    queryKey: ['admin-tasks', projectId, type],
    queryFn: () => apiClient(`/admin/projects/${projectId}/tasks?type=${type}`),
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-[500px] max-h-[70vh] flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <div>
            <h2 className="text-sm font-semibold">{projectName}</h2>
            <p className="text-xs text-gray-500">
              {type === 'done' ? '완료된 업무' : '기한 초과 업무'}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {tasks && tasks.length > 0 ? (
            <div className="space-y-2">
              {tasks.map((t: any) => (
                <div key={t.id} className="border rounded-lg p-3">
                  <div className="flex justify-between items-start">
                    <h3 className="text-sm font-medium">{t.title}</h3>
                    <span className={`text-xs px-1.5 py-0.5 rounded
                      ${type === 'done' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {type === 'done' ? '완료' : '기한초과'}
                    </span>
                  </div>
                  {t.description && (
                    <p className="text-xs text-gray-600 mt-1">{t.description}</p>
                  )}
                  <div className="flex gap-3 mt-2 text-xs text-gray-400">
                    <span>우선순위: {t.priority}</span>
                    {t.due_date && <span>마감: {t.due_date.split('T')[0]}</span>}
                    {t.assignee_name && <span>담당: {t.assignee_name}</span>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-400 text-sm py-8">업무가 없습니다</p>
          )}
        </div>
      </div>
    </div>
  );
}


// === 통계 탭 ===
function StatisticsTab() {
  const [view, setView] = useState<'daily' | 'monthly' | 'yearly' | 'user'>('daily');
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [toDate, setToDate] = useState(() => new Date().toISOString().split('T')[0]);

  const { data: globalStats } = useQuery<any[]>({
    queryKey: ['stats-global', fromDate, toDate],
    queryFn: () => apiClient(`/statistics/global?from=${fromDate}&to=${toDate}`),
  });

  const { data: userStats } = useQuery<any[]>({
    queryKey: ['stats-users', fromDate, toDate],
    queryFn: () => apiClient(`/statistics/overdue?type=user&from=${fromDate}&to=${toDate}`),
    enabled: view === 'user',
  });

  const { data: realtime } = useQuery<any>({
    queryKey: ['stats-realtime'],
    queryFn: () => apiClient('/statistics/realtime'),
  });

  const { data: users } = useQuery<any[]>({
    queryKey: ['all-users-stats'],
    queryFn: () => apiClient('/auth/users'),
    enabled: view === 'user',
  });

  const runBatch = useMutation({
    mutationFn: () => apiClient('/statistics/run-batch', {
      method: 'POST', body: JSON.stringify({ date: toDate }),
    }),
  });

  // 월별 집계
  const monthlyStats = globalStats ? Object.values(
    globalStats.reduce((acc: any, s: any) => {
      const month = s.stat_date?.substring(0, 7);
      if (!acc[month]) acc[month] = { month, created: 0, completed: 0, in_progress: 0, review: 0, overdue: 0, total: 0 };
      acc[month].created += s.created_count;
      acc[month].completed += s.completed_count;
      acc[month].in_progress = s.in_progress_count;
      acc[month].review = s.review_count;
      acc[month].overdue = s.overdue_count;
      acc[month].total = s.total_count;
      return acc;
    }, {})
  ) : [];

  // 연별 집계
  const yearlyStats = globalStats ? Object.values(
    globalStats.reduce((acc: any, s: any) => {
      const year = s.stat_date?.substring(0, 4);
      if (!acc[year]) acc[year] = { year, created: 0, completed: 0, in_progress: 0, review: 0, overdue: 0, total: 0 };
      acc[year].created += s.created_count;
      acc[year].completed += s.completed_count;
      acc[year].in_progress = s.in_progress_count;
      acc[year].review = s.review_count;
      acc[year].overdue = s.overdue_count;
      acc[year].total = s.total_count;
      return acc;
    }, {})
  ) : [];

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-semibold">📊 통계</h2>
        <button onClick={() => runBatch.mutate()}
          className="text-xs px-2 py-1 bg-blue-500 text-white rounded">
          배치 실행
        </button>
      </div>

      {/* 실시간 요약 */}
      {realtime && (
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-white border rounded p-3 text-center">
            <p className="text-2xl font-bold text-blue-600">{realtime.total}</p>
            <p className="text-xs text-gray-500">전체</p>
          </div>
          <div className="bg-white border rounded p-3 text-center">
            <p className="text-2xl font-bold text-green-600">{realtime.done}</p>
            <p className="text-xs text-gray-500">완료</p>
          </div>
          <div className="bg-white border rounded p-3 text-center">
            <p className="text-2xl font-bold text-yellow-600">{realtime.in_progress}</p>
            <p className="text-xs text-gray-500">진행중</p>
          </div>
          <div className="bg-white border rounded p-3 text-center">
            <p className="text-2xl font-bold text-red-600">{realtime.overdue}</p>
            <p className="text-xs text-gray-500">기한초과</p>
          </div>
        </div>
      )}

      {/* 서브탭 */}
      <div className="flex gap-1">
        {(['daily', 'monthly', 'yearly', 'user'] as const).map((v) => (
          <button key={v} onClick={() => setView(v)}
            className={`px-3 py-1 rounded text-xs
              ${view === v ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}>
            {v === 'daily' ? '일별' : v === 'monthly' ? '월별' : v === 'yearly' ? '연별' : '계정별'}
          </button>
        ))}
      </div>

      {/* 기간 선택 */}
      <div className="flex gap-2 items-center">
        <input type="date" value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          className="border rounded px-2 py-1 text-xs" />
        <span className="text-xs">~</span>
        <input type="date" value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          className="border rounded px-2 py-1 text-xs" />
      </div>

      {/* 통계 테이블 */}
      <div className="bg-white border rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2 text-left">
                {view === 'daily' ? '날짜' : view === 'monthly' ? '월' : view === 'yearly' ? '연도' : '계정'}
              </th>
              <th className="p-2 text-right">생성</th>
              <th className="p-2 text-right">완료</th>
              <th className="p-2 text-right">진행중</th>
              <th className="p-2 text-right">검토</th>
              <th className="p-2 text-right">기한초과</th>
              <th className="p-2 text-right">전체</th>
            </tr>
          </thead>
          <tbody>
            {view === 'daily' && globalStats?.map((s: any) => (
              <tr key={s.id} className="border-t hover:bg-gray-50">
                <td className="p-2">{s.stat_date}</td>
                <td className="p-2 text-right">{s.created_count}</td>
                <td className="p-2 text-right text-green-600">{s.completed_count}</td>
                <td className="p-2 text-right text-yellow-600">{s.in_progress_count}</td>
                <td className="p-2 text-right text-purple-600">{s.review_count}</td>
                <td className="p-2 text-right text-red-600">{s.overdue_count}</td>
                <td className="p-2 text-right font-medium">{s.total_count}</td>
              </tr>
            ))}
            {view === 'monthly' && (monthlyStats as any[]).map((s: any) => (
              <tr key={s.month} className="border-t hover:bg-gray-50">
                <td className="p-2">{s.month}</td>
                <td className="p-2 text-right">{s.created}</td>
                <td className="p-2 text-right text-green-600">{s.completed}</td>
                <td className="p-2 text-right text-yellow-600">{s.in_progress}</td>
                <td className="p-2 text-right text-purple-600">{s.review}</td>
                <td className="p-2 text-right text-red-600">{s.overdue}</td>
                <td className="p-2 text-right font-medium">{s.total}</td>
              </tr>
            ))}
            {view === 'yearly' && (yearlyStats as any[]).map((s: any) => (
              <tr key={s.year} className="border-t hover:bg-gray-50">
                <td className="p-2">{s.year}</td>
                <td className="p-2 text-right">{s.created}</td>
                <td className="p-2 text-right text-green-600">{s.completed}</td>
                <td className="p-2 text-right text-yellow-600">{s.in_progress}</td>
                <td className="p-2 text-right text-purple-600">{s.review}</td>
                <td className="p-2 text-right text-red-600">{s.overdue}</td>
                <td className="p-2 text-right font-medium">{s.total}</td>
              </tr>
            ))}
            {view === 'user' && userStats?.map((s: any) => {
              const u = users?.find((u: any) => u.id === s.ref_id);
              return (
                <tr key={s.id} className="border-t hover:bg-gray-50">
                  <td className="p-2">{u?.name || s.ref_id?.slice(0, 8)}</td>
                  <td className="p-2 text-right">{s.created_count}</td>
                  <td className="p-2 text-right text-green-600">{s.completed_count}</td>
                  <td className="p-2 text-right text-yellow-600">{s.in_progress_count}</td>
                  <td className="p-2 text-right text-purple-600">{s.review_count}</td>
                  <td className="p-2 text-right text-red-600">{s.overdue_count}</td>
                  <td className="p-2 text-right font-medium">{s.total_count}</td>
                </tr>
              );
            })}
            {((view === 'daily' && (!globalStats || globalStats.length === 0)) ||
              (view === 'user' && (!userStats || userStats.length === 0)) ||
              (view === 'monthly' && monthlyStats.length === 0) ||
              (view === 'yearly' && yearlyStats.length === 0)) && (
              <tr><td colSpan={7} className="p-4 text-center text-gray-400">
                통계 데이터가 없습니다. 배치를 실행해주세요.
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
