import { getDb } from '../../shared/database/connection';
import { AppError } from '../../shared/errors/AppError';
import { hashPassword, verifyPassword } from './utils';

export class AccountService {
  async getProfile(userId: string) {
    const db = getDb();
    const user = await db('users')
      .select('id', 'email', 'name', 'avatar_url', 'created_at')
      .where('id', userId)
      .first();
    if (!user) throw AppError.notFound('사용자를 찾을 수 없습니다');
    return user;
  }

  async updateProfile(userId: string, data: { name?: string; avatar_url?: string }) {
    const db = getDb();
    await db('users').where('id', userId).update({
      ...data,
      updated_at: db.fn.now(),
    });
    return await this.getProfile(userId);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const db = getDb();
    const user = await db('users').where('id', userId).first();
    if (!user || !user.password_hash) {
      throw AppError.badRequest('INVALID_REQUEST', '비밀번호를 변경할 수 없습니다');
    }

    const isValid = await verifyPassword(currentPassword, user.password_hash);
    if (!isValid) {
      throw AppError.badRequest('WRONG_PASSWORD', '현재 비밀번호가 올바르지 않습니다');
    }

    const newHash = await hashPassword(newPassword);
    await db('users').where('id', userId).update({
      password_hash: newHash,
      updated_at: db.fn.now(),
    });
  }

  async listUsers(search?: string) {
    const db = getDb();
    let query = db('users')
      .select('id', 'email', 'name', 'avatar_url', 'created_at');

    if (search) {
      query = query.where((builder) => {
        builder
          .where('name', 'like', `%${search}%`)
          .orWhere('email', 'like', `%${search}%`);
      });
    }

    return await query.orderBy('created_at', 'desc').limit(50);
  }

  async deleteAccount(userId: string) {
    const db = getDb();
    await db('users').where('id', userId).del();
  }
}

export const accountService = new AccountService();
