import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const isPg = knex.client.config.client === 'pg';
  if (isPg) {
    await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
  }

  await knex.schema.createTable('users', (table) => {
    table.uuid('id').primary();
    table.string('email', 255).notNullable().unique();
    table.string('name', 100).notNullable();
    table.text('avatar_url').nullable();
    table.text('password_hash').nullable();
    table.string('oauth_provider', 50).nullable();
    table.string('oauth_id', 255).nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('users');
}
