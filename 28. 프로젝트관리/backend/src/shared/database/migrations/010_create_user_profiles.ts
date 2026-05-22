import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('user_profiles', (table) => {
    table.uuid('id').primary();
    table.uuid('user_id').notNullable().unique()
      .references('id').inTable('users').onDelete('CASCADE');
    table.string('department', 100).nullable();
    table.string('position', 100).nullable();
    table.string('phone', 50).nullable();
    table.string('employee_id', 50).nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('user_profiles');
}
