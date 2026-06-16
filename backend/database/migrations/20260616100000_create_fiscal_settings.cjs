exports.up = async function up(knex) {
  await knex.schema.createTable("fiscal_settings", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.string("provider", 20).notNullable().defaultTo("MOCK");
    table.string("environment", 20).notNullable().defaultTo("HOMOLOGATION");
    table.string("company_cnpj", 32);
    table.boolean("allow_production").notNullable().defaultTo(false);
    table
      .timestamp("created_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
    table
      .timestamp("updated_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());

    table.check(
      "provider in ('MOCK', 'FOCUS')",
      [],
      "fiscal_settings_provider_check",
    );
    table.check(
      "environment in ('HOMOLOGATION', 'PRODUCTION')",
      [],
      "fiscal_settings_environment_check",
    );
  });

  await knex.schema.raw(
    "create unique index fiscal_settings_single_row_unique on fiscal_settings ((true))",
  );
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("fiscal_settings");
};
