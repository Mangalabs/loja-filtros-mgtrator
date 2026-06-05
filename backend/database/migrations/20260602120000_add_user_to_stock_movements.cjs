exports.up = async function up(knex) {
  await knex.schema.alterTable("stock_movements", (table) => {
    table
      .uuid("created_by_user_id")
      .nullable()
      .references("id")
      .inTable("users")
      .onDelete("SET NULL");
  });

  await knex.schema.raw(
    "create index stock_movements_created_by_user_id_index on stock_movements (created_by_user_id)",
  );
};

exports.down = async function down(knex) {
  await knex.schema.raw(
    "drop index if exists stock_movements_created_by_user_id_index",
  );

  await knex.schema.alterTable("stock_movements", (table) => {
    table.dropColumn("created_by_user_id");
  });
};
