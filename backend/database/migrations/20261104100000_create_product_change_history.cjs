exports.up = async function up(knex) {
  await knex.schema.createTable("product_change_history", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("product_id")
      .notNullable()
      .references("id")
      .inTable("products")
      .onDelete("RESTRICT");
    table
      .uuid("branch_id")
      .notNullable()
      .references("id")
      .inTable("branches")
      .onDelete("RESTRICT");
    table
      .uuid("created_by_user_id")
      .references("id")
      .inTable("users")
      .onDelete("SET NULL");
    table.string("type", 40).notNullable();
    table.text("description").notNullable();
    table.jsonb("changes").notNullable().defaultTo(knex.raw("'{}'::jsonb"));
    table
      .timestamp("created_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());

    table.index(["branch_id", "created_at"]);
    table.index(["product_id", "created_at"]);
  });

  await knex.schema.raw(
    "alter table product_change_history add constraint product_change_history_type_check check (type in ('PRODUCT_CREATED', 'PRODUCT_UPDATED', 'PRODUCT_STATUS_CHANGED', 'PRODUCT_DELETED', 'PRODUCT_REPLENISHMENT_CHANGED'))",
  );
  await knex.schema.raw(
    "create index products_branch_internal_code_normalized_index on products (branch_id, lower(btrim(internal_code))) where internal_code is not null and btrim(internal_code) <> ''",
  );
};

exports.down = async function down(knex) {
  await knex.schema.raw(
    "drop index if exists products_branch_internal_code_normalized_index",
  );
  await knex.schema.dropTableIfExists("product_change_history");
};
