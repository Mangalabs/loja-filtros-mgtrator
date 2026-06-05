exports.up = async function up(knex) {
  await knex.schema.alterTable("products", (table) => {
    table.decimal("reserved_stock", 12, 3).notNullable().defaultTo(0);
  });
  await knex.schema.raw(
    "alter table products add constraint products_reserved_stock_check check (reserved_stock >= 0 and reserved_stock <= current_stock)",
  );

  await knex.schema.createTable("shipping_orders", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("client_id")
      .notNullable()
      .references("id")
      .inTable("clients")
      .onDelete("RESTRICT");
    table
      .uuid("created_by_user_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("RESTRICT");
    table
      .uuid("approved_by_user_id")
      .nullable()
      .references("id")
      .inTable("users")
      .onDelete("RESTRICT");
    table.string("status", 20).notNullable().defaultTo("QUOTED");
    table.decimal("total_amount", 12, 2).notNullable();
    table
      .timestamp("created_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
    table.timestamp("approved_at", { useTz: true }).nullable();

    table.check(
      "status in ('QUOTED', 'APPROVED')",
      [],
      "shipping_orders_status_check",
    );
    table.check("total_amount >= 0", [], "shipping_orders_total_amount_check");
    table.index(["status", "created_at"]);
  });

  await knex.schema.createTable("shipping_order_items", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("shipping_order_id")
      .notNullable()
      .references("id")
      .inTable("shipping_orders")
      .onDelete("CASCADE");
    table
      .uuid("product_id")
      .notNullable()
      .references("id")
      .inTable("products")
      .onDelete("RESTRICT");
    table.decimal("quantity", 12, 3).notNullable();
    table.decimal("unit_price", 12, 2).notNullable();
    table.decimal("total_amount", 12, 2).notNullable();

    table.check("quantity > 0", [], "shipping_order_items_quantity_check");
    table.check("unit_price >= 0", [], "shipping_order_items_unit_price_check");
    table.check(
      "total_amount >= 0",
      [],
      "shipping_order_items_total_amount_check",
    );
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTable("shipping_order_items");
  await knex.schema.dropTable("shipping_orders");
  await knex.schema.raw(
    "alter table products drop constraint products_reserved_stock_check",
  );
  await knex.schema.alterTable("products", (table) => {
    table.dropColumn("reserved_stock");
  });
};
