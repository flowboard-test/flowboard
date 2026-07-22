import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('sprints', (table) => {
    table.uuid('id').primary();
    table.uuid('project_id').notNullable()
      .references('id').inTable('projects').onDelete('CASCADE');
    table.string('name', 200).notNullable();
    table.string('goal', 500).nullable();
    table.date('start_date').nullable();
    table.date('end_date').nullable();
    table.string('status', 20).defaultTo('planned'); // planned, active, completed
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.alterTable('cards', (table) => {
    table.uuid('sprint_id').nullable()
      .references('id').inTable('sprints').onDelete('SET NULL');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('cards', (table) => {
    table.dropColumn('sprint_id');
  });
  await knex.schema.dropTableIfExists('sprints');
}
