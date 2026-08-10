exports.up = async function up(knex) {
  await knex.schema.alterTable("purchase_invoice_items", (table) => {
    table.string("cest", 16);
  });
};

exports.down = async function down(knex) {
  await knex.schema.alterTable("purchase_invoice_items", (table) => {
    table.dropColumn("cest");
  });
};
