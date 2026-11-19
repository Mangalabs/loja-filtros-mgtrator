exports.up = async function up(knex) {
  await knex.schema.alterTable("fiscal_settings", (table) => {
    table.decimal("simple_national_nominal_tax_rate", 5, 2).nullable();
    table.check(
      "simple_national_nominal_tax_rate > 0 and simple_national_nominal_tax_rate <= 100",
      [],
      "fiscal_settings_simple_national_nominal_tax_rate_check",
    );
  });
};

exports.down = async function down(knex) {
  await knex.schema.alterTable("fiscal_settings", (table) => {
    table.dropColumn("simple_national_nominal_tax_rate");
  });
};
