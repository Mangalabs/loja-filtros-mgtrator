exports.up = async function up(knex) {
  await knex.schema.createTable("quotes", (table) => {
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
    table.string("status", 20).notNullable().defaultTo("DRAFT");
    table.decimal("total_amount", 12, 2).notNullable();
    table.date("valid_until").nullable();
    table.string("notes", 1000).nullable();
    table
      .timestamp("created_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
    table
      .timestamp("updated_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());

    table.check("status in ('DRAFT')", [], "quotes_status_check");
    table.check("total_amount >= 0", [], "quotes_total_amount_check");
    table.index(["status", "created_at"]);
  });

  await knex.schema.createTable("quote_items", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("quote_id")
      .notNullable()
      .references("id")
      .inTable("quotes")
      .onDelete("CASCADE");
    table
      .uuid("product_id")
      .notNullable()
      .references("id")
      .inTable("products")
      .onDelete("RESTRICT");
    table.string("description", 500).notNullable();
    table.decimal("quantity", 12, 3).notNullable();
    table.decimal("unit_price", 12, 2).notNullable();
    table.decimal("total_amount", 12, 2).notNullable();
    table.integer("position").notNullable();

    table.check("quantity > 0", [], "quote_items_quantity_check");
    table.check("unit_price >= 0", [], "quote_items_unit_price_check");
    table.check("total_amount >= 0", [], "quote_items_total_amount_check");
    table.unique(["quote_id", "position"]);
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTable("quote_items");
  await knex.schema.dropTable("quotes");
};
