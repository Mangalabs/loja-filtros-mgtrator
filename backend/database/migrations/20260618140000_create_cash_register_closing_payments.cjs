exports.up = async function up(knex) {
  await knex.schema.createTable("cash_register_closing_payments", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("cash_register_session_id")
      .notNullable()
      .references("id")
      .inTable("cash_register_sessions")
      .onDelete("CASCADE");
    table
      .uuid("payment_method_id")
      .notNullable()
      .references("id")
      .inTable("payment_methods")
      .onDelete("RESTRICT");
    table.decimal("amount", 12, 2).notNullable();

    table.check(
      "amount >= 0",
      [],
      "cash_register_closing_payments_amount_check",
    );
    table.unique(["cash_register_session_id", "payment_method_id"], {
      indexName: "cash_register_closing_payments_session_method_unique",
    });
  });
}

exports.down = async function down(knex) {
  await knex.schema.dropTable("cash_register_closing_payments");
}
