exports.up = async function up(knex) {
  await knex.schema.alterTable("sale_items", (table) => {
    table.string("description", 500).nullable();
  });
};

exports.down = async function down(knex) {
  await knex.schema.alterTable("sale_items", (table) => {
    table.dropColumn("description");
  });
};
