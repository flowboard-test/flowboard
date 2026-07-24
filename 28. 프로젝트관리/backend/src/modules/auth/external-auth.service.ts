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
      const apiUrl = process.env.UPLUS_WORKS_API_URL;

      // 실제 U+웍스 API가 설정된 경우 호출
      if (apiUrl) {
        try {
          const response = await fetch(`${apiUrl}/v1/me`, {
            headers: { Authorization: `Bearer ${externalToken}` },
          });
          if (!response.ok) {
            throw AppError.unauthorized('U+웍스 토큰 검증에 실패했습니다');
          }
          const data: any = await response.json();
          return {
            external_id: data.id || data.employee_id || data.sub,
            email: data.email,
            name: data.name || data.display_name,
            department: data.department || data.dept_name,
            position: data.position || data.title,
            phone: data.phone || data.mobile,
            avatar_url: data.avatar_url || data.profile_image,
          };
        } catch (err: any) {
          if (err.statusCode) throw err;
          throw AppError.badRequest(
            'EXTERNAL_AUTH_ERROR',
            `U+웍스 연동 중 오류: ${err.message}`
          );
        }
      }

      // API 미설정 시 개발용 목업 (토큰을 이메일로 간주하여 테스트)
      if (process.env.NODE_ENV !== 'production') {
        const mockEmail = externalToken.includes('@')
          ? externalToken : `${externalToken}@uplusworks.dev`;
        return {
          external_id: `uplus_${externalToken}`,
          email: mockEmail,
          name: mockEmail.split('@')[0],
          department: '연동부서',
          position: '사원',
        };
      }

      throw AppError.badRequest(
        'EXTERNAL_AUTH_NOT_CONFIGURED',
        'U+웍스 API URL(UPLUS_WORKS_API_URL)이 설정되지 않았습니다.'
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
