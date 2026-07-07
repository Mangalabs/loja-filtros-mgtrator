exports.up = async function up(knex) {
  await knex.schema.alterTable("quotes", (table) => {
    table
      .uuid("payment_method_id")
      .nullable()
      .references("id")
      .inTable("payment_methods")
      .onDelete("RESTRICT");
    table.index(["payment_method_id"]);
  });
};

exports.down = async function down(knex) {
  await knex.schema.alterTable("quotes", (table) => {
    table.dropIndex(["payment_method_id"]);
    table.dropColumn("payment_method_id");
  });
};
