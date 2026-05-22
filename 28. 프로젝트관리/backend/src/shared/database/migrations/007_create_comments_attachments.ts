import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('comments', (table) => {
    table.uuid('id').primary();
    table.uuid('card_id').notNullable()
      .references('id').inTable('cards').onDelete('CASCADE');
    table.uuid('author_id').notNullable()
      .references('id').inTable('users');
    table.text('content').notNullable();
    table.text('mentions').defaultTo('[]');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('attachments', (table) => {
    table.uuid('id').primary();
    table.uuid('card_id').notNullable()
      .references('id').inTable('cards').onDelete('CASCADE');
    table.uuid('transfer_id').nullable()
      .references('id').inTable('transfers').onDelete('SET NULL');
    table.uuid('resolution_id').nullable()
      .references('id').inTable('resolutions').onDelete('SET NULL');
    table.string('file_name', 500).notNullable();
    table.integer('file_size').notNullable();
    table.string('mime_type', 100).notNullable();
    table.text('s3_key').notNullable();
    table.uuid('uploaded_by').notNullable()
      .references('id').inTable('users');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('attachments');
  await knex.schema.dropTableIfExists('comments');
}
