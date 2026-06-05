import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/authStore';
import { useBoardStore } from '@/stores/boardStore';
import { useQueryClient } from '@tanstack/react-query';

export function useRealtime(projectId: string | null) {
  const socketRef = useRef<Socket | null>(null);
  const token = useAuthStore((s) => s.token);
  const { moveCard, updateCard } = useBoardStore();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!projectId || !token) return;

    const socket = io('/', {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
      reconnectionAttempts: Infinity,
    });

    socket.on('connect', () => {
      socket.emit('join:project', { projectId });
      // 재연결 시 누락 데이터 동기화
      queryClient.invalidateQueries({ queryKey: ['board', projectId] });
    });

    socket.on('card:moved', (data) => {
      moveCard(
        data.cardId,
        data.fromColumnId,
        data.toColumnId,
        data.position
      );
    });

    socket.on('card:updated', (data) => {
      updateCard(data.cardId, data.changes);
    });

    socketRef.current = socket;

    return () => {
      socket.emit('leave:project', { projectId });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [projectId, token, moveCard, updateCard, queryClient]);

  return socketRef;
}
