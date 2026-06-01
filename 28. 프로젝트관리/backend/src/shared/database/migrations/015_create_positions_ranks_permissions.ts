import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 직위 (팀장, 선임, 사원 등)
  await knex.schema.createTable('positions', (table) => {
    table.uuid('id').primary();
    table.string('name', 50).notNullable().unique();
    table.integer('level').defaultTo(0);
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // 직책 (부장, 차장, 과장, 대리, 주임 등)
  await knex.schema.createTable('ranks', (table) => {
    table.uuid('id').primary();
    table.string('name', 50).notNullable().unique();
    table.integer('level').defaultTo(0);
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // 권한 그룹
  await knex.schema.createTable('permission_groups', (table) => {
    table.uuid('id').primary();
    table.string('name', 100).notNullable().unique();
    table.text('description').nullable();
    table.text('permissions').defaultTo('[]');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('permission_groups');
  await knex.schema.dropTableIfExists('ranks');
  await knex.schema.dropTableIfExists('positions');
}
