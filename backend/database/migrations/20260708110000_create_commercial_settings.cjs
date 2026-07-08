exports.up = async function up(knex) {
  await knex.schema.createTable("commercial_settings", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .decimal("default_profit_margin_percentage", 8, 2)
      .notNullable()
      .defaultTo(0);
    table
      .timestamp("created_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
    table
      .timestamp("updated_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());

    table.check(
      "default_profit_margin_percentage >= 0 and default_profit_margin_percentage <= 1000",
      [],
      "commercial_settings_default_profit_margin_check",
    );
  });

  await knex.schema.raw(
    "create unique index commercial_settings_single_row_unique on commercial_settings ((true))",
  );
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("commercial_settings");
};
