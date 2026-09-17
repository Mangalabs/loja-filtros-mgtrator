exports.up = async function up(knex) {
  await knex.schema.createTable("fiscal_document_correction_letters", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("fiscal_document_id")
      .notNullable()
      .references("id")
      .inTable("fiscal_documents")
      .onDelete("CASCADE");
    table
      .uuid("created_by_user_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("RESTRICT");
    table.text("correction_text").notNullable();
    table.jsonb("response_payload").notNullable().defaultTo("{}");
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
  });

  await knex.schema.raw(
    "create index fiscal_document_correction_letters_document_id_index on fiscal_document_correction_letters (fiscal_document_id, created_at desc)",
  );
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("fiscal_document_correction_letters");
};
