import knex, { Knex } from 'knex';
import { config } from '../config';

let db: Knex;

export function getDb(): Knex {
  if (!db) {
    const usePostgres = config.database.url && config.database.url.startsWith('postgresql');
    db = knex(
      usePostgres
        ? {
            client: 'pg',
            connection: config.database.url,
            pool: {
              min: config.database.poolMin,
              max: config.database.poolMax,
            },
          }
        : {
            client: 'better-sqlite3',
            connection: { filename: './dev.sqlite3' },
            useNullAsDefault: true,
          }
    );
  }
  return db;
}

export async function closeDb(): Promise<void> {
  if (db) {
    await db.destroy();
  }
}
