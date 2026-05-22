import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('cards', (table) => {
    table.uuid('id').primary();
    table.uuid('column_id').notNullable()
      .references('id').inTable('columns').onDelete('CASCADE');
    table.uuid('parent_id').nullable()
      .references('id').inTable('cards').onDelete('SET NULL');
    table.string('title', 500).notNullable();
    table.text('description').nullable();
    table.string('priority', 20).notNullable().defaultTo('normal');
    table.uuid('assignee_id').nullable()
      .references('id').inTable('users').onDelete('SET NULL');
    table.date('start_date').nullable();
    table.date('due_date').nullable();
    table.string('status', 20).notNullable().defaultTo('todo');
    table.integer('position').notNullable().defaultTo(0);
    table.integer('version').notNullable().defaultTo(1);
    table.text('tags').defaultTo('[]');
    table.uuid('created_by').notNullable()
      .references('id').inTable('users');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('cards');
}
