import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { useAuthStore } from '@/stores/authStore';

type AdminTab = 'org' | 'position' | 'rank' | 'permission' | 'upload';

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
                onSelect={(u: any) => { setSelectedUser(u); setRightPanel('user'); }} />
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
    </div>
  );
}

// === 조직도 트리 ===
function OrgTree({ orgData, selectedId, onSelect }: any) {
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set());
  const [dragOverDept, setDragOverDept] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const sortedDepts = [...(orgData?.departments || [])].sort(
    (a: any, b: any) => a.name.localeCompare(b.name, 'ko')
  );

  function toggleDept(deptId: string) {
    const next = new Set(expandedDepts);
    if (next.has(deptId)) next.delete(deptId);
    else next.add(deptId);
    setExpandedDepts(next);
  }

  async function handleDropUser(userId: string, deptName: string) {
    try {
      await apiClient(`/admin/users/${userId}/department`, {
        method: 'PUT',
        body: JSON.stringify({ department: deptName }),
      });
      queryClient.invalidateQueries({ queryKey: ['admin-org'] });
    } catch {
      alert('부서 이동에 실패했습니다');
    }
    setDragOverDept(null);
  }

  return (
    <div className="text-xs">
      <div className="font-medium text-gray-700 mb-2 px-1">🏢 FlowBoard</div>

      {sortedDepts.map((dept: any) => (
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
            }
            setDragOverDept(null);
          }}>
          <div
            onClick={() => toggleDept(dept.id)}
            className={`flex items-center gap-1 py-1 px-1 rounded
              cursor-pointer hover:bg-gray-100
              ${dragOverDept === dept.id ? 'bg-blue-100 ring-1 ring-blue-400' : ''}`}>
            <span>{expandedDepts.has(dept.id) ? '📂' : '📁'}</span>
            <span className="font-medium text-gray-600">{dept.name}</span>
            <span className="text-gray-400 ml-auto">
              {dept.users?.length || 0}
            </span>
          </div>


          {/* 부서 펼침 시 소속 사용자 표시 */}
          {expandedDepts.has(dept.id) && dept.users?.map((u: any) => (
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

      {/* 부서미지정 (펼침 가능) */}
      {orgData?.unassigned?.length > 0 && (
        <div className="ml-3 mt-2">
          <div className="font-medium text-gray-400 py-1 px-1">
            📁 부서미지정 ({orgData.unassigned.length})
          </div>
          {orgData.unassigned.map((u: any) => (
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
  useState(() => {
    setForm({
      name: user.name || '', email: user.email || '',
      department: user.department || '', position: user.position || '',
      phone: user.phone || '',
    });
  });

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
  return (
    <div className="p-6 max-w-lg">
      <h2 className="text-sm font-semibold mb-3">조직도 엑셀 업로드</h2>
      <p className="text-xs text-gray-500 mb-2">
        형식: 이름, 이메일, 부서, 직위, 전화번호 (CSV/XLSX)
      </p>
      <input type="file" accept=".xlsx,.csv"
        onChange={(e) => setFile(e.target.files?.[0] || null)} className="text-xs" />
      <button onClick={upload} disabled={!file}
        className="ml-2 px-3 py-1 bg-blue-500 text-white rounded text-xs
          disabled:opacity-50">업로드</button>
      {msg && <p className="text-xs text-green-600 mt-2">{msg}</p>}
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
