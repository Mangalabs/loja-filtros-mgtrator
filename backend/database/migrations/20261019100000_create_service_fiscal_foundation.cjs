exports.up = async function up(knex) {
  await knex.schema.alterTable("fiscal_settings", (table) => {
    table.string("municipal_registration", 40);
    table.string("service_municipality_name", 100);
    table.string("service_municipality_state", 2);
    table.string("service_municipality_ibge_code", 7);
    table
      .string("service_tax_regime", 40)
      .notNullable()
      .defaultTo("SIMPLES_NACIONAL_NORMAL");
    table.decimal("default_iss_rate", 5, 2).notNullable().defaultTo(2);
    table.boolean("default_retain_pis").notNullable().defaultTo(false);
    table.boolean("default_retain_cofins").notNullable().defaultTo(false);
    table.boolean("default_retain_csll").notNullable().defaultTo(false);
    table.boolean("default_retain_ir").notNullable().defaultTo(false);
    table.boolean("default_retain_inss").notNullable().defaultTo(false);
  });

  await knex.schema.raw(`
    alter table fiscal_settings
    add constraint fiscal_settings_service_tax_regime_check
    check (service_tax_regime in ('SIMPLES_NACIONAL_NORMAL'))
  `);
  await knex.schema.raw(`
    alter table fiscal_settings
    add constraint fiscal_settings_default_iss_rate_check
    check (default_iss_rate >= 2 and default_iss_rate <= 5)
  `);
  await knex.schema.raw(`
    alter table fiscal_settings
    add constraint fiscal_settings_service_municipality_ibge_code_check
    check (
      service_municipality_ibge_code is null
      or service_municipality_ibge_code ~ '^[0-9]{7}$'
    )
  `);

  await knex.schema.createTable("fiscal_services", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("branch_id")
      .notNullable()
      .references("id")
      .inTable("branches")
      .onDelete("RESTRICT");
    table.string("name", 160).notNullable();
    table.string("national_tax_code", 6).notNullable();
    table.string("municipal_tax_code", 40);
    table.string("nbs_code", 9);
    table.text("description");
    table.decimal("iss_rate", 5, 2).notNullable();
    table.boolean("active").notNullable().defaultTo(true);
    table
      .timestamp("created_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
    table
      .timestamp("updated_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());

    table.check(
      "national_tax_code ~ '^[0-9]{6}$'",
      [],
      "fiscal_services_national_tax_code_check",
    );
    table.check(
      "iss_rate >= 2 and iss_rate <= 5",
      [],
      "fiscal_services_iss_rate_check",
    );
    table.check(
      "nbs_code is null or nbs_code ~ '^[0-9]{9}$'",
      [],
      "fiscal_services_nbs_code_check",
    );
    table.index(
      ["branch_id", "active", "name"],
      "fiscal_services_branch_active_name_index",
    );
  });

  await knex.schema.raw(`
    create unique index fiscal_services_branch_name_unique
    on fiscal_services (branch_id, lower(name))
  `);
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("fiscal_services");

  await knex.schema.raw(
    "alter table fiscal_settings drop constraint if exists fiscal_settings_service_municipality_ibge_code_check",
  );
  await knex.schema.raw(
    "alter table fiscal_settings drop constraint if exists fiscal_settings_default_iss_rate_check",
  );
  await knex.schema.raw(
    "alter table fiscal_settings drop constraint if exists fiscal_settings_service_tax_regime_check",
  );

  await knex.schema.alterTable("fiscal_settings", (table) => {
    table.dropColumn("default_retain_inss");
    table.dropColumn("default_retain_ir");
    table.dropColumn("default_retain_csll");
    table.dropColumn("default_retain_cofins");
    table.dropColumn("default_retain_pis");
    table.dropColumn("default_iss_rate");
    table.dropColumn("service_tax_regime");
    table.dropColumn("service_municipality_ibge_code");
    table.dropColumn("service_municipality_state");
    table.dropColumn("service_municipality_name");
    table.dropColumn("municipal_registration");
  });
};
