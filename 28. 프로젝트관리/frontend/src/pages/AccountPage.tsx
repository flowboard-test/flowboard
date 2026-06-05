import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { useAuthStore } from '@/stores/authStore';

export function AccountPage() {
  const user = useAuthStore((s) => s.user);
  const setAuth = useAuthStore((s) => s.setAuth);
  const queryClient = useQueryClient();

  const [name, setName] = useState(user?.name || '');
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [msg, setMsg] = useState('');
  const [pwMsg, setPwMsg] = useState('');

  const { data: profile } = useQuery<any>({
    queryKey: ['profile'],
    queryFn: () => apiClient('/auth/me'),
  });

  const updateProfile = useMutation({
    mutationFn: (data: { name: string }) =>
      apiClient('/auth/me', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: (data: any) => {
      const token = useAuthStore.getState().token!;
      setAuth(data, token);
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setMsg('프로필이 수정되었습니다');
      setTimeout(() => setMsg(''), 3000);
    },
  });

  const changePw = useMutation({
    mutationFn: (data: { current_password: string; new_password: string }) =>
      apiClient('/auth/me/password', {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      setPwMsg('비밀번호가 변경되었습니다');
      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
      setTimeout(() => setPwMsg(''), 3000);
    },
    onError: (err: any) => {
      setPwMsg(err.data?.message || '비밀번호 변경 실패');
    },
  });

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-xl font-bold">계정 관리</h1>

      {/* 프로필 수정 */}
      <div className="bg-white border rounded-lg p-4 space-y-3">
        <h2 className="text-sm font-semibold">프로필 정보</h2>
        <div>
          <label className="text-xs text-gray-500">이메일</label>
          <p className="text-sm text-gray-700">{profile?.email || user?.email}</p>
        </div>
        <div>
          <label className="text-xs text-gray-500">이름</label>
          <input type="text" value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-xs text-gray-500">가입일</label>
          <p className="text-sm text-gray-700">
            {profile?.created_at
              ? new Date(profile.created_at).toLocaleDateString('ko-KR')
              : '-'}
          </p>
        </div>
        <button onClick={() => updateProfile.mutate({ name })}
          disabled={!name.trim()}
          className="px-4 py-2 bg-blue-500 text-white rounded text-sm
            disabled:opacity-50 hover:bg-blue-600">
          프로필 저장
        </button>
        {msg && <p className="text-xs text-green-600">{msg}</p>}
      </div>

      {/* 비밀번호 변경 */}
      <div className="bg-white border rounded-lg p-4 space-y-3">
        <h2 className="text-sm font-semibold">비밀번호 변경</h2>
        <input type="password" placeholder="현재 비밀번호"
          value={currentPw} onChange={(e) => setCurrentPw(e.target.value)}
          className="w-full border rounded px-3 py-2 text-sm" />
        <input type="password" placeholder="새 비밀번호 (8자 이상)"
          value={newPw} onChange={(e) => setNewPw(e.target.value)}
          className="w-full border rounded px-3 py-2 text-sm" />
        <input type="password" placeholder="새 비밀번호 확인"
          value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)}
          className="w-full border rounded px-3 py-2 text-sm" />
        {newPw && confirmPw && newPw !== confirmPw && (
          <p className="text-xs text-red-500">비밀번호가 일치하지 않습니다</p>
        )}
        <button
          onClick={() => changePw.mutate({
            current_password: currentPw,
            new_password: newPw,
          })}
          disabled={!currentPw || !newPw || newPw !== confirmPw || newPw.length < 8}
          className="px-4 py-2 bg-blue-500 text-white rounded text-sm
            disabled:opacity-50 hover:bg-blue-600">
          비밀번호 변경
        </button>
        {pwMsg && (
          <p className={`text-xs ${pwMsg.includes('실패') ? 'text-red-500' : 'text-green-600'}`}>
            {pwMsg}
          </p>
        )}
      </div>

      {/* U+웍스 그룹웨어 연동 */}
      <ExternalLinkSection />

      {/* 알림 수신 설정 */}
      <NotificationSettings />
    </div>
  );
}

function ExternalLinkSection() {
  const { data: status } = useQuery<any>({
    queryKey: ['external-status'],
    queryFn: () => apiClient('/auth/external/status'),
  });

  const queryClient = useQueryClient();
  const unlinkMutation = useMutation({
    mutationFn: () => apiClient('/auth/external/unlink', { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['external-status'] }),
  });

  return (
    <div className="bg-white border rounded-lg p-4 space-y-3">
      <h2 className="text-sm font-semibold">U+웍스 그룹웨어 연동</h2>
      {status?.is_linked ? (
        <div>
          <p className="text-sm text-green-600">✓ 연동됨 ({status.provider})</p>
          <p className="text-xs text-gray-500">외부 ID: {status.external_id}</p>
          <button onClick={() => unlinkMutation.mutate()}
            className="mt-2 px-3 py-1.5 border border-red-300 text-red-600
              rounded text-xs hover:bg-red-50">
            연동 해제
          </button>
        </div>
      ) : (
        <div>
          <p className="text-sm text-gray-500">연동되지 않음</p>
          <p className="text-xs text-gray-400 mt-1">
            U+웍스 계정으로 로그인하면 자동으로 연동됩니다.
          </p>
          <button className="mt-2 px-4 py-2 bg-purple-600 text-white
            rounded text-sm hover:bg-purple-700">
            U+웍스로 로그인
          </button>
        </div>
      )}
    </div>
  );
}

function NotificationSettings() {
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [saved, setSaved] = useState(false);

  const types = [
    { key: 'transfer_received', label: '업무 이관 수신' },
    { key: 'transfer_rejected', label: '반려 알림' },
    { key: 'deadline_approaching', label: '마감 임박' },
    { key: 'deadline_overdue', label: '기한 초과' },
    { key: 'mention', label: '멘션 알림' },
  ];

  async function toggleSetting(type: string, channel: string) {
    const current = settings[type] || {};
    const newVal = !(current[channel] ?? true);
    const updated = { ...current, [channel]: newVal };
    setSettings({ ...settings, [type]: updated });
    await apiClient('/notifications/settings', {
      method: 'PUT',
      body: JSON.stringify({
        notification_type: type,
        [`channel_${channel}`]: newVal,
      }),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div className="bg-white border rounded-lg p-4 space-y-3">
      <h2 className="text-sm font-semibold">알림 수신 설정</h2>
      {saved && <p className="text-xs text-green-600">저장됨</p>}
      <div className="space-y-2">
        {types.map((t) => (
          <div key={t.key} className="flex items-center justify-between">
            <span className="text-xs">{t.label}</span>
            <div className="flex gap-2">
              {['in_app', 'email', 'push'].map((ch) => (
                <button key={ch}
                  onClick={() => toggleSetting(t.key, ch)}
                  className={`px-2 py-0.5 rounded text-xs border
                    ${(settings[t.key]?.[ch] ?? true)
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-500'}`}>
                  {ch === 'in_app' ? '앱' :
                   ch === 'email' ? '이메일' : '푸시'}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
