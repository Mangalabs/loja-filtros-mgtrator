/** @param {import('knex').Knex} knex */
exports.up = async function up(knex) {
  for (const tableName of [
    "quote_form_drafts",
    "manual_fiscal_document_drafts",
    "service_fiscal_document_drafts",
  ]) {
    await knex.schema.alterTable(tableName, (table) => {
      table
        .uuid("shared_with_user_id")
        .nullable()
        .references("id")
        .inTable("users")
        .onDelete("SET NULL");
      table.index(
        ["branch_id", "shared_with_user_id", "updated_at"],
        `${tableName}_shared_with_updated_index`,
      );
    });
  }
};

/** @param {import('knex').Knex} knex */
exports.down = async function down(knex) {
  for (const tableName of [
    "service_fiscal_document_drafts",
    "manual_fiscal_document_drafts",
    "quote_form_drafts",
  ]) {
    await knex.schema.alterTable(tableName, (table) => {
      table.dropIndex(
        ["branch_id", "shared_with_user_id", "updated_at"],
        `${tableName}_shared_with_updated_index`,
      );
      table.dropColumn("shared_with_user_id");
    });
  }
};
