import knex, { Knex } from 'knex';
import { config } from '../config';

let db: Knex;

export function getDb(): Knex {
  if (!db) {
    const dbUrl = config.database.url;
    if (dbUrl && dbUrl.startsWith('postgresql')) {
      db = knex({
        client: 'pg',
        connection: dbUrl,
        pool: {
          min: config.database.poolMin,
          max: config.database.poolMax,
        },
      });
    } else {
      // 로컬 개발용 SQLite (better-sqlite3 설치 필요)
      db = knex({
        client: 'better-sqlite3',
        connection: { filename: './dev.sqlite3' },
        useNullAsDefault: true,
      });
    }
  }
  return db;
}

export async function closeDb(): Promise<void> {
  if (db) {
    await db.destroy();
  }
}
