import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 일별 통계 스냅샷 테이블
  await knex.schema.createTable('daily_stats', (table) => {
    table.uuid('id').primary();
    table.date('stat_date').notNullable();
    table.string('stat_type', 50).notNullable(); // project, card, user
    table.uuid('ref_id').nullable(); // project_id or user_id
    table.integer('created_count').defaultTo(0);
    table.integer('deleted_count').defaultTo(0);
    table.integer('completed_count').defaultTo(0);
    table.integer('in_progress_count').defaultTo(0);
    table.integer('review_count').defaultTo(0);
    table.integer('overdue_count').defaultTo(0);
    table.integer('total_count').defaultTo(0);
    table.timestamp('generated_at').defaultTo(knex.fn.now());
    table.unique(['stat_date', 'stat_type', 'ref_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('daily_stats');
}
