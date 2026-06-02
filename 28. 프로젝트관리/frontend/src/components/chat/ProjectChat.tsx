import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { useAuthStore } from '@/stores/authStore';

interface ProjectChatProps {
  projectId: string;
}

type ChatTab = 'chat' | 'dm' | 'files' | 'notices';

export function ProjectChat({ projectId }: ProjectChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<ChatTab>('chat');
  const [message, setMessage] = useState('');
  const [isNotice, setIsNotice] = useState(false);
  const [hideGuest, setHideGuest] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);

  const { data: messages } = useQuery<any[]>({
    queryKey: ['chat', projectId],
    queryFn: () => apiClient(`/projects/${projectId}/chat`),
    refetchInterval: isOpen && tab === 'chat' ? 3000 : false,
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    await apiClient(`/projects/${projectId}/chat`, {
      method: 'POST',
      body: JSON.stringify({
        content: message, is_notice: isNotice, hide_from_guest: hideGuest,
      }),
    });
    setMessage('');
    setIsNotice(false);
    setHideGuest(false);
    queryClient.invalidateQueries({ queryKey: ['chat', projectId] });
  }

  if (!isOpen) {
    return (
      <button onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 w-12 h-12 bg-blue-500
          text-white rounded-full shadow-lg hover:bg-blue-600
          flex items-center justify-center text-lg z-30">
        💬
      </button>
    );
  }

  return (
    <div className="fixed bottom-20 right-4 w-96 h-[480px] bg-white border
      rounded-lg shadow-xl flex flex-col z-30">
      {/* 헤더 */}
      <div className="p-2 border-b bg-blue-500 text-white rounded-t-lg
        flex justify-between items-center">
        <div className="flex gap-1">
          {(['chat', 'dm', 'files', 'notices'] as ChatTab[]).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-2 py-0.5 rounded text-xs
                ${tab === t ? 'bg-white/20' : 'hover:bg-white/10'}`}>
              {t === 'chat' ? '채팅' : t === 'dm' ? 'DM' :
               t === 'files' ? '파일' : '공지'}
            </button>
          ))}
        </div>
        <button onClick={() => setIsOpen(false)}
          className="text-white/80 hover:text-white">✕</button>
      </div>

      {/* 채팅 탭 */}
      {tab === 'chat' && (
        <>
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5 bg-gray-50">
            {messages?.map((msg: any) => (
              <div key={msg.id}
                className={`flex flex-col
                  ${msg.user_id === currentUser?.id ? 'items-end' : 'items-start'}`}>
                <span className="text-xs text-gray-400">{msg.user_name}</span>
                <div className={`px-2.5 py-1 rounded-lg text-sm max-w-[75%]
                  ${msg.user_id === currentUser?.id
                    ? 'bg-blue-500 text-white' : 'bg-white border'}`}>
                  {msg.content}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div className="p-2 border-t">
            <div className="flex gap-2 mb-1">
              <label className="flex items-center gap-0.5 text-xs text-gray-500">
                <input type="checkbox" checked={isNotice}
                  onChange={(e) => setIsNotice(e.target.checked)}
                  className="w-3 h-3" /> 공지
              </label>
              <label className="flex items-center gap-0.5 text-xs text-gray-500">
                <input type="checkbox" checked={hideGuest}
                  onChange={(e) => setHideGuest(e.target.checked)}
                  className="w-3 h-3" /> 게스트숨김
              </label>
            </div>
            <form onSubmit={sendMessage} className="flex gap-1">
              <input type="text" value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="메시지 입력..."
                className="flex-1 border rounded px-2 py-1 text-sm" />
              <button type="submit"
                className="px-3 py-1 bg-blue-500 text-white rounded text-sm">
                전송
              </button>
            </form>
          </div>
        </>
      )}

      {/* DM 탭 */}
      {tab === 'dm' && <DmTab />}

      {/* 파일 탭 */}
      {tab === 'files' && (
        <div className="flex-1 overflow-y-auto p-3">
          <p className="text-xs text-gray-400 text-center py-8">
            채팅에서 공유된 파일이 여기에 표시됩니다
          </p>
        </div>
      )}

      {/* 공지 탭 */}
      {tab === 'notices' && (
        <div className="flex-1 overflow-y-auto p-2">
          {messages?.filter((m: any) => m.is_notice).length ? (
            messages.filter((m: any) => m.is_notice).map((m: any) => (
              <div key={m.id} className="bg-yellow-50 border border-yellow-200
                rounded p-2 mb-1">
                <p className="text-xs">{m.content}</p>
                <p className="text-xs text-gray-400 mt-0.5">{m.user_name}</p>
              </div>
            ))
          ) : (
            <p className="text-xs text-gray-400 text-center py-8">공지 없음</p>
          )}
        </div>
      )}
    </div>
  );
}

function DmTab() {
  const { data: users } = useQuery<any[]>({
    queryKey: ['dm-users'],
    queryFn: () => apiClient('/auth/users'),
  });

  const queryClient = useQueryClient();
  const createDm = useMutation({
    mutationFn: (id: string) =>
      apiClient('/conversations/dm', {
        method: 'POST',
        body: JSON.stringify({ target_user_id: id }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      alert('DM 대화방이 생성되었습니다. 메신저 페이지에서 확인하세요.');
    },
  });

  return (
    <div className="flex-1 overflow-y-auto p-2">
      <p className="text-xs text-gray-500 mb-2">1:1 대화할 상대 선택</p>
      <div className="space-y-0.5">
        {users?.map((u: any) => (
          <button key={u.id}
            onClick={() => createDm.mutate(u.id)}
            className="w-full text-left px-2 py-1.5 text-xs rounded
              hover:bg-blue-50 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-blue-100 flex
              items-center justify-center text-xs">{u.name?.charAt(0)}</span>
            <span>{u.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
