import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import { useAuthStore } from '@/stores/authStore';

interface ProjectChatProps {
  projectId: string;
}

export function ProjectChat({ projectId }: ProjectChatProps) {
  const [message, setMessage] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);

  const { data: messages } = useQuery<any[]>({
    queryKey: ['chat', projectId],
    queryFn: () => apiClient(`/projects/${projectId}/chat`),
    refetchInterval: isOpen ? 3000 : false,
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;
    await apiClient(`/projects/${projectId}/chat`, {
      method: 'POST',
      body: JSON.stringify({ content: message }),
    });
    setMessage('');
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
    <div className="fixed bottom-20 right-4 w-80 h-96 bg-white border
      rounded-lg shadow-xl flex flex-col z-30">
      <div className="p-3 border-b flex justify-between items-center
        bg-blue-500 text-white rounded-t-lg">
        <span className="text-sm font-medium">프로젝트 채팅</span>
        <button onClick={() => setIsOpen(false)} className="text-white/80
          hover:text-white">✕</button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {messages?.map((msg: any) => (
          <div key={msg.id}
            className={`flex flex-col ${msg.user_id === currentUser?.id
              ? 'items-end' : 'items-start'}`}>
            <span className="text-xs text-gray-400 mb-0.5">
              {msg.user_name}
            </span>
            <div className={`px-3 py-1.5 rounded-lg text-sm max-w-[80%]
              ${msg.user_id === currentUser?.id
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-800'}`}>
              {msg.content}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={sendMessage} className="p-2 border-t flex gap-1">
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
  );
}
