exports.up = async function up(knex) {
  await knex.schema.alterTable("shipping_orders", (table) => {
    table.uuid("quote_id").nullable().references("id").inTable("quotes").onDelete("SET NULL");
  });

  await knex.schema.alterTable("shipping_order_items", (table) => {
    table.integer("position").notNullable().defaultTo(1);
  });

  await knex.schema.raw(
    "create unique index shipping_orders_quote_id_unique on shipping_orders (quote_id) where quote_id is not null",
  );
  await knex.schema.raw(
    "create unique index shipping_order_items_order_position_unique on shipping_order_items (shipping_order_id, position)",
  );
};

exports.down = async function down(knex) {
  await knex.schema.raw("drop index if exists shipping_order_items_order_position_unique");
  await knex.schema.raw("drop index if exists shipping_orders_quote_id_unique");

  await knex.schema.alterTable("shipping_order_items", (table) => {
    table.dropColumn("position");
  });

  await knex.schema.alterTable("shipping_orders", (table) => {
    table.dropColumn("quote_id");
  });
};
