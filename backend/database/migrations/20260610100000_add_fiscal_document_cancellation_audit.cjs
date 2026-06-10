exports.up = async function up(knex) {
  await knex.schema.alterTable("fiscal_documents", (table) => {
    table
      .uuid("cancelled_by_user_id")
      .nullable()
      .references("id")
      .inTable("users")
      .onDelete("RESTRICT");
    table.timestamp("cancelled_at", { useTz: true }).nullable();
    table.string("cancellation_reason", 255).nullable();
  });
};

exports.down = async function down(knex) {
  await knex.schema.alterTable("fiscal_documents", (table) => {
    table.dropColumn("cancellation_reason");
    table.dropColumn("cancelled_at");
    table.dropColumn("cancelled_by_user_id");
  });
};
