import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('boards', (table) => {
    table.uuid('id').primary();
    table.uuid('project_id').notNullable()
      .references('id').inTable('projects').onDelete('CASCADE');
    table.string('name', 200).notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('columns', (table) => {
    table.uuid('id').primary();
    table.uuid('board_id').notNullable()
      .references('id').inTable('boards').onDelete('CASCADE');
    table.string('name', 100).notNullable();
    table.integer('position').notNullable().defaultTo(0);
    table.integer('wip_limit').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('columns');
  await knex.schema.dropTableIfExists('boards');
}
