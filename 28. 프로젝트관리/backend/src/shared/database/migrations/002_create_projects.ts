import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('projects', (table) => {
    table.uuid('id').primary();
    table.string('name', 200).notNullable();
    table.text('description').nullable();
    table.boolean('is_public').defaultTo(false);
    table.uuid('owner_id').notNullable().references('id').inTable('users');
    table.boolean('resolution_required').defaultTo(false);
    table.boolean('is_archived').defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('project_members', (table) => {
    table.uuid('id').primary();
    table.uuid('project_id').notNullable()
      .references('id').inTable('projects').onDelete('CASCADE');
    table.uuid('user_id').notNullable()
      .references('id').inTable('users').onDelete('CASCADE');
    table.string('role', 20).notNullable().defaultTo('member');
    table.timestamp('joined_at').defaultTo(knex.fn.now());
    table.unique(['project_id', 'user_id']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('project_members');
  await knex.schema.dropTableIfExists('projects');
}
