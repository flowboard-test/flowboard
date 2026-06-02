import { FastifyPluginAsync } from 'fastify';
import { authenticate } from '../../shared/middleware/authenticate';
import { getDb } from '../../shared/database/connection';
import { v4 as uuid } from 'uuid';

const messengerRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', authenticate);

  // 대화방 목록
  app.get('/conversations', async (request, reply) => {
    const db = getDb();
    const convos = await db('conversation_members')
      .where('user_id', request.userId!)
      .join('conversations', 'conversation_members.conversation_id', 'conversations.id')
      .select('conversations.*');
    return reply.send(convos);
  });

  // DM 대화방 생성 (또는 기존 반환)
  app.post('/conversations/dm', async (request, reply) => {
    const { target_user_id } = request.body as { target_user_id: string };
    const db = getDb();
    const myId = request.userId!;

    // 기존 DM 찾기
    const existing = await db('conversations')
      .where('type', 'dm')
      .whereIn('id', function() {
        this.select('conversation_id').from('conversation_members')
          .where('user_id', myId);
      })
      .whereIn('id', function() {
        this.select('conversation_id').from('conversation_members')
          .where('user_id', target_user_id);
      })
      .first();

    if (existing) return reply.send(existing);

    const convoId = uuid();
    await db('conversations').insert({
      id: convoId, type: 'dm', created_by: myId,
    });
    await db('conversation_members').insert([
      { id: uuid(), conversation_id: convoId, user_id: myId },
      { id: uuid(), conversation_id: convoId, user_id: target_user_id },
    ]);
    const convo = await db('conversations').where('id', convoId).first();
    return reply.status(201).send(convo);
  });

  // 메시지 목록
  app.get('/conversations/:id/messages', async (request, reply) => {
    const { id } = request.params as { id: string };
    const db = getDb();
    const messages = await db('messages')
      .where('conversation_id', id)
      .where('is_deleted', false)
      .join('users', 'messages.sender_id', 'users.id')
      .select('messages.*', 'users.name as sender_name')
      .orderBy('messages.created_at', 'asc')
      .limit(200);

    // 게스트 필터링
    const member = await db('conversation_members')
      .where({ conversation_id: id, user_id: request.userId! }).first();
    const isGuest = member?.role === 'guest';

    const filtered = isGuest
      ? messages.filter((m: any) => !m.hide_from_guest)
      : messages;

    return reply.send(filtered);
  });

  // 메시지 전송
  app.post('/conversations/:id/messages', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { content, type, is_notice, hide_from_guest, reply_to_id } =
      request.body as any;
    const db = getDb();
    const msgId = uuid();
    await db('messages').insert({
      id: msgId, conversation_id: id, sender_id: request.userId!,
      content, type: type || 'text',
      is_notice: is_notice || false,
      hide_from_guest: hide_from_guest || false,
      reply_to_id: reply_to_id || null,
    });
    return reply.status(201).send({ id: msgId });
  });

  // 메시지 삭제 (읽은 사람 없으면 가능)
  app.delete('/messages/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const db = getDb();
    const msg = await db('messages').where('id', id).first();
    if (!msg) return reply.status(404).send({ message: '메시지 없음' });
    if (msg.sender_id !== request.userId!) {
      return reply.status(403).send({ message: '본인 메시지만 삭제 가능' });
    }
    const readCount = await db('message_reads')
      .where('message_id', id)
      .whereNot('user_id', request.userId!)
      .count('id as c').first();
    if (Number(readCount?.c || 0) > 0) {
      return reply.status(400).send({
        message: '다른 사람이 이미 읽은 메시지는 삭제할 수 없습니다'
      });
    }
    await db('messages').where('id', id).update({ is_deleted: true });
    return reply.send({ message: '삭제되었습니다' });
  });

  // 읽음 처리
  app.post('/messages/:id/read', async (request, reply) => {
    const { id } = request.params as { id: string };
    const db = getDb();
    const existing = await db('message_reads')
      .where({ message_id: id, user_id: request.userId! }).first();
    if (!existing) {
      await db('message_reads').insert({
        id: uuid(), message_id: id, user_id: request.userId!,
      });
    }
    return reply.send({ ok: true });
  });

  // 파일방 (대화방의 모든 파일)
  app.get('/conversations/:id/files', async (request, reply) => {
    const { id } = request.params as { id: string };
    const db = getDb();
    const files = await db('message_files')
      .where('conversation_id', id)
      .orderBy('created_at', 'desc');
    return reply.send(files);
  });

  // 공지 목록
  app.get('/conversations/:id/notices', async (request, reply) => {
    const { id } = request.params as { id: string };
    const db = getDb();
    const notices = await db('messages')
      .where({ conversation_id: id, is_notice: true, is_deleted: false })
      .join('users', 'messages.sender_id', 'users.id')
      .select('messages.*', 'users.name as sender_name')
      .orderBy('messages.created_at', 'desc');
    return reply.send(notices);
  });
};

export default messengerRoutes;
