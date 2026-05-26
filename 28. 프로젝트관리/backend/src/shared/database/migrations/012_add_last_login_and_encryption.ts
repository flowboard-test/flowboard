import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    table.timestamp('last_login_at').nullable();
    table.boolean('is_dormant').defaultTo(false);
    table.timestamp('dormant_notified_at').nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('last_login_at');
    table.dropColumn('is_dormant');
    table.dropColumn('dormant_notified_at');
  });
}
