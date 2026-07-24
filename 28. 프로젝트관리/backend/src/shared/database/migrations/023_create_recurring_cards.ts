import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('recurring_cards', (table) => {
    table.uuid('id').primary();
    table.uuid('project_id').notNullable()
      .references('id').inTable('projects').onDelete('CASCADE');
    table.uuid('column_id').notNullable();
    table.uuid('created_by').notNullable();
    // 원본 카드 템플릿
    table.string('title', 300).notNullable();
    table.text('description').nullable();
    table.string('priority', 20).defaultTo('normal');
    table.uuid('assignee_id').nullable();
    table.text('tags').nullable();
    // 반복 규칙
    table.string('recur_type', 20).notNullable(); // daily, weekly, monthly, yearly, weekday, custom
    table.integer('recur_interval').defaultTo(1); // n일/주/월마다
    table.string('recur_days', 50).nullable(); // 주간: 0,1,2 (요일)
    table.time('recur_time').nullable(); // 알림 시각
    table.date('next_run').notNullable(); // 다음 실행일
    table.date('end_date').nullable(); // 반복 종료일
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('recurring_cards');
}
