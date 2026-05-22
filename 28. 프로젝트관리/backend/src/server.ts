import { buildApp } from './app';
import { config } from './shared/config';
import { initWebSocket } from './modules/realtime/websocket';
import { getDb } from './shared/database/connection';

async function start() {
  // DB 마이그레이션 자동 실행
  const db = getDb();
  await db.migrate.latest({
    directory: './src/shared/database/migrations',
    extension: 'ts',
  });
  console.log('DB migrations applied');

  // 테스트 사용자 확인/생성
  const existing = await db('users').where('email', 'admin@flowboard.dev').first();
  if (!existing) {
    const bcrypt = require('bcrypt');
    const { v4: uuid } = require('uuid');
    const hash = await bcrypt.hash('password123', 12);
    await db('users').insert({
      id: uuid(),
      email: 'admin@flowboard.dev',
      name: '관리자',
      password_hash: hash,
    });
    console.log('Test user created: admin@flowboard.dev / password123');
  } else {
    // 비밀번호가 bcrypt 형식이 아니면 재설정
    if (existing.password_hash && !existing.password_hash.startsWith('$2')) {
      const bcrypt = require('bcrypt');
      const hash = await bcrypt.hash('password123', 12);
      await db('users').where('id', existing.id).update({ password_hash: hash });
      console.log('Test user password reset to bcrypt');
    }
  }

  // 테스트 담당자 10명 생성
  const testUsers = [
    { name: '김기획', email: 'kim@flowboard.dev', dept: '기획팀', pos: '팀장' },
    { name: '이디자', email: 'lee@flowboard.dev', dept: '디자인팀', pos: '선임' },
    { name: '박개발', email: 'park@flowboard.dev', dept: '개발팀', pos: '시니어' },
    { name: '최테스', email: 'choi@flowboard.dev', dept: 'QA팀', pos: '매니저' },
    { name: '정마케', email: 'jung@flowboard.dev', dept: '마케팅팀', pos: '대리' },
    { name: '한영업', email: 'han@flowboard.dev', dept: '영업팀', pos: '과장' },
    { name: '오인사', email: 'oh@flowboard.dev', dept: '인사팀', pos: '주임' },
    { name: '강재무', email: 'kang@flowboard.dev', dept: '재무팀', pos: '차장' },
    { name: '윤운영', email: 'yoon@flowboard.dev', dept: '운영팀', pos: '사원' },
    { name: '서보안', email: 'seo@flowboard.dev', dept: '보안팀', pos: '팀장' },
  ];

  const bcrypt2 = require('bcrypt');
  const { v4: uuid2 } = require('uuid');
  for (const u of testUsers) {
    const exists = await db('users').where('email', u.email).first();
    if (!exists) {
      const hash = await bcrypt2.hash('password123', 12);
      const userId = uuid2();
      await db('users').insert({
        id: userId, email: u.email, name: u.name, password_hash: hash,
      });
      await db('user_profiles').insert({
        id: uuid2(), user_id: userId,
        department: u.dept, position: u.pos,
      });
    }
  }
  console.log('Test users (10) ready');

  const app = await buildApp();

  try {
    await app.listen({
      port: config.port,
      host: config.host,
    });

    // WebSocket 서버 초기화
    const httpServer = app.server;
    initWebSocket(httpServer);

    console.log(
      `Server running at http://${config.host}:${config.port}`
    );
    console.log('WebSocket server initialized');
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
