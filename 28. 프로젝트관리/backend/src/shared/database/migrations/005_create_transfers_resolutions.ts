import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('transfers', (table) => {
    table.uuid('id').primary();
    table.uuid('card_id').notNullable()
      .references('id').inTable('cards').onDelete('CASCADE');
    table.uuid('from_user_id').notNullable()
      .references('id').inTable('users');
    table.uuid('to_user_id').notNullable()
      .references('id').inTable('users');
    table.string('resolution_type', 20).notNullable();
    table.text('comment').nullable();
    table.boolean('is_auto').defaultTo(false);
    table.uuid('workflow_step_id').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('resolutions', (table) => {
    table.uuid('id').primary();
    table.uuid('card_id').notNullable()
      .references('id').inTable('cards').onDelete('CASCADE');
    table.uuid('transfer_id').nullable()
      .references('id').inTable('transfers').onDelete('SET NULL');
    table.string('type', 20).notNullable();
    table.text('comment').nullable();
    table.uuid('created_by').notNullable()
      .references('id').inTable('users');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('resolutions');
  await knex.schema.dropTableIfExists('transfers');
}
