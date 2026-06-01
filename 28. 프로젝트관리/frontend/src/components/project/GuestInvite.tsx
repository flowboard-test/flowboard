import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';

interface GuestInviteProps {
  projectId: string;
}

export function GuestInvite({ projectId }: GuestInviteProps) {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');
  const queryClient = useQueryClient();

  const inviteMutation = useMutation({
    mutationFn: (guestEmail: string) =>
      apiClient(`/projects/${projectId}/invite-guest`, {
        method: 'POST',
        body: JSON.stringify({ email: guestEmail }),
      }),
    onSuccess: () => {
      setMsg('게스트가 초대되었습니다');
      setEmail('');
      queryClient.invalidateQueries({ queryKey: ['members', projectId] });
      setTimeout(() => setMsg(''), 3000);
    },
    onError: (err: any) => {
      setMsg(err.data?.message || '초대 실패');
    },
  });

  return (
    <div className="border-t pt-3 mt-3">
      <p className="text-xs font-medium text-gray-600 mb-1">
        게스트 초대 (읽기 전용)
      </p>
      <div className="flex gap-1">
        <input type="email" value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="게스트 이메일"
          className="flex-1 border rounded px-2 py-1 text-xs" />
        <button onClick={() => inviteMutation.mutate(email)}
          disabled={!email.trim()}
          className="px-2 py-1 bg-gray-600 text-white rounded text-xs
            disabled:opacity-50">초대</button>
      </div>
      {msg && <p className="text-xs text-green-600 mt-1">{msg}</p>}
    </div>
  );
}
