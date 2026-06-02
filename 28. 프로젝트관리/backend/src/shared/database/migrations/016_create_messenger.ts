import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 대화방
  await knex.schema.createTable('conversations', (table) => {
    table.uuid('id').primary();
    table.string('type', 20).notNullable(); // 'dm', 'group'
    table.string('name', 200).nullable();
    table.uuid('created_by').notNullable()
      .references('id').inTable('users');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // 대화방 참여자
  await knex.schema.createTable('conversation_members', (table) => {
    table.uuid('id').primary();
    table.uuid('conversation_id').notNullable()
      .references('id').inTable('conversations').onDelete('CASCADE');
    table.uuid('user_id').notNullable()
      .references('id').inTable('users').onDelete('CASCADE');
    table.string('role', 20).defaultTo('member');
    table.timestamp('joined_at').defaultTo(knex.fn.now());
    table.unique(['conversation_id', 'user_id']);
  });

  // 메시지
  await knex.schema.createTable('messages', (table) => {
    table.uuid('id').primary();
    table.uuid('conversation_id').notNullable()
      .references('id').inTable('conversations').onDelete('CASCADE');
    table.uuid('sender_id').notNullable()
      .references('id').inTable('users');
    table.text('content').nullable();
    table.string('type', 20).defaultTo('text');
    table.boolean('is_notice').defaultTo(false);
    table.boolean('hide_from_guest').defaultTo(false);
    table.boolean('is_deleted').defaultTo(false);
    table.uuid('reply_to_id').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // 메시지 읽음 상태
  await knex.schema.createTable('message_reads', (table) => {
    table.uuid('id').primary();
    table.uuid('message_id').notNullable()
      .references('id').inTable('messages').onDelete('CASCADE');
    table.uuid('user_id').notNullable()
      .references('id').inTable('users').onDelete('CASCADE');
    table.timestamp('read_at').defaultTo(knex.fn.now());
    table.unique(['message_id', 'user_id']);
  });

  // 메시지 첨부파일
  await knex.schema.createTable('message_files', (table) => {
    table.uuid('id').primary();
    table.uuid('message_id').notNullable()
      .references('id').inTable('messages').onDelete('CASCADE');
    table.uuid('conversation_id').notNullable()
      .references('id').inTable('conversations').onDelete('CASCADE');
    table.string('file_name', 500).notNullable();
    table.integer('file_size').notNullable();
    table.string('mime_type', 100).notNullable();
    table.text('s3_key').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('message_files');
  await knex.schema.dropTableIfExists('message_reads');
  await knex.schema.dropTableIfExists('messages');
  await knex.schema.dropTableIfExists('conversation_members');
  await knex.schema.dropTableIfExists('conversations');
}
