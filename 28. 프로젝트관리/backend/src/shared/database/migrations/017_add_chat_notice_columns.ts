import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasNotice = await knex.schema.hasColumn('chat_messages', 'is_notice');
  if (!hasNotice) {
    await knex.schema.alterTable('chat_messages', (table) => {
      table.boolean('is_notice').defaultTo(false);
      table.boolean('hide_from_guest').defaultTo(false);
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('chat_messages', (table) => {
    table.dropColumn('is_notice');
    table.dropColumn('hide_from_guest');
  });
}
