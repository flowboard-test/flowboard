import { getDb } from '../../shared/database/connection';
import { AppError } from '../../shared/errors/AppError';
import { hashPassword, verifyPassword } from './utils';
import { RegisterInput, LoginInput } from './schemas';
import { v4 as uuid } from 'uuid';

export class AuthService {
  async register(input: RegisterInput) {
    const db = getDb();
    const existing = await db('users')
      .where('email', input.email)
      .first();

    if (existing) {
      throw AppError.badRequest(
        'EMAIL_EXISTS',
        '이미 등록된 이메일입니다'
      );
    }

    const passwordHash = await hashPassword(input.password);
    const id = uuid();

    await db('users').insert({
      id,
      email: input.email,
      name: input.name,
      password_hash: passwordHash,
    });

    const user = await db('users')
      .select('id', 'email', 'name', 'avatar_url', 'created_at')
      .where('id', id)
      .first();

    return user;
  }

  async login(input: LoginInput) {
    const db = getDb();
    const user = await db('users')
      .where('email', input.email)
      .first();

    if (!user || !user.password_hash) {
      throw AppError.unauthorized('이메일 또는 비밀번호가 올바르지 않습니다');
    }

    // 휴면 계정 체크
    if (user.is_dormant) {
      throw AppError.forbidden(
        'ACCOUNT_DORMANT',
        '휴면 계정입니다. 고객센터에 문의하여 계정을 복구하세요.'
      );
    }

    const isValid = await verifyPassword(input.password, user.password_hash);
    if (!isValid) {
      throw AppError.unauthorized('이메일 또는 비밀번호가 올바르지 않습니다');
    }

    // 마지막 로그인 시간 갱신 + 휴면 해제
    await db('users').where('id', user.id).update({
      last_login_at: db.fn.now(),
      is_dormant: false,
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar_url: user.avatar_url,
    };
  }

  async getUserById(id: string) {
    const db = getDb();
    const user = await db('users')
      .select('id', 'email', 'name', 'avatar_url')
      .where('id', id)
      .first();

    if (!user) {
      throw AppError.notFound('사용자를 찾을 수 없습니다');
    }

    return user;
  }
}

export const authService = new AuthService();
