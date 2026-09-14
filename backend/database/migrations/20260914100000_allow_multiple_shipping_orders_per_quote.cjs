exports.up = async function up(knex) {
  await knex.schema.raw("drop index if exists shipping_orders_quote_id_unique");

  await knex.schema.raw(
    "create index shipping_orders_quote_id_index on shipping_orders (quote_id) where quote_id is not null",
  );
};

exports.down = async function down(knex) {
  await knex.schema.raw("drop index if exists shipping_orders_quote_id_index");

  await knex.schema.raw(
    "create unique index shipping_orders_quote_id_unique on shipping_orders (quote_id) where quote_id is not null",
  );
};
