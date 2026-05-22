import { createHmac } from 'crypto';
import { config } from '../../shared/config';

interface TokenPayload {
  userId: string;
  email: string;
}

export function generateToken(payload: TokenPayload): string {
  const header = Buffer.from(
    JSON.stringify({ alg: 'HS256', typ: 'JWT' })
  ).toString('base64url');

  const now = Math.floor(Date.now() / 1000);
  const exp = now + 7 * 24 * 60 * 60; // 7 days

  const body = Buffer.from(
    JSON.stringify({ ...payload, iat: now, exp })
  ).toString('base64url');

  const signature = createHmac('sha256', config.jwt.secret)
    .update(`${header}.${body}`)
    .digest('base64url');

  return `${header}.${body}.${signature}`;
}

export function generateRefreshToken(payload: TokenPayload): string {
  const header = Buffer.from(
    JSON.stringify({ alg: 'HS256', typ: 'JWT' })
  ).toString('base64url');

  const now = Math.floor(Date.now() / 1000);
  const exp = now + 30 * 24 * 60 * 60; // 30 days

  const body = Buffer.from(
    JSON.stringify({ ...payload, iat: now, exp, type: 'refresh' })
  ).toString('base64url');

  const signature = createHmac('sha256', config.jwt.secret)
    .update(`${header}.${body}`)
    .digest('base64url');

  return `${header}.${body}.${signature}`;
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const [header, body, signature] = token.split('.');
    if (!header || !body || !signature) return null;

    const expectedSig = createHmac('sha256', config.jwt.secret)
      .update(`${header}.${body}`)
      .digest('base64url');

    if (signature !== expectedSig) return null;

    const payload = JSON.parse(
      Buffer.from(body, 'base64url').toString()
    );

    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return { userId: payload.userId, email: payload.email };
  } catch {
    return null;
  }
}
