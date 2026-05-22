import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('card_timeline', (table) => {
    table.uuid('id').primary();
    table.uuid('card_id').notNullable()
      .references('id').inTable('cards').onDelete('CASCADE');
    table.string('event_type', 50).notNullable();
    table.uuid('actor_id').notNullable()
      .references('id').inTable('users');
    table.text('payload').defaultTo('{}');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('custom_field_definitions', (table) => {
    table.uuid('id').primary();
    table.uuid('project_id').notNullable()
      .references('id').inTable('projects').onDelete('CASCADE');
    table.string('name', 100).notNullable();
    table.string('field_type', 20).notNullable();
    table.text('options').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('custom_field_values', (table) => {
    table.uuid('id').primary();
    table.uuid('card_id').notNullable()
      .references('id').inTable('cards').onDelete('CASCADE');
    table.uuid('field_id').notNullable()
      .references('id').inTable('custom_field_definitions')
      .onDelete('CASCADE');
    table.text('value').notNullable();
    table.unique(['card_id', 'field_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('custom_field_values');
  await knex.schema.dropTableIfExists('custom_field_definitions');
  await knex.schema.dropTableIfExists('card_timeline');
}
