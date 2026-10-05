exports.up = async function up(knex) {
  await knex.schema.createTable("quote_product_aliases", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("branch_id")
      .notNullable()
      .references("id")
      .inTable("branches")
      .onDelete("CASCADE");
    table
      .uuid("product_id")
      .notNullable()
      .references("id")
      .inTable("products")
      .onDelete("CASCADE");
    table
      .uuid("created_by_user_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("RESTRICT");
    table
      .uuid("updated_by_user_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("RESTRICT");
    table
      .uuid("deleted_by_user_id")
      .references("id")
      .inTable("users")
      .onDelete("RESTRICT");
    table.string("alias", 180).notNullable();
    table.string("normalized_alias", 180).notNullable();
    table
      .timestamp("created_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
    table
      .timestamp("updated_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
    table.timestamp("deleted_at", { useTz: true });

    table.check("btrim(alias) <> ''", [], "quote_product_aliases_alias_check");
    table.check(
      "btrim(normalized_alias) <> ''",
      [],
      "quote_product_aliases_normalized_alias_check",
    );
    table.unique(
      ["branch_id", "product_id", "normalized_alias"],
      { indexName: "quote_product_aliases_branch_product_alias_unique" },
    );
    table.index(
      ["branch_id", "normalized_alias"],
      "quote_product_aliases_branch_normalized_alias_index",
    );
    table.index("product_id", "quote_product_aliases_product_id_index");
    table.index(
      "created_by_user_id",
      "quote_product_aliases_created_by_user_id_index",
    );
    table.index(
      "updated_by_user_id",
      "quote_product_aliases_updated_by_user_id_index",
    );
    table.index(
      "deleted_by_user_id",
      "quote_product_aliases_deleted_by_user_id_index",
    );
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("quote_product_aliases");
};
