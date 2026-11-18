exports.up = async function up(knex) {
  await knex.schema.alterTable("service_fiscal_documents", (table) => {
    table.string("cancellation_reason", 255);
    table.timestamp("cancelled_at", { useTz: true });
    table
      .uuid("cancelled_by_user_id")
      .references("id")
      .inTable("users")
      .onDelete("RESTRICT");
    table.jsonb("cancellation_response_payload");
  });
};

exports.down = async function down(knex) {
  await knex.schema.alterTable("service_fiscal_documents", (table) => {
    table.dropColumn("cancellation_response_payload");
    table.dropColumn("cancelled_by_user_id");
    table.dropColumn("cancelled_at");
    table.dropColumn("cancellation_reason");
  });

};
