exports.up = async function up(knex) {
  await knex.schema.createTable("stock_movements", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("product_id")
      .notNullable()
      .references("id")
      .inTable("products")
      .onDelete("RESTRICT");
    table
      .uuid("supplier_id")
      .notNullable()
      .references("id")
      .inTable("suppliers")
      .onDelete("RESTRICT");
    table.string("type", 20).notNullable();
    table.decimal("quantity", 12, 3).notNullable();
    table.decimal("unit_cost", 12, 2).notNullable();
    table.text("notes");
    table
      .timestamp("created_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());

    table.index(["product_id", "created_at"]);
  });

  await knex.schema.raw(
    "alter table stock_movements add constraint stock_movements_type_check check (type in ('ENTRY'))",
  );
  await knex.schema.raw(
    "alter table stock_movements add constraint stock_movements_quantity_positive_check check (quantity > 0)",
  );
  await knex.schema.raw(
    "alter table stock_movements add constraint stock_movements_unit_cost_nonnegative_check check (unit_cost >= 0)",
  );
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("stock_movements");
};
