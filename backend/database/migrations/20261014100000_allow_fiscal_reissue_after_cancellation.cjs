exports.up = async function up(knex) {
  await knex.schema.raw(`
    alter table fiscal_documents
      drop constraint fiscal_documents_source_type_source_id_document_type_unique
  `);

  await knex.schema.raw(`
    create unique index fiscal_documents_active_source_unique
      on fiscal_documents (source_type, source_id, document_type)
      where status <> 'CANCELLED'
  `);

  await knex.schema.raw(`
    create index fiscal_documents_source_history_index
      on fiscal_documents (
        source_type,
        source_id,
        document_type,
        created_at desc
      )
  `);
};

exports.down = async function down(knex) {
  await knex.schema.raw(`
    drop index fiscal_documents_source_history_index
  `);

  await knex.schema.raw(`
    drop index fiscal_documents_active_source_unique
  `);

  await knex.schema.raw(`
    alter table fiscal_documents
      add constraint fiscal_documents_source_type_source_id_document_type_unique
      unique (source_type, source_id, document_type)
  `);
};
