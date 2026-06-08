exports.up = async function up(knex) {
  await knex.schema.alterTable("products", (table) => {
    table.string("icms_cst", 3);
    table.string("pis_cst", 2);
    table.string("cofins_cst", 2);
  });
};

exports.down = async function down(knex) {
  await knex.schema.alterTable("products", (table) => {
    table.dropColumn("icms_cst");
    table.dropColumn("pis_cst");
    table.dropColumn("cofins_cst");
  });
};
