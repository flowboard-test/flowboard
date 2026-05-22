import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/authStore';
import { useBoardStore } from '@/stores/boardStore';

export function useRealtime(projectId: string | null) {
  const socketRef = useRef<Socket | null>(null);
  const token = useAuthStore((s) => s.token);
  const { moveCard, updateCard } = useBoardStore();

  useEffect(() => {
    if (!projectId || !token) return;

    const socket = io('/', {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 30000,
      reconnectionAttempts: 10,
    });

    socket.on('connect', () => {
      socket.emit('join:project', { projectId });
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
  }, [projectId, token, moveCard, updateCard]);

  return socketRef;
}
