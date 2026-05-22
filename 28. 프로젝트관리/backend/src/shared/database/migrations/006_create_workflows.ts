import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('workflow_chains', (table) => {
    table.uuid('id').primary();
    table.uuid('project_id').notNullable()
      .references('id').inTable('projects').onDelete('CASCADE');
    table.uuid('trigger_column_id').notNullable()
      .references('id').inTable('columns').onDelete('CASCADE');
    table.string('name', 200).notNullable();
    table.boolean('is_active').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('workflow_steps', (table) => {
    table.uuid('id').primary();
    table.uuid('chain_id').notNullable()
      .references('id').inTable('workflow_chains').onDelete('CASCADE');
    table.uuid('assignee_id').notNullable()
      .references('id').inTable('users');
    table.integer('step_order').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('workflow_steps');
  await knex.schema.dropTableIfExists('workflow_chains');
}
