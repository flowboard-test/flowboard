import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('objectives', (table) => {
    table.uuid('id').primary();
    table.uuid('project_id').notNullable()
      .references('id').inTable('projects').onDelete('CASCADE');
    table.string('title', 300).notNullable();
    table.text('description').nullable();
    table.integer('progress').defaultTo(0);
    table.string('period', 20).nullable();
    table.uuid('owner_id').nullable()
      .references('id').inTable('users');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('key_results', (table) => {
    table.uuid('id').primary();
    table.uuid('objective_id').notNullable()
      .references('id').inTable('objectives').onDelete('CASCADE');
    table.string('title', 300).notNullable();
    table.integer('target_value').defaultTo(100);
    table.integer('current_value').defaultTo(0);
    table.string('unit', 50).nullable();
    table.uuid('card_id').nullable()
      .references('id').inTable('cards').onDelete('SET NULL');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('key_results');
  await knex.schema.dropTableIfExists('objectives');
}
