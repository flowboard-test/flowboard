import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 카드 데이터 시리즈 정의 (예: "매출", "방문자 수")
  await knex.schema.createTable('card_metrics', (table) => {
    table.uuid('id').primary();
    table.uuid('card_id').notNullable()
      .references('id').inTable('cards').onDelete('CASCADE');
    table.string('name', 100).notNullable();
    table.string('unit', 30).nullable();
    table.string('chart_type', 20).defaultTo('bar'); // bar, horizontalBar, line, pie
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // 날짜별 값 기록
  await knex.schema.createTable('card_metric_values', (table) => {
    table.uuid('id').primary();
    table.uuid('metric_id').notNullable()
      .references('id').inTable('card_metrics').onDelete('CASCADE');
    table.date('record_date').notNullable();
    table.decimal('value', 15, 2).notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.unique(['metric_id', 'record_date']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('card_metric_values');
  await knex.schema.dropTableIfExists('card_metrics');
}
