exports.up = async function up(knex) {
  await knex.schema.alterTable("shipping_orders", (table) => {
    table
      .uuid("branch_id")
      .references("id")
      .inTable("branches")
      .onDelete("RESTRICT");
  });

  await knex.schema.alterTable("pickup_reservations", (table) => {
    table
      .uuid("branch_id")
      .references("id")
      .inTable("branches")
      .onDelete("RESTRICT");
  });

  await knex.schema.raw(`
    update shipping_orders
    set branch_id = quotes.branch_id
    from quotes
    where shipping_orders.quote_id = quotes.id
      and shipping_orders.branch_id is null
      and quotes.branch_id is not null
  `);

  await knex.schema.raw(`
    update shipping_orders
    set branch_id = source.branch_id
    from (
      select distinct on (shipping_order_items.shipping_order_id)
        shipping_order_items.shipping_order_id,
        products.branch_id
      from shipping_order_items
      join products on products.id = shipping_order_items.product_id
      where products.branch_id is not null
      order by
        shipping_order_items.shipping_order_id,
        shipping_order_items.position asc nulls last,
        shipping_order_items.id
    ) as source
    where shipping_orders.id = source.shipping_order_id
      and shipping_orders.branch_id is null
  `);

  await knex.schema.raw(`
    update pickup_reservations
    set branch_id = source.branch_id
    from (
      select distinct on (pickup_reservation_items.pickup_reservation_id)
        pickup_reservation_items.pickup_reservation_id,
        products.branch_id
      from pickup_reservation_items
      join products on products.id = pickup_reservation_items.product_id
      where products.branch_id is not null
      order by
        pickup_reservation_items.pickup_reservation_id,
        pickup_reservation_items.position asc nulls last,
        pickup_reservation_items.id
    ) as source
    where pickup_reservations.id = source.pickup_reservation_id
      and pickup_reservations.branch_id is null
  `);

  await knex.schema.raw(
    "create index shipping_orders_branch_id_index on shipping_orders (branch_id)",
  );
  await knex.schema.raw(
    "create index pickup_reservations_branch_id_index on pickup_reservations (branch_id)",
  );
};

exports.down = async function down(knex) {
  await knex.schema.raw("drop index if exists pickup_reservations_branch_id_index");
  await knex.schema.raw("drop index if exists shipping_orders_branch_id_index");

  await knex.schema.alterTable("pickup_reservations", (table) => {
    table.dropColumn("branch_id");
  });

  await knex.schema.alterTable("shipping_orders", (table) => {
    table.dropColumn("branch_id");
  });
};
