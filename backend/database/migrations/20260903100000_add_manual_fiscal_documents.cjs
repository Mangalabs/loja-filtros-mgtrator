exports.up = async function up(knex) {
  await knex.schema.raw(
    "alter table fiscal_documents drop constraint fiscal_documents_source_type_check",
  );
  await knex.schema.alterTable("fiscal_documents", (table) => {
    table.check(
      "source_type in ('SALE', 'SHIPPING_ORDER', 'PICKUP_RESERVATION', 'MANUAL_NFE')",
      [],
      "fiscal_documents_source_type_check",
    );
  });
};

exports.down = async function down(knex) {
  await knex.schema.raw(
    "alter table fiscal_documents drop constraint fiscal_documents_source_type_check",
  );
  await knex.schema.alterTable("fiscal_documents", (table) => {
    table.check(
      "source_type in ('SALE', 'SHIPPING_ORDER', 'PICKUP_RESERVATION')",
      [],
      "fiscal_documents_source_type_check",
    );
  });
};
