import { getDb } from '../../shared/database/connection';
import { v4 as uuid } from 'uuid';
import { NotificationType } from '../../shared/types';

interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  metadata?: Record<string, unknown>;
}

export class NotificationService {
  async create(input: CreateNotificationInput) {
    const db = getDb();

    // 사용자 알림 설정 확인
    const settings = await db('notification_settings')
      .where({
        user_id: input.userId,
        notification_type: input.type,
      })
      .first();

    // 설정이 없으면 기본값(모두 활성)으로 처리
    const channelInApp = settings?.channel_in_app ?? true;
    const channelEmail = settings?.channel_email ?? true;
    const channelPush = settings?.channel_push ?? true;

    // 인앱 알림은 항상 DB에 저장 (설정에 따라)
    if (channelInApp) {
      await db('notifications').insert({
        id: uuid(),
        user_id: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        metadata: JSON.stringify(input.metadata || {}),
      });
    }

    // TODO: 이메일 발송 (channelEmail)
    // TODO: 푸시 알림 발송 (channelPush)

    return { channelInApp, channelEmail, channelPush };
  }

  async sendTransferNotification(
    toUserId: string,
    fromUserName: string,
    cardTitle: string,
    cardId: string,
    projectId: string
  ) {
    await this.create({
      userId: toUserId,
      type: 'transfer_received',
      title: '내 차례입니다',
      body: `${fromUserName}님이 '${cardTitle}' 업무를 이관했습니다`,
      metadata: { cardId, projectId },
    });
  }

  async sendRejectionNotification(
    toUserId: string,
    fromUserName: string,
    cardTitle: string,
    cardId: string,
    projectId: string
  ) {
    await this.create({
      userId: toUserId,
      type: 'transfer_rejected',
      title: '재작업 필요',
      body: `${fromUserName}님이 '${cardTitle}' 업무를 반려했습니다`,
      metadata: { cardId, projectId },
    });
  }

  async getByUser(userId: string, limit = 50, offset = 0) {
    const db = getDb();
    return await db('notifications')
      .where('user_id', userId)
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);
  }

  async markAsRead(notificationId: string, userId: string) {
    const db = getDb();
    await db('notifications')
      .where({ id: notificationId, user_id: userId })
      .update({ is_read: true });
  }

  async updateSettings(
    userId: string,
    type: string,
    settings: { channel_in_app?: boolean; channel_email?: boolean; channel_push?: boolean }
  ) {
    const db = getDb();
    const existing = await db('notification_settings')
      .where({ user_id: userId, notification_type: type })
      .first();

    if (existing) {
      await db('notification_settings')
        .where({ user_id: userId, notification_type: type })
        .update(settings);
    } else {
      await db('notification_settings').insert({
        id: uuid(),
        user_id: userId,
        notification_type: type,
        channel_in_app: settings.channel_in_app ?? true,
        channel_email: settings.channel_email ?? true,
        channel_push: settings.channel_push ?? true,
      });
    }
  }
}

export const notificationService = new NotificationService();
