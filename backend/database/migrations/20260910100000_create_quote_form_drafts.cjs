exports.up = async function up(knex) {
  await knex.schema.createTable("quote_form_drafts", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("branch_id")
      .notNullable()
      .references("id")
      .inTable("branches")
      .onDelete("CASCADE");
    table
      .uuid("created_by_user_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("RESTRICT");
    table.string("title", 180).notNullable();
    table.jsonb("payload").notNullable();
    table
      .timestamp("created_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
    table
      .timestamp("updated_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());

    table.check("btrim(title) <> ''", [], "quote_form_drafts_title_check");
    table.index(["branch_id", "created_by_user_id", "updated_at"]);
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("quote_form_drafts");
};
