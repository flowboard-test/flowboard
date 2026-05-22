import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('notifications', (table) => {
    table.uuid('id').primary();
    table.uuid('user_id').notNullable()
      .references('id').inTable('users').onDelete('CASCADE');
    table.string('type', 50).notNullable();
    table.string('title', 300).notNullable();
    table.text('body').notNullable();
    table.text('metadata').defaultTo('{}');
    table.boolean('is_read').defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.schema.createTable('notification_settings', (table) => {
    table.uuid('id').primary();
    table.uuid('user_id').notNullable()
      .references('id').inTable('users').onDelete('CASCADE');
    table.string('notification_type', 50).notNullable();
    table.boolean('channel_in_app').defaultTo(true);
    table.boolean('channel_email').defaultTo(true);
    table.boolean('channel_push').defaultTo(true);
    table.unique(['user_id', 'notification_type']);
  });

  await knex.schema.createTable('notification_sent_log', (table) => {
    table.uuid('id').primary();
    table.uuid('card_id').notNullable()
      .references('id').inTable('cards').onDelete('CASCADE');
    table.string('notification_type', 50).notNullable();
    table.date('sent_date').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.unique(['card_id', 'notification_type', 'sent_date']);
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('notification_sent_log');
  await knex.schema.dropTableIfExists('notification_settings');
  await knex.schema.dropTableIfExists('notifications');
}
