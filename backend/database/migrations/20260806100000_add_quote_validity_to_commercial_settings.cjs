exports.up = async function up(knex) {
  await knex.schema.alterTable("commercial_settings", (table) => {
    table.integer("default_quote_validity_days").notNullable().defaultTo(7);
  });

  await knex.schema.raw(
    "alter table commercial_settings add constraint commercial_settings_default_quote_validity_days_check check (default_quote_validity_days >= 0 and default_quote_validity_days <= 365)",
  );
};

exports.down = async function down(knex) {
  await knex.schema.raw(
    "alter table commercial_settings drop constraint if exists commercial_settings_default_quote_validity_days_check",
  );

  await knex.schema.alterTable("commercial_settings", (table) => {
    table.dropColumn("default_quote_validity_days");
  });
};
