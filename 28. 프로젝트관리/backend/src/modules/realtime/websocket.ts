import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { verifyToken } from '../auth/jwt';

let io: Server | null = null;

export function initWebSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: { origin: '*', credentials: true },
    transports: ['websocket', 'polling'],
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('인증 토큰이 필요합니다'));
    }
    const payload = verifyToken(token);
    if (!payload) {
      return next(new Error('유효하지 않은 토큰입니다'));
    }
    (socket as any).userId = payload.userId;
    next();
  });

  io.on('connection', (socket: Socket) => {
    socket.on('join:project', ({ projectId }) => {
      if (projectId) {
        socket.join(`project:${projectId}`);
      }
    });

    socket.on('leave:project', ({ projectId }) => {
      if (projectId) {
        socket.leave(`project:${projectId}`);
      }
    });
  });

  return io;
}

export function getIo(): Server {
  if (!io) {
    throw new Error('WebSocket server not initialized');
  }
  return io;
}

export function broadcastToProject(
  projectId: string,
  event: string,
  data: Record<string, unknown>
) {
  const server = getIo();
  server.to(`project:${projectId}`).emit(event, {
    ...data,
    timestamp: new Date().toISOString(),
  });
}
