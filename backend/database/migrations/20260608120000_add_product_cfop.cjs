exports.up = async function up(knex) {
  await knex.schema.alterTable("products", (table) => {
    table.string("cfop", 4);
  });
};

exports.down = async function down(knex) {
  await knex.schema.alterTable("products", (table) => {
    table.dropColumn("cfop");
  });
};
