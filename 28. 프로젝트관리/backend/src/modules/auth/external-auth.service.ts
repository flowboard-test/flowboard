import { getDb } from '../../shared/database/connection';
import { AppError } from '../../shared/errors/AppError';
import { v4 as uuid } from 'uuid';
import { generateToken, generateRefreshToken } from './jwt';

interface ExternalUserInfo {
  external_id: string;
  email: string;
  name: string;
  department?: string;
  position?: string;
  phone?: string;
  avatar_url?: string;
}

export class ExternalAuthService {
  /**
   * U+웍스 그룹웨어 토큰으로 사용자 인증
   * 실제 연동 시 U+웍스 API를 호출하여 토큰 검증
   */
  async authenticateWithExternal(
    provider: string,
    externalToken: string
  ) {
    // U+웍스 API로 토큰 검증 및 사용자 정보 조회
    const userInfo = await this.fetchExternalUserInfo(
      provider, externalToken
    );

    // 기존 연동 계정 확인
    const db = getDb();
    let user = await db('users')
      .where({ oauth_provider: provider, oauth_id: userInfo.external_id })
      .first();

    if (!user) {
      // 이메일로 기존 계정 확인
      user = await db('users').where('email', userInfo.email).first();

      if (user) {
        // 기존 계정에 외부 연동 정보 추가
        await db('users').where('id', user.id).update({
          oauth_provider: provider,
          oauth_id: userInfo.external_id,
          name: userInfo.name,
          updated_at: db.fn.now(),
        });
      } else {
        // 새 계정 생성
        const id = uuid();
        await db('users').insert({
          id,
          email: userInfo.email,
          name: userInfo.name,
          oauth_provider: provider,
          oauth_id: userInfo.external_id,
          avatar_url: userInfo.avatar_url || null,
        });
        user = await db('users').where('id', id).first();
      }
    }

    // 부서/직급 정보 저장 (user_profiles 테이블)
    await this.upsertProfile(user.id, {
      department: userInfo.department,
      position: userInfo.position,
      phone: userInfo.phone,
    });

    // JWT 발급
    const token = generateToken({ userId: user.id, email: user.email });
    const refreshToken = generateRefreshToken({
      userId: user.id, email: user.email,
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar_url: user.avatar_url,
      },
      token,
      refreshToken,
    };
  }

  /**
   * 외부 시스템에서 사용자 정보 조회
   * 실제 구현 시 U+웍스 API 호출
   */
  private async fetchExternalUserInfo(
    provider: string,
    externalToken: string
  ): Promise<ExternalUserInfo> {
    if (provider === 'uplus_works') {
      // TODO: 실제 U+웍스 API 호출
      // const response = await fetch('https://api.uplusworks.co.kr/v1/me', {
      //   headers: { Authorization: `Bearer ${externalToken}` },
      // });
      // return await response.json();

      // 개발용 목업 (실제 연동 시 위 코드로 교체)
      throw AppError.badRequest(
        'EXTERNAL_AUTH_NOT_CONFIGURED',
        'U+웍스 연동이 아직 설정되지 않았습니다. 관리자에게 문의하세요.'
      );
    }

    throw AppError.badRequest(
      'UNSUPPORTED_PROVIDER',
      `지원하지 않는 인증 제공자: ${provider}`
    );
  }

  /**
   * 사용자 프로필 (부서/직급) 저장
   */
  private async upsertProfile(
    userId: string,
    data: { department?: string; position?: string; phone?: string }
  ) {
    const db = getDb();
    const existing = await db('user_profiles').where('user_id', userId).first();

    if (existing) {
      await db('user_profiles').where('user_id', userId).update({
        ...data,
        updated_at: db.fn.now(),
      });
    } else {
      await db('user_profiles').insert({
        id: uuid(),
        user_id: userId,
        ...data,
      });
    }
  }

  /**
   * 계정 연동 해제
   */
  async unlinkExternal(userId: string) {
    const db = getDb();
    await db('users').where('id', userId).update({
      oauth_provider: null,
      oauth_id: null,
      updated_at: db.fn.now(),
    });
  }

  /**
   * 연동 상태 조회
   */
  async getLinkStatus(userId: string) {
    const db = getDb();
    const user = await db('users')
      .select('oauth_provider', 'oauth_id')
      .where('id', userId)
      .first();

    return {
      is_linked: !!user?.oauth_provider,
      provider: user?.oauth_provider || null,
      external_id: user?.oauth_id || null,
    };
  }
}

export const externalAuthService = new ExternalAuthService();
