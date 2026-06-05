exports.up = async function up(knex) {
  await knex.schema.createTable("sales", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("cash_register_session_id")
      .notNullable()
      .references("id")
      .inTable("cash_register_sessions")
      .onDelete("RESTRICT");
    table
      .uuid("created_by_user_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("RESTRICT");
    table
      .uuid("client_id")
      .nullable()
      .references("id")
      .inTable("clients")
      .onDelete("RESTRICT");
    table.string("status", 20).notNullable().defaultTo("COMPLETED");
    table.decimal("total_amount", 12, 2).notNullable();
    table
      .timestamp("created_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());

    table.check("status in ('COMPLETED')", [], "sales_status_check");
    table.check("total_amount >= 0", [], "sales_total_amount_check");
    table.index(["created_at"]);
  });

  await knex.schema.createTable("sale_items", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("sale_id")
      .notNullable()
      .references("id")
      .inTable("sales")
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

    table.check("quantity > 0", [], "sale_items_quantity_check");
    table.check("unit_price >= 0", [], "sale_items_unit_price_check");
    table.check("total_amount >= 0", [], "sale_items_total_amount_check");
  });

  await knex.schema.createTable("sale_payments", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("sale_id")
      .notNullable()
      .references("id")
      .inTable("sales")
      .onDelete("CASCADE");
    table
      .uuid("payment_method_id")
      .notNullable()
      .references("id")
      .inTable("payment_methods")
      .onDelete("RESTRICT");
    table.decimal("amount", 12, 2).notNullable();

    table.check("amount >= 0", [], "sale_payments_amount_check");
  });

  await knex.schema.raw(
    "alter table stock_movements drop constraint stock_movements_data_check",
  );
  await knex.schema.raw(
    "alter table stock_movements drop constraint stock_movements_type_check",
  );
  await knex.schema.alterTable("stock_movements", (table) => {
    table
      .uuid("sale_id")
      .nullable()
      .references("id")
      .inTable("sales")
      .onDelete("RESTRICT");
  });
  await knex.schema.raw(
    "alter table stock_movements add constraint stock_movements_type_check check (type in ('ENTRY', 'ADJUSTMENT', 'SALE'))",
  );
  await knex.schema.raw(
    "alter table stock_movements add constraint stock_movements_data_check check ((type = 'ENTRY' and sale_id is null and supplier_id is not null and quantity > 0 and unit_cost >= 0) or (type = 'ADJUSTMENT' and sale_id is null and supplier_id is null and quantity <> 0 and unit_cost is null and notes is not null and btrim(notes) <> '') or (type = 'SALE' and sale_id is not null and supplier_id is null and quantity < 0 and unit_cost is null and notes is null))",
  );
};

exports.down = async function down(knex) {
  await knex("stock_movements").where("type", "SALE").del();
  await knex.schema.raw(
    "alter table stock_movements drop constraint stock_movements_data_check",
  );
  await knex.schema.raw(
    "alter table stock_movements drop constraint stock_movements_type_check",
  );
  await knex.schema.alterTable("stock_movements", (table) => {
    table.dropColumn("sale_id");
  });
  await knex.schema.raw(
    "alter table stock_movements add constraint stock_movements_type_check check (type in ('ENTRY', 'ADJUSTMENT'))",
  );
  await knex.schema.raw(
    "alter table stock_movements add constraint stock_movements_data_check check ((type = 'ENTRY' and supplier_id is not null and quantity > 0 and unit_cost >= 0) or (type = 'ADJUSTMENT' and supplier_id is null and quantity <> 0 and unit_cost is null and notes is not null and btrim(notes) <> ''))",
  );

  await knex.schema.dropTable("sale_payments");
  await knex.schema.dropTable("sale_items");
  await knex.schema.dropTable("sales");
};
