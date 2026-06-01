import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

interface CommentSectionProps {
  cardId: string;
}

export function CommentSection({ cardId }: CommentSectionProps) {
  const [content, setContent] = useState('');
  const queryClient = useQueryClient();

  const { data: comments } = useQuery<any[]>({
    queryKey: ['comments', cardId],
    queryFn: () => apiClient(`/cards/${cardId}/comments`),
  });

  const addComment = useMutation({
    mutationFn: (text: string) =>
      apiClient(`/cards/${cardId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ content: text }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', cardId] });
      setContent('');
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;
    addComment.mutate(content);
  }

  return (
    <div>
      <h3 className="text-xs font-medium text-gray-500 mb-2">
        댓글 ({comments?.length || 0})
      </h3>

      {/* 댓글 목록 */}
      {comments && comments.length > 0 && (
        <div className="space-y-2 mb-3 max-h-48 overflow-y-auto">
          {comments.map((c: any) => (
            <div key={c.id} className="bg-gray-50 rounded p-2">
              <div className="flex justify-between items-center mb-0.5">
                <span className="text-xs font-medium">
                  {c.author_name || '사용자'}
                </span>
                <span className="text-xs text-gray-400">
                  {new Date(c.created_at).toLocaleString('ko-KR', {
                    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                  })}
                </span>
              </div>
              <p className="text-xs text-gray-700">{c.content}</p>
            </div>
          ))}
        </div>
      )}

      {/* 댓글 입력 */}
      <form onSubmit={handleSubmit} className="flex gap-1">
        <input type="text" value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="댓글 입력..."
          className="flex-1 border rounded px-2 py-1 text-xs" />
        <button type="submit" disabled={!content.trim()}
          className="px-2 py-1 bg-blue-500 text-white rounded text-xs
            disabled:opacity-50">전송</button>
      </form>
    </div>
  );
}
