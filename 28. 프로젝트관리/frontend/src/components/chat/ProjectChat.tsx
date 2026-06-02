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
  const [attachedFile, setAttachedFile] = useState<{ name: string; data: string; type: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setAttachedFile({
        name: file.name,
        data: reader.result as string,
        type: file.type,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  const { data: messages } = useQuery<any[]>({
    queryKey: ['chat', projectId],
    queryFn: () => apiClient(`/projects/${projectId}/chat`),
    refetchInterval: isOpen && tab === 'chat' ? 3000 : false,
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage(e?: React.FormEvent | React.KeyboardEvent, customContent?: string) {
    if (e) e.preventDefault();
    const content = customContent || message;
    if (!content.trim() && !attachedFile) return;

    let finalContent = content;
    if (attachedFile) {
      finalContent = JSON.stringify({
        text: content,
        file: { name: attachedFile.name, data: attachedFile.data, type: attachedFile.type },
      });
    }

    try {
      await apiClient(`/projects/${projectId}/chat`, {
        method: 'POST',
        body: JSON.stringify({
          content: finalContent, is_notice: isNotice, hide_from_guest: hideGuest,
        }),
      });
      setMessage('');
      setAttachedFile(null);
      setIsNotice(false);
      setHideGuest(false);
      queryClient.invalidateQueries({ queryKey: ['chat', projectId] });
    } catch (err) {
      console.error('메시지 전송 실패:', err);
    }
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
                  <ChatMessageContent content={msg.content} />
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
              <label className="flex items-center gap-0.5 text-xs text-gray-500 ml-auto cursor-pointer">
                📎 파일
                <input type="file" className="hidden" onChange={handleFileSelect} />
              </label>
            </div>

            {/* 첨부파일 미리보기 */}
            {attachedFile && (
              <div className="flex items-center gap-2 mb-1 bg-gray-100 rounded px-2 py-1">
                {attachedFile.type.startsWith('image/') ? (
                  <img src={attachedFile.data} alt="" className="w-8 h-8 rounded object-cover" />
                ) : (
                  <span className="text-xs">📎</span>
                )}
                <span className="text-xs flex-1 truncate">{attachedFile.name}</span>
                <button onClick={() => setAttachedFile(null)}
                  className="text-xs text-red-400">✕</button>
              </div>
            )}

            {isNotice ? (
              <NoticeForm
                onSubmit={(title, body) => {
                  sendMessage(undefined, `[공지] ${title}\n${body}`);
                }}
                onCancel={() => setIsNotice(false)}
              />
            ) : (
              <form onSubmit={sendMessage} className="flex gap-1">
                <textarea value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(e); } }}
                  placeholder="메시지 입력... (Shift+Enter: 줄바꿈)"
                  rows={3}
                  className="flex-1 border rounded px-2 py-1 text-sm resize-none" />
                <button type="submit"
                  className="px-3 py-1 bg-blue-500 text-white rounded text-sm self-end">
                  전송
                </button>
              </form>
            )}
          </div>
        </>
      )}

      {/* DM 탭 */}
      {tab === 'dm' && <DmTab />}

      {/* 파일 탭 */}
      {tab === 'files' && (
        <div className="flex-1 overflow-y-auto p-2">
          <h3 className="text-xs font-medium mb-2">공유된 파일</h3>
          {(() => {
            const fileMessages = messages?.filter((m: any) => {
              try { const p = JSON.parse(m.content); return !!p.file; } catch { return false; }
            }) || [];
            if (fileMessages.length === 0) {
              return <p className="text-xs text-gray-400 text-center py-8">공유된 파일이 없습니다</p>;
            }
            return (
              <div className="space-y-1">
                {fileMessages.map((m: any) => {
                  const parsed = JSON.parse(m.content);
                  const file = parsed.file;
                  const isImage = file.type?.startsWith('image/');
                  return (
                    <a key={m.id} href={file.data} download={file.name}
                      className="flex items-center gap-2 bg-white border rounded px-2 py-2
                        hover:bg-gray-50 cursor-pointer">
                      {isImage ? (
                        <img src={file.data} alt="" className="w-10 h-10 rounded object-cover" />
                      ) : (
                        <span className="text-lg">📄</span>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{file.name}</p>
                        <p className="text-xs text-gray-400">{m.user_name}</p>
                      </div>
                      <span className="text-xs text-blue-500">📥</span>
                    </a>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}

      {/* 공지 탭 */}
      {tab === 'notices' && (
        <div className="flex-1 overflow-y-auto p-2">
          {messages?.filter((m: any) => m.is_notice).length ? (
            messages.filter((m: any) => m.is_notice).map((m: any) => {
              const lines = m.content?.split('\n') || [];
              const title = lines[0]?.replace('[공지] ', '') || '';
              const body = lines.slice(1).join('\n');
              return (
                <div key={m.id} className="bg-yellow-50 border border-yellow-200
                  rounded p-2 mb-2">
                  <p className="text-xs font-semibold text-yellow-800">{title}</p>
                  {body && <p className="text-xs text-gray-700 mt-1 whitespace-pre-wrap">{body}</p>}
                  <p className="text-xs text-gray-400 mt-1">{m.user_name}</p>
                </div>
              );
            })
          ) : (
            <p className="text-xs text-gray-400 text-center py-8">공지 없음</p>
          )}
        </div>
      )}
    </div>
  );
}

function DmTab() {
  const [activeConvo, setActiveConvo] = useState<any>(null);
  const [dmMessage, setDmMessage] = useState('');
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);

  const { data: users } = useQuery<any[]>({
    queryKey: ['dm-users'],
    queryFn: () => apiClient('/auth/users'),
  });

  const { data: dmMessages } = useQuery<any[]>({
    queryKey: ['dm-messages', activeConvo?.id],
    queryFn: () => apiClient(`/conversations/${activeConvo.id}/messages`),
    enabled: !!activeConvo,
    refetchInterval: 3000,
  });

  const createDm = useMutation({
    mutationFn: (id: string) =>
      apiClient('/conversations/dm', {
        method: 'POST',
        body: JSON.stringify({ target_user_id: id }),
      }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setActiveConvo(data);
    },
  });

  const sendDm = useMutation({
    mutationFn: (content: string) =>
      apiClient(`/conversations/${activeConvo.id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dm-messages', activeConvo.id] });
      setDmMessage('');
    },
  });

  if (activeConvo) {
    return (
      <div className="flex-1 flex flex-col">
        <div className="p-2 border-b flex items-center gap-2">
          <button onClick={() => setActiveConvo(null)}
            className="text-xs text-blue-500">← 목록</button>
          <span className="text-xs font-medium">1:1 대화</span>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-gray-50">
          {dmMessages?.map((m: any) => (
            <div key={m.id} className={`flex flex-col
              ${m.sender_id === currentUser?.id ? 'items-end' : 'items-start'}`}>
              <span className="text-xs text-gray-400">{m.sender_name}</span>
              <div className={`px-2 py-1 rounded-lg text-xs max-w-[75%]
                ${m.sender_id === currentUser?.id
                  ? 'bg-blue-500 text-white' : 'bg-white border'}`}>
                {m.content}
              </div>
            </div>
          ))}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); if (dmMessage.trim()) sendDm.mutate(dmMessage); }}
          className="p-2 border-t flex gap-1">
          <input type="text" value={dmMessage}
            onChange={(e) => setDmMessage(e.target.value)}
            placeholder="메시지..."
            className="flex-1 border rounded px-2 py-1 text-xs" />
          <button type="submit"
            className="px-2 py-1 bg-blue-500 text-white rounded text-xs">전송</button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-2">
      <p className="text-xs text-gray-500 mb-2">대화할 상대를 선택하세요</p>
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

// === 공지 작성 폼 ===
function NoticeForm({ onSubmit, onCancel }: {
  onSubmit: (title: string, body: string) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [fileName, setFileName] = useState('');

  return (
    <div className="space-y-1.5 bg-yellow-50 border border-yellow-200 rounded p-2">
      <p className="text-xs font-medium text-yellow-700">📢 공지 작성</p>
      <input type="text" value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="공지 제목"
        className="w-full border rounded px-2 py-1 text-xs" />
      <textarea value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="공지 내용"
        rows={3}
        className="w-full border rounded px-2 py-1 text-xs resize-none" />
      <div className="flex items-center gap-2">
        <label className="text-xs text-blue-500 cursor-pointer">
          📎 첨부파일
          <input type="file" className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) setFileName(f.name);
            }} />
        </label>
        {fileName && <span className="text-xs text-gray-500">{fileName}</span>}
      </div>
      <div className="flex gap-1 justify-end">
        <button onClick={() => { if (title.trim()) onSubmit(title, body + (fileName ? `\n📎 ${fileName}` : '')); }}
          disabled={!title.trim()}
          className="px-2 py-1 bg-yellow-500 text-white rounded text-xs disabled:opacity-50">
          공지 등록
        </button>
        <button onClick={onCancel}
          className="px-2 py-1 border rounded text-xs">취소</button>
      </div>
    </div>
  );
}

// === 메시지 내용 렌더링 (파일 포함) ===
function ChatMessageContent({ content }: { content: string }) {
  // JSON 파일 첨부 메시지 파싱 시도
  try {
    const parsed = JSON.parse(content);
    if (parsed.file) {
      const isImage = parsed.file.type?.startsWith('image/');
      return (
        <div>
          {parsed.text && <p className="mb-1">{parsed.text}</p>}
          {isImage ? (
            <a href={parsed.file.data} download={parsed.file.name}
              className="block">
              <img src={parsed.file.data} alt={parsed.file.name}
                className="max-w-[200px] max-h-[150px] rounded border cursor-pointer" />
              <span className="text-xs opacity-70">📥 {parsed.file.name}</span>
            </a>
          ) : (
            <a href={parsed.file.data} download={parsed.file.name}
              className="flex items-center gap-1 bg-black/10 rounded px-2 py-1 mt-1">
              <span>📎</span>
              <span className="text-xs underline">{parsed.file.name}</span>
              <span className="text-xs opacity-70">📥</span>
            </a>
          )}
        </div>
      );
    }
  } catch {
    // JSON이 아니면 일반 텍스트
  }

  return <span className="whitespace-pre-wrap">{content}</span>;
}
