import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('card_metric_values', (table) => {
    table.string('series_name', 100).defaultTo('값');
  });
  // 기존 unique(metric_id, record_date) 제거
  try {
    await knex.schema.alterTable('card_metric_values', (table) => {
      table.dropUnique(['metric_id', 'record_date']);
    });
  } catch (e) {
    // 제약이 없거나 SQLite에서 실패 시 무시
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('card_metric_values', (table) => {
    table.dropColumn('series_name');
  });
}
