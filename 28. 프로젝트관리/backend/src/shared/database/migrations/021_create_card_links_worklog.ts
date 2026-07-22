import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 이슈 링크
  await knex.schema.createTable('card_links', (table) => {
    table.uuid('id').primary();
    table.uuid('source_card_id').notNullable()
      .references('id').inTable('cards').onDelete('CASCADE');
    table.uuid('target_card_id').notNullable()
      .references('id').inTable('cards').onDelete('CASCADE');
    table.string('link_type', 30).notNullable(); // blocks, blocked_by, relates, duplicates
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // 작업 로그
  await knex.schema.createTable('work_logs', (table) => {
    table.uuid('id').primary();
    table.uuid('card_id').notNullable()
      .references('id').inTable('cards').onDelete('CASCADE');
    table.uuid('user_id').notNullable()
      .references('id').inTable('users').onDelete('CASCADE');
    table.decimal('hours', 6, 2).notNullable();
    table.text('comment').nullable();
    table.date('work_date').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // cards에 예상시간 컬럼
  await knex.schema.alterTable('cards', (table) => {
    table.decimal('estimated_hours', 6, 2).nullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('card_links');
  await knex.schema.dropTableIfExists('work_logs');
  await knex.schema.alterTable('cards', (table) => {
    table.dropColumn('estimated_hours');
  });
}
