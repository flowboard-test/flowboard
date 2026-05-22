import { getDb } from '../src/shared/database/connection';

async function test() {
  const db = getDb();
  const user = await db('users')
    .where('email', 'admin@flowboard.dev')
    .first();

  if (!user) {
    console.log('User NOT FOUND - creating...');
    const bcrypt = require('bcrypt');
    const { v4: uuid } = require('uuid');
    const hash = await bcrypt.hash('password123', 12);
    await db('users').insert({
      id: uuid(),
      email: 'admin@flowboard.dev',
      name: '관리자',
      password_hash: hash,
    });
    console.log('Created admin@flowboard.dev / password123');
  } else {
    console.log('User found:', user.email);
    console.log('Hash starts with $2:', user.password_hash?.startsWith('$2'));
    if (!user.password_hash?.startsWith('$2')) {
      const bcrypt = require('bcrypt');
      const hash = await bcrypt.hash('password123', 12);
      await db('users').where('id', user.id).update({ password_hash: hash });
      console.log('Password reset to bcrypt');
    }
  }
  await db.destroy();
}

test();
