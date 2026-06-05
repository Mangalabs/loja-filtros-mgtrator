exports.up = async function up(knex) {
  await knex.schema.alterTable("quotes", (table) => {
    table.boolean("show_brand").notNullable().defaultTo(true);
  });
};

exports.down = async function down(knex) {
  await knex.schema.alterTable("quotes", (table) => {
    table.dropColumn("show_brand");
  });
};
