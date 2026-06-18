exports.up = async function up(knex) {
  await knex.schema.createTable("cash_register_movements", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("cash_register_session_id")
      .notNullable()
      .references("id")
      .inTable("cash_register_sessions")
      .onDelete("CASCADE");
    table
      .uuid("created_by_user_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("RESTRICT");
    table.string("type", 20).notNullable();
    table.decimal("amount", 12, 2).notNullable();
    table.string("reason", 500).notNullable();
    table
      .timestamp("created_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());

    table.check(
      "type in ('SUPPLY', 'WITHDRAWAL')",
      [],
      "cash_register_movements_type_check",
    );
    table.check(
      "amount > 0",
      [],
      "cash_register_movements_amount_check",
    );
    table.check(
      "btrim(reason) <> ''",
      [],
      "cash_register_movements_reason_check",
    );
    table.index(["cash_register_session_id", "created_at"]);
  });
}

exports.down = async function down(knex) {
  await knex.schema.dropTable("cash_register_movements");
}
