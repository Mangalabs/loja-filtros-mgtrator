exports.up = async function up(knex) {
  await knex.schema.alterTable("fiscal_settings", (table) => {
    table.string("default_nature_operation", 60);
    table.string("default_sale_cfop", 4);
    table.string("default_icms_cst", 3);
    table.string("default_pis_cst", 2);
    table.string("default_cofins_cst", 2);
  });
};

exports.down = async function down(knex) {
  await knex.schema.alterTable("fiscal_settings", (table) => {
    table.dropColumn("default_nature_operation");
    table.dropColumn("default_sale_cfop");
    table.dropColumn("default_icms_cst");
    table.dropColumn("default_pis_cst");
    table.dropColumn("default_cofins_cst");
  });
};
