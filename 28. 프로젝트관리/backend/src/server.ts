import { buildApp } from './app';
import { config } from './shared/config';
import { initWebSocket } from './modules/realtime/websocket';
import { getDb } from './shared/database/connection';
import bcrypt from 'bcrypt';
import { v4 as uuid } from 'uuid';
import path from 'path';

async function start() {
  // DB 마이그레이션 자동 실행
  const db = getDb();
  const migrationDir = config.nodeEnv === 'production'
    ? path.join(__dirname, 'shared/database/migrations')
    : './src/shared/database/migrations';

  await db.migrate.latest({
    directory: migrationDir,
    extension: config.nodeEnv === 'production' ? 'js' : 'ts',
  });
  console.log('DB migrations applied');

  // 테스트 사용자 확인/생성
  const existing = await db('users').where('email', 'admin@flowboard.dev').first();
  if (!existing) {
    const hash = await bcrypt.hash('password123', 12);
    await db('users').insert({
      id: uuid(),
      email: 'admin@flowboard.dev',
      name: '관리자',
      password_hash: hash,
    });
    console.log('Test user created: admin@flowboard.dev / password123');
  } else {
    if (existing.password_hash && !existing.password_hash.startsWith('$2')) {
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

  const bcrypt2 = bcrypt;
  const uuid2 = uuid;
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

  // 부서 데이터 시드
  const depts = ['기획팀', '디자인팀', '개발팀', 'QA팀', '마케팅팀', '영업팀', '인사팀', '재무팀', '운영팀', '보안팀'];
  for (const deptName of depts) {
    const exists = await db('departments').where('name', deptName).first();
    if (!exists) {
      await db('departments').insert({ id: uuid(), name: deptName, parent_id: null, 'order': depts.indexOf(deptName) });
    }
  }
  // 사용자를 부서에 연결
  for (const u of testUsers) {
    const user = await db('users').where('email', u.email).first();
    const dept = await db('departments').where('name', u.dept).first();
    if (user && dept) {
      await db('user_profiles').where('user_id', user.id)
        .update({ department: u.dept }).catch(() => {});
    }
  }
  console.log('Departments seeded');

  const app = await buildApp();

  try {
    await app.listen({
      port: config.port,
      host: config.host,
    });

    // WebSocket 서버 초기화
    const httpServer = app.server;
    initWebSocket(httpServer);

    // 통계 배치 스케줄러 시작
    const { startStatisticsScheduler } = require('./modules/statistics/scheduler');
    startStatisticsScheduler();

    console.log(
      `Server running at http://${config.host}:${config.port}`
    );
    console.log('WebSocket server initialized');
    console.log('Statistics scheduler started');
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
