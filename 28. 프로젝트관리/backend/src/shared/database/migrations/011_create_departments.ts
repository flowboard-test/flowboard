import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('departments', (table) => {
    table.uuid('id').primary();
    table.string('name', 100).notNullable();
    table.uuid('parent_id').nullable()
      .references('id').inTable('departments').onDelete('SET NULL');
    table.integer('order').defaultTo(0);
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('departments');
}
