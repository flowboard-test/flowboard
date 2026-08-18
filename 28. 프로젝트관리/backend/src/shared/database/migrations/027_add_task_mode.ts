import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('cards', (table) => {
    // sequential(순차 이관) | shared(공동 관리)
    table.string('task_mode', 20).defaultTo('sequential');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('cards', (table) => {
    table.dropColumn('task_mode');
  });
}
