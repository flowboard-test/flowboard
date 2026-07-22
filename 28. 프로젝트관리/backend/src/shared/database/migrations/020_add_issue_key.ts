import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('cards', (table) => {
    table.integer('issue_number').nullable();
  });
  // 프로젝트에 이슈 카운터 추가
  await knex.schema.alterTable('projects', (table) => {
    table.string('key_prefix', 10).nullable();
    table.integer('issue_counter').defaultTo(0);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('cards', (table) => {
    table.dropColumn('issue_number');
  });
  await knex.schema.alterTable('projects', (table) => {
    table.dropColumn('key_prefix');
    table.dropColumn('issue_counter');
  });
}
