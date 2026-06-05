exports.up = async function up(knex) {
  await knex.schema.alterTable("shipping_order_items", (table) => {
    table.string("description", 500).nullable();
  });
};

exports.down = async function down(knex) {
  await knex.schema.alterTable("shipping_order_items", (table) => {
    table.dropColumn("description");
  });
};
