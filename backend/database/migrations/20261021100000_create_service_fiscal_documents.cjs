exports.up = async function up(knex) {
  await knex.schema.raw(
    "create sequence service_fiscal_dps_number_seq start with 1 increment by 1 no cycle",
  );

  await knex.schema.createTable("service_fiscal_documents", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("branch_id")
      .notNullable()
      .references("id")
      .inTable("branches")
      .onDelete("RESTRICT");
    table
      .uuid("fiscal_service_id")
      .notNullable()
      .references("id")
      .inTable("fiscal_services")
      .onDelete("RESTRICT");
    table.string("provider", 20).notNullable();
    table.string("environment", 20).notNullable();
    table.string("status", 20).notNullable();
    table.string("provider_reference", 120).notNullable();
    table.string("protocol", 120);
    table.string("access_key", 80);
    table.integer("dps_series").notNullable();
    table
      .bigInteger("dps_number")
      .notNullable()
      .defaultTo(knex.raw("nextval('service_fiscal_dps_number_seq')"));
    table.string("nfse_number", 40);
    table.text("xml_url");
    table.text("pdf_url");
    table.string("rejection_reason", 1000);
    table.jsonb("request_payload").notNullable();
    table.jsonb("response_payload").notNullable();
    table
      .uuid("issued_by_user_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("RESTRICT");
    table.timestamp("issued_at", { useTz: true }).notNullable();
    table.timestamp("authorized_at", { useTz: true });
    table.timestamps(true, true);

    table.unique(
      ["provider", "environment", "provider_reference"],
      { indexName: "service_fiscal_documents_provider_reference_unique" },
    );
    table.unique(
      ["branch_id", "environment", "dps_series", "dps_number"],
      { indexName: "service_fiscal_documents_dps_unique" },
    );
    table.index(
      ["branch_id", "status", "created_at"],
      "service_fiscal_documents_branch_status_created_index",
    );
    table.check(
      "provider in ('MOCK', 'FOCUS')",
      [],
      "service_fiscal_documents_provider_check",
    );
    table.check(
      "environment in ('HOMOLOGATION', 'PRODUCTION')",
      [],
      "service_fiscal_documents_environment_check",
    );
    table.check(
      "status in ('PROCESSING', 'AUTHORIZED', 'REJECTED', 'CANCELLED')",
      [],
      "service_fiscal_documents_status_check",
    );
    table.check(
      "dps_series between 1 and 49999",
      [],
      "service_fiscal_documents_dps_series_check",
    );
    table.check(
      "dps_number > 0",
      [],
      "service_fiscal_documents_dps_number_check",
    );
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("service_fiscal_documents");
  await knex.schema.raw("drop sequence if exists service_fiscal_dps_number_seq");
};
