exports.up = async function up(knex) {
  await knex.schema.alterTable("products", (table) => {
    table.text("internal_notes");
  });
};

exports.down = async function down(knex) {
  await knex.schema.alterTable("products", (table) => {
    table.dropColumn("internal_notes");
  });
};
