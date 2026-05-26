import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import { config } from '../config';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

function getKey(): Buffer {
  const secret = config.jwt.secret;
  return scryptSync(secret, 'flowboard-salt', 32);
}

/**
 * 개인정보 암호화 (AES-256-GCM)
 * 이메일, 전화번호 등 민감 정보에 사용
 */
export function encrypt(text: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag();

  // iv:tag:encrypted 형태로 저장
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
}

/**
 * 개인정보 복호화
 */
export function decrypt(encryptedText: string): string {
  const key = getKey();
  const parts = encryptedText.split(':');
  if (parts.length !== 3) return encryptedText; // 암호화 안 된 데이터

  const [ivHex, tagHex, encrypted] = parts;
  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * 개인정보 마스킹 (표시용)
 * 이메일: ab***@domain.com
 * 전화번호: 010-****-5678
 */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  const masked = local.slice(0, 2) + '***';
  return `${masked}@${domain}`;
}

export function maskPhone(phone: string): string {
  if (phone.length < 8) return '***';
  return phone.slice(0, 3) + '-****-' + phone.slice(-4);
}
