import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from './utils';
import { generateToken, verifyToken } from './jwt';
import fc from 'fast-check';

describe('Auth Utils', () => {
  it('해시된 비밀번호는 원본과 일치해야 한다', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 8, maxLength: 50 }),
        async (password) => {
          const hash = await hashPassword(password);
          const isValid = await verifyPassword(password, hash);
          expect(isValid).toBe(true);
        }
      ),
      { numRuns: 5 } // bcrypt는 느리므로 5회
    );
  }, 30000);

  it('잘못된 비밀번호는 검증 실패해야 한다', async () => {
    const hash = await hashPassword('correct-password');
    const isValid = await verifyPassword('wrong-password', hash);
    expect(isValid).toBe(false);
  });
});

describe('JWT', () => {
  it('생성된 토큰은 검증 가능해야 한다', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.emailAddress(),
        (userId, email) => {
          const token = generateToken({ userId, email });
          const payload = verifyToken(token);
          expect(payload).not.toBeNull();
          expect(payload!.userId).toBe(userId);
          expect(payload!.email).toBe(email);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('변조된 토큰은 검증 실패해야 한다', () => {
    const token = generateToken({ userId: 'test-id', email: 'test@test.com' });
    const tampered = token.slice(0, -5) + 'xxxxx';
    const payload = verifyToken(tampered);
    expect(payload).toBeNull();
  });

  it('빈 문자열 토큰은 검증 실패해야 한다', () => {
    expect(verifyToken('')).toBeNull();
    expect(verifyToken('invalid')).toBeNull();
    expect(verifyToken('a.b')).toBeNull();
  });
});
