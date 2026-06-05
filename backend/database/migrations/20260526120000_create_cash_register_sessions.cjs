exports.up = async function up(knex) {
  await knex.schema.createTable("cash_register_sessions", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("opened_by_user_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("RESTRICT");
    table.decimal("opening_balance", 12, 2).notNullable();
    table.string("status", 20).notNullable().defaultTo("OPEN");
    table
      .timestamp("opened_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
    table
      .uuid("closed_by_user_id")
      .nullable()
      .references("id")
      .inTable("users")
      .onDelete("RESTRICT");
    table.decimal("closing_balance", 12, 2).nullable();
    table.timestamp("closed_at", { useTz: true }).nullable();

    table.check(
      "opening_balance >= 0",
      [],
      "cash_register_sessions_opening_balance_check",
    );
    table.check(
      "status in ('OPEN', 'CLOSED')",
      [],
      "cash_register_sessions_status_check",
    );
  });

  await knex.schema.raw(
    "create unique index cash_register_sessions_one_open_unique on cash_register_sessions ((true)) where status = 'OPEN'",
  );
};

exports.down = async function down(knex) {
  await knex.schema.dropTable("cash_register_sessions");
};
