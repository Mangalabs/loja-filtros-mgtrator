exports.up = async function up(knex) {
  await knex.schema.alterTable("products", (table) => {
    table.decimal("current_stock", 12, 3).notNullable().defaultTo(0);
  });
};

exports.down = async function down(knex) {
  await knex.schema.alterTable("products", (table) => {
    table.dropColumn("current_stock");
  });
};
