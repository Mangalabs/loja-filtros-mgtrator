exports.up = async function up(knex) {
  await knex.schema.alterTable("products", (table) => {
    table
      .uuid("branch_id")
      .references("id")
      .inTable("branches")
      .onDelete("RESTRICT");
  });

  await knex.schema.raw(
    "create index products_branch_id_index on products (branch_id)",
  );
};

exports.down = async function down(knex) {
  await knex.schema.raw("drop index if exists products_branch_id_index");

  await knex.schema.alterTable("products", (table) => {
    table.dropColumn("branch_id");
  });
};
