exports.up = async function up(knex) {
  await knex.schema.createTable("sale_item_returns", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("sale_id")
      .notNullable()
      .references("id")
      .inTable("sales")
      .onDelete("RESTRICT");
    table
      .uuid("sale_item_id")
      .notNullable()
      .references("id")
      .inTable("sale_items")
      .onDelete("RESTRICT");
    table
      .uuid("product_id")
      .notNullable()
      .references("id")
      .inTable("products")
      .onDelete("RESTRICT");
    table
      .uuid("created_by_user_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("RESTRICT");
    table.decimal("quantity", 12, 3).notNullable();
    table.string("reason", 500).notNullable();
    table
      .timestamp("created_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());

    table.check("quantity > 0", [], "sale_item_returns_quantity_check");
    table.check(
      "btrim(reason) <> ''",
      [],
      "sale_item_returns_reason_check",
    );
    table.index(["sale_id", "created_at"]);
    table.index(["sale_item_id"]);
  });

  await knex.schema.raw(
    "alter table stock_movements drop constraint stock_movements_data_check",
  );
  await knex.schema.raw(
    "alter table stock_movements drop constraint stock_movements_type_check",
  );
  await knex.schema.raw(
    "alter table stock_movements add constraint stock_movements_type_check check (type in ('ENTRY', 'ADJUSTMENT', 'SALE', 'SALE_CANCEL', 'SALE_RETURN'))",
  );
  await knex.schema.raw(
    "alter table stock_movements add constraint stock_movements_data_check check ((type = 'ENTRY' and sale_id is null and supplier_id is not null and quantity > 0 and unit_cost >= 0) or (type = 'ADJUSTMENT' and sale_id is null and supplier_id is null and quantity <> 0 and unit_cost is null and notes is not null and btrim(notes) <> '') or (type = 'SALE' and sale_id is not null and supplier_id is null and quantity < 0 and unit_cost is null and notes is null) or (type in ('SALE_CANCEL', 'SALE_RETURN') and sale_id is not null and supplier_id is null and quantity > 0 and unit_cost is null and notes is not null and btrim(notes) <> ''))",
  );
}

exports.down = async function down(knex) {
  await knex("stock_movements").where("type", "SALE_RETURN").del();
  await knex.schema.dropTable("sale_item_returns");

  await knex.schema.raw(
    "alter table stock_movements drop constraint stock_movements_data_check",
  );
  await knex.schema.raw(
    "alter table stock_movements drop constraint stock_movements_type_check",
  );
  await knex.schema.raw(
    "alter table stock_movements add constraint stock_movements_type_check check (type in ('ENTRY', 'ADJUSTMENT', 'SALE', 'SALE_CANCEL'))",
  );
  await knex.schema.raw(
    "alter table stock_movements add constraint stock_movements_data_check check ((type = 'ENTRY' and sale_id is null and supplier_id is not null and quantity > 0 and unit_cost >= 0) or (type = 'ADJUSTMENT' and sale_id is null and supplier_id is null and quantity <> 0 and unit_cost is null and notes is not null and btrim(notes) <> '') or (type = 'SALE' and sale_id is not null and supplier_id is null and quantity < 0 and unit_cost is null and notes is null) or (type = 'SALE_CANCEL' and sale_id is not null and supplier_id is null and quantity > 0 and unit_cost is null and notes is not null and btrim(notes) <> ''))",
  );
}
