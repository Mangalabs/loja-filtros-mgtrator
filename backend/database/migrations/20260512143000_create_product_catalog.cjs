exports.up = async function up(knex) {
  await knex.raw('create extension if not exists "pgcrypto"');

  await knex.schema.createTable("brands", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.string("name", 120).notNullable();
    table.boolean("active").notNullable().defaultTo(true);
    table
      .timestamp("created_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
    table
      .timestamp("updated_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());

    table.unique(["name"]);
  });

  await knex.schema.createTable("suppliers", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.string("name", 160).notNullable();
    table.string("document", 32);
    table.string("email", 160);
    table.string("phone", 32);
    table.boolean("active").notNullable().defaultTo(true);
    table
      .timestamp("created_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
    table
      .timestamp("updated_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
  });

  await knex.schema.createTable("product_groups", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.string("name", 120).notNullable();
    table.boolean("active").notNullable().defaultTo(true);
    table
      .timestamp("created_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
    table
      .timestamp("updated_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());

    table.unique(["name"]);
  });

  await knex.schema.createTable("products", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.string("name", 180).notNullable();
    table.string("internal_code", 80);
    table.string("barcode", 80);
    table
      .uuid("brand_id")
      .references("id")
      .inTable("brands")
      .onDelete("SET NULL");
    table
      .uuid("group_id")
      .references("id")
      .inTable("product_groups")
      .onDelete("SET NULL");
    table.string("unit", 16).notNullable().defaultTo("UN");
    table.decimal("cost_price", 12, 2).notNullable().defaultTo(0);
    table.decimal("sale_price", 12, 2).notNullable().defaultTo(0);
    table.decimal("minimum_stock", 12, 3).notNullable().defaultTo(0);
    table.string("ncm", 16);
    table.string("cest", 16);
    table.string("origin", 2);
    table.text("description");
    table.boolean("active").notNullable().defaultTo(true);
    table
      .timestamp("created_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
    table
      .timestamp("updated_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
  });

  await knex.schema.createTable("product_suppliers", (table) => {
    table
      .uuid("product_id")
      .notNullable()
      .references("id")
      .inTable("products")
      .onDelete("CASCADE");
    table
      .uuid("supplier_id")
      .notNullable()
      .references("id")
      .inTable("suppliers")
      .onDelete("CASCADE");
    table.string("supplier_code", 80);
    table.decimal("last_cost_price", 12, 2);
    table
      .timestamp("created_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
    table
      .timestamp("updated_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());

    table.primary(["product_id", "supplier_id"]);
  });

  await knex.schema.raw(
    "create unique index products_barcode_unique_not_empty on products (barcode) where barcode is not null and barcode <> ''",
  );
  await knex.schema.raw(
    "create index products_internal_code_index on products (internal_code)",
  );
  await knex.schema.raw("create index products_name_index on products (name)");
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("product_suppliers");
  await knex.schema.dropTableIfExists("products");
  await knex.schema.dropTableIfExists("product_groups");
  await knex.schema.dropTableIfExists("suppliers");
  await knex.schema.dropTableIfExists("brands");
};
