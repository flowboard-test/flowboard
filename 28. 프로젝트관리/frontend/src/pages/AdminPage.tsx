import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { useAuthStore } from '@/stores/authStore';

type AdminTab = 'org' | 'position' | 'rank' | 'permission' | 'upload';

export function AdminPage() {
  const [tab, setTab] = useState<AdminTab>('org');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [search, setSearch] = useState('');
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
              <AddDeptButton />
              <AddUserButton />
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
                onSelect={setSelectedUser} />
            </div>
          </div>

          {/* 우측: 사용자 상세 폼 */}
          <div className="flex-1 overflow-y-auto bg-gray-50">
            {selectedUser ? (
              <UserDetailForm user={selectedUser}
                onUpdate={() => {
                  queryClient.invalidateQueries({ queryKey: ['admin-users'] });
                  queryClient.invalidateQueries({ queryKey: ['admin-org'] });
                }} />
            ) : (
              <div className="flex items-center justify-center h-full
                text-gray-400 text-sm">
                좌측에서 사용자를 선택하세요
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
  return (
    <div className="text-xs">
      <div className="font-medium text-gray-700 mb-1">🏢 FlowBoard</div>
      {orgData?.departments?.map((dept: any) => (
        <div key={dept.id} className="ml-3 mb-1">
          <div className="font-medium text-gray-600 py-0.5">
            📁 {dept.name}
          </div>
          {dept.users?.map((u: any) => (
            <div key={u.id}
              onClick={() => onSelect(u)}
              className={`ml-4 py-0.5 px-1 rounded cursor-pointer
                ${selectedId === u.id ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'}`}>
              👤 {u.name} {u.position || ''}
            </div>
          ))}
        </div>
      ))}
      {orgData?.unassigned?.length > 0 && (
        <div className="ml-3 mb-1">
          <div className="font-medium text-gray-400 py-0.5">📁 부서미지정</div>
          {orgData.unassigned.map((u: any) => (
            <div key={u.id}
              onClick={() => onSelect(u)}
              className={`ml-4 py-0.5 px-1 rounded cursor-pointer
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
function AddDeptButton() {
  const [show, setShow] = useState(false);
  const [name, setName] = useState('');
  const queryClient = useQueryClient();
  const addDept = useMutation({
    mutationFn: (n: string) =>
      apiClient('/auth/organization/departments', {
        method: 'POST', body: JSON.stringify({ name: n }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-org'] });
      setName(''); setShow(false);
    },
  });
  if (!show) return (
    <button onClick={() => setShow(true)}
      className="px-2 py-1 bg-gray-100 rounded text-xs hover:bg-gray-200">
      부서 추가
    </button>
  );
  return (
    <div className="flex gap-1">
      <input type="text" value={name} onChange={(e) => setName(e.target.value)}
        placeholder="부서명" className="border rounded px-1 py-0.5 text-xs w-20" />
      <button onClick={() => addDept.mutate(name)}
        className="px-1 py-0.5 bg-blue-500 text-white rounded text-xs">확인</button>
      <button onClick={() => setShow(false)}
        className="px-1 py-0.5 border rounded text-xs">취소</button>
    </div>
  );
}

// === 사용자 추가 버튼 ===
function AddUserButton() {
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const queryClient = useQueryClient();
  const addUser = useMutation({
    mutationFn: (data: { email: string; name: string }) =>
      apiClient('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ ...data, password: 'password123' }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      queryClient.invalidateQueries({ queryKey: ['admin-org'] });
      setEmail(''); setName(''); setShow(false);
    },
  });
  if (!show) return (
    <button onClick={() => setShow(true)}
      className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs
        hover:bg-blue-200">
      사용자 추가
    </button>
  );
  return (
    <div className="flex gap-1 flex-wrap">
      <input type="text" value={name} onChange={(e) => setName(e.target.value)}
        placeholder="이름" className="border rounded px-1 py-0.5 text-xs w-16" />
      <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
        placeholder="이메일" className="border rounded px-1 py-0.5 text-xs w-28" />
      <button onClick={() => addUser.mutate({ email, name })}
        className="px-1 py-0.5 bg-blue-500 text-white rounded text-xs">등록</button>
      <button onClick={() => setShow(false)}
        className="px-1 py-0.5 border rounded text-xs">취소</button>
    </div>
  );
}

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
  return (
    <div className="p-6"><p className="text-sm text-gray-500">
      직위 관리 (팀장, 선임, 사원 등) - 추후 구현
    </p></div>
  );
}
function RankTab() {
  return (
    <div className="p-6"><p className="text-sm text-gray-500">
      직책 관리 (부장, 차장, 과장 등) - 추후 구현
    </p></div>
  );
}
function PermissionTab() {
  return (
    <div className="p-6"><p className="text-sm text-gray-500">
      권한 관리 (역할별 접근 권한 설정) - 추후 구현
    </p></div>
  );
}
