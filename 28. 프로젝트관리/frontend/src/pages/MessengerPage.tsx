import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { useAuthStore } from '@/stores/authStore';

export function MessengerPage() {
  const [activeConvo, setActiveConvo] = useState<any>(null);
  const [showNewDm, setShowNewDm] = useState(false);

  const { data: conversations } = useQuery<any[]>({
    queryKey: ['conversations'],
    queryFn: () => apiClient('/conversations'),
  });

  const { data: users } = useQuery<any[]>({
    queryKey: ['all-users-msg'],
    queryFn: () => apiClient('/auth/users'),
    enabled: showNewDm,
  });

  const queryClient = useQueryClient();
  const createDm = useMutation({
    mutationFn: (targetId: string) =>
      apiClient('/conversations/dm', {
        method: 'POST',
        body: JSON.stringify({ target_user_id: targetId }),
      }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setActiveConvo(data);
      setShowNewDm(false);
    },
  });

  return (
    <div className="h-full flex">
      {/* 좌측: 대화방 목록 */}
      <div className="w-64 border-r bg-white flex flex-col">
        <div className="p-3 border-b flex justify-between items-center">
          <h2 className="text-sm font-semibold">메신저</h2>
          <button onClick={() => setShowNewDm(true)}
            className="text-xs text-blue-500">+ 대화</button>
        </div>

        {showNewDm && (
          <div className="p-2 border-b bg-blue-50">
            <p className="text-xs text-gray-500 mb-1">대화 상대 선택</p>
            <div className="max-h-40 overflow-y-auto space-y-0.5">
              {users?.map((u: any) => (
                <button key={u.id} onClick={() => createDm.mutate(u.id)}
                  className="w-full text-left px-2 py-1 text-xs rounded
                    hover:bg-blue-100">{u.name} ({u.email})</button>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {conversations?.map((c: any) => (
            <button key={c.id}
              onClick={() => setActiveConvo(c)}
              className={`w-full text-left px-3 py-2 border-b text-sm
                ${activeConvo?.id === c.id ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
              {c.name || `대화방`}
              <p className="text-xs text-gray-400">{c.type === 'dm' ? '1:1' : '그룹'}</p>
            </button>
          ))}
        </div>
      </div>

      {/* 우측: 메시지 */}
      <div className="flex-1 flex flex-col">
        {activeConvo ? (
          <ChatArea conversationId={activeConvo.id} />
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
            대화방을 선택하세요
          </div>
        )}
      </div>
    </div>
  );
}

function ChatArea({ conversationId }: { conversationId: string }) {
  const [msg, setMsg] = useState('');
  const [isNotice, setIsNotice] = useState(false);
  const [hideGuest, setHideGuest] = useState(false);
  const [tab, setTab] = useState<'chat' | 'files' | 'notices'>('chat');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const currentUser = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const { data: messages } = useQuery<any[]>({
    queryKey: ['messages', conversationId],
    queryFn: () => apiClient(`/conversations/${conversationId}/messages`),
    refetchInterval: 3000,
  });

  const { data: files } = useQuery<any[]>({
    queryKey: ['conv-files', conversationId],
    queryFn: () => apiClient(`/conversations/${conversationId}/files`),
    enabled: tab === 'files',
  });

  const { data: notices } = useQuery<any[]>({
    queryKey: ['conv-notices', conversationId],
    queryFn: () => apiClient(`/conversations/${conversationId}/notices`),
    enabled: tab === 'notices',
  });

  const sendMsg = useMutation({
    mutationFn: (data: any) =>
      apiClient(`/conversations/${conversationId}/messages`, {
        method: 'POST', body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] });
      setMsg(''); setIsNotice(false); setHideGuest(false);
    },
  });

  const deleteMsg = useMutation({
    mutationFn: (id: string) =>
      apiClient(`/messages/${id}`, { method: 'DELETE' }),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['messages', conversationId] }),
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <>
      {/* 상단 탭 */}
      <div className="flex gap-2 p-2 border-b bg-white">
        <button onClick={() => setTab('chat')}
          className={`px-3 py-1 rounded text-xs ${tab === 'chat' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}>
          대화
        </button>
        <button onClick={() => setTab('files')}
          className={`px-3 py-1 rounded text-xs ${tab === 'files' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}>
          파일방
        </button>
        <button onClick={() => setTab('notices')}
          className={`px-3 py-1 rounded text-xs ${tab === 'notices' ? 'bg-blue-500 text-white' : 'bg-gray-100'}`}>
          공지
        </button>
      </div>

      {tab === 'chat' && (
        <>
          {/* 메시지 목록 */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-gray-50">
            {messages?.map((m: any) => (
              <div key={m.id}
                className={`flex flex-col ${m.sender_id === currentUser?.id ? 'items-end' : 'items-start'}`}>
                <span className="text-xs text-gray-400 mb-0.5">{m.sender_name}</span>
                <div className={`relative group px-3 py-1.5 rounded-lg text-sm max-w-[70%]
                  ${m.is_notice ? 'bg-yellow-100 border border-yellow-300' :
                    m.sender_id === currentUser?.id ? 'bg-blue-500 text-white' : 'bg-white border'}`}>
                  {m.hide_from_guest && <span className="text-xs">🔒</span>}
                  {m.content}
                  {m.sender_id === currentUser?.id && (
                    <button onClick={() => deleteMsg.mutate(m.id)}
                      className="hidden group-hover:block absolute -top-2 -right-2
                        text-xs bg-red-500 text-white rounded-full w-4 h-4">×</button>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* 입력 */}
          <div className="p-2 border-t bg-white">
            <div className="flex gap-1 mb-1">
              <label className="flex items-center gap-0.5 text-xs">
                <input type="checkbox" checked={isNotice}
                  onChange={(e) => setIsNotice(e.target.checked)} className="w-3 h-3" />
                공지
              </label>
              <label className="flex items-center gap-0.5 text-xs">
                <input type="checkbox" checked={hideGuest}
                  onChange={(e) => setHideGuest(e.target.checked)} className="w-3 h-3" />
                게스트 숨김
              </label>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); if (msg.trim()) sendMsg.mutate({
              content: msg, is_notice: isNotice, hide_from_guest: hideGuest }); }}
              className="flex gap-1">
              <input type="text" value={msg} onChange={(e) => setMsg(e.target.value)}
                placeholder="메시지 입력..."
                className="flex-1 border rounded px-2 py-1 text-sm" />
              <button type="submit" className="px-3 py-1 bg-blue-500 text-white rounded text-sm">
                전송</button>
            </form>
          </div>
        </>
      )}

      {tab === 'files' && (
        <div className="flex-1 overflow-y-auto p-3">
          <h3 className="text-sm font-medium mb-2">파일방</h3>
          {files && files.length > 0 ? (
            <div className="space-y-1">
              {files.map((f: any) => (
                <div key={f.id} className="flex items-center gap-2 bg-white
                  border rounded px-3 py-2">
                  <span>📎</span>
                  <span className="text-sm flex-1">{f.file_name}</span>
                  <span className="text-xs text-gray-400">
                    {(f.file_size / 1024).toFixed(0)}KB
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">파일이 없습니다</p>
          )}
        </div>
      )}

      {tab === 'notices' && (
        <div className="flex-1 overflow-y-auto p-3">
          <h3 className="text-sm font-medium mb-2">공지사항</h3>
          {notices && notices.length > 0 ? (
            <div className="space-y-2">
              {notices.map((n: any) => (
                <div key={n.id} className="bg-yellow-50 border border-yellow-200
                  rounded p-3">
                  <p className="text-sm">{n.content}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {n.sender_name} · {new Date(n.created_at).toLocaleString('ko-KR')}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">공지가 없습니다</p>
          )}
        </div>
      )}
    </>
  );
}
