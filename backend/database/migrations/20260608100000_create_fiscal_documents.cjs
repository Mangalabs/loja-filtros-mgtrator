exports.up = async function up(knex) {
  await knex.schema.createTable("fiscal_documents", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.string("source_type", 40).notNullable();
    table.uuid("source_id").notNullable();
    table.string("document_type", 10).notNullable();
    table.string("provider", 20).notNullable();
    table.string("environment", 20).notNullable();
    table.string("status", 20).notNullable();
    table.string("access_key", 80).nullable();
    table.string("provider_reference", 120).nullable();
    table.integer("number").nullable();
    table.integer("series").nullable();
    table.text("xml_url").nullable();
    table.text("pdf_url").nullable();
    table.string("rejection_reason", 500).nullable();
    table.jsonb("request_payload").nullable();
    table.jsonb("response_payload").nullable();
    table
      .uuid("issued_by_user_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("RESTRICT");
    table.timestamp("issued_at", { useTz: true }).nullable();
    table.timestamps(true, true);

    table.unique(["source_type", "source_id", "document_type"]);
    table.index(["status", "created_at"]);
    table.check(
      "source_type in ('SALE', 'SHIPPING_ORDER', 'PICKUP_RESERVATION')",
      [],
      "fiscal_documents_source_type_check",
    );
    table.check(
      "document_type in ('NFE', 'NFCE')",
      [],
      "fiscal_documents_document_type_check",
    );
    table.check(
      "provider in ('MOCK', 'FOCUS')",
      [],
      "fiscal_documents_provider_check",
    );
    table.check(
      "environment in ('HOMOLOGATION', 'PRODUCTION')",
      [],
      "fiscal_documents_environment_check",
    );
    table.check(
      "status in ('PENDING', 'PROCESSING', 'AUTHORIZED', 'REJECTED', 'CANCELLED')",
      [],
      "fiscal_documents_status_check",
    );
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTable("fiscal_documents");
};
