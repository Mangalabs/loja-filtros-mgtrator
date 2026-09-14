exports.up = async function up(knex) {
  await knex.schema.alterTable("products", (table) => {
    table.timestamp("deleted_at", { useTz: true });
  });

  await knex.schema.raw(
    "create index products_deleted_at_index on products (deleted_at)",
  );
};

exports.down = async function down(knex) {
  await knex.schema.raw("drop index if exists products_deleted_at_index");

  await knex.schema.alterTable("products", (table) => {
    table.dropColumn("deleted_at");
  });
};
