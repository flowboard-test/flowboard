import knex from 'knex';
import config from '../knexfile';

async function setup() {
  const db = knex(config.development);
  try {
    console.log('마이그레이션 실행 중...');
    await db.migrate.latest();
    console.log('마이그레이션 완료!');

    // 테스트 사용자 생성
    const bcrypt = require('bcrypt');
    const { v4: uuid } = require('uuid');
    const hash = await bcrypt.hash('password123', 12);

    const userId = uuid();
    const existing = await db('users')
      .where('email', 'admin@flowboard.dev')
      .first();

    if (!existing) {
      await db('users').insert({
        id: userId,
        email: 'admin@flowboard.dev',
        name: '관리자',
        password_hash: hash,
      });
      console.log('테스트 사용자 생성: admin@flowboard.dev / password123');
    } else {
      console.log('테스트 사용자 이미 존재');
    }
  } catch (err) {
    console.error('설정 실패:', err);
  } finally {
    await db.destroy();
  }
}

setup();
