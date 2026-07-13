exports.up = async function up(knex) {
  await knex.schema.createTable("purchase_invoices", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("supplier_id")
      .references("id")
      .inTable("suppliers")
      .onDelete("RESTRICT");
    table
      .uuid("created_by_user_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("RESTRICT");
    table.string("access_key", 44).notNullable().unique();
    table.string("number", 20);
    table.string("series", 10);
    table.string("supplier_name", 160).notNullable();
    table.string("supplier_document", 20);
    table.date("issue_date");
    table.decimal("total_amount", 12, 2).notNullable().defaultTo(0);
    table.string("status", 20).notNullable().defaultTo("IMPORTED");
    table.text("xml_content");
    table
      .timestamp("created_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
    table
      .timestamp("updated_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());

    table.check(
      "status in ('IMPORTED', 'POSTED', 'CANCELLED')",
      [],
      "purchase_invoices_status_check",
    );
    table.check(
      "btrim(access_key) <> ''",
      [],
      "purchase_invoices_access_key_check",
    );
    table.check(
      "btrim(supplier_name) <> ''",
      [],
      "purchase_invoices_supplier_name_check",
    );
    table.check(
      "total_amount >= 0",
      [],
      "purchase_invoices_total_amount_check",
    );
    table.index(["supplier_id", "created_at"]);
    table.index(["status", "created_at"]);
  });

  await knex.schema.createTable("purchase_invoice_items", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("purchase_invoice_id")
      .notNullable()
      .references("id")
      .inTable("purchase_invoices")
      .onDelete("CASCADE");
    table
      .uuid("product_id")
      .references("id")
      .inTable("products")
      .onDelete("RESTRICT");
    table.integer("position").notNullable();
    table.string("supplier_product_code", 80);
    table.string("description", 500).notNullable();
    table.string("ncm", 8);
    table.string("cfop", 4);
    table.string("unit", 20);
    table.decimal("quantity", 12, 3).notNullable();
    table.decimal("unit_cost", 12, 2).notNullable();
    table.decimal("total_amount", 12, 2).notNullable();
    table
      .timestamp("created_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());

    table.check("position > 0", [], "purchase_invoice_items_position_check");
    table.check(
      "btrim(description) <> ''",
      [],
      "purchase_invoice_items_description_check",
    );
    table.check(
      "quantity > 0",
      [],
      "purchase_invoice_items_quantity_check",
    );
    table.check(
      "unit_cost >= 0",
      [],
      "purchase_invoice_items_unit_cost_check",
    );
    table.check(
      "total_amount >= 0",
      [],
      "purchase_invoice_items_total_amount_check",
    );
    table.unique(["purchase_invoice_id", "position"]);
    table.index(["product_id"]);
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("purchase_invoice_items");
  await knex.schema.dropTableIfExists("purchase_invoices");
};
