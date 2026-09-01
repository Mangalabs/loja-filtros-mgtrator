exports.up = async function up(knex) {
  await knex.schema.createTable("quote_payments", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("quote_id")
      .notNullable()
      .references("id")
      .inTable("quotes")
      .onDelete("CASCADE");
    table
      .uuid("payment_method_id")
      .notNullable()
      .references("id")
      .inTable("payment_methods")
      .onDelete("RESTRICT");
    table.integer("position").notNullable();
    table.decimal("amount", 12, 2).notNullable();
    table
      .timestamp("created_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());

    table.check("position > 0", [], "quote_payments_position_check");
    table.check("amount > 0", [], "quote_payments_amount_check");
    table.unique(["quote_id", "position"]);
  });

  await knex.raw(`
    insert into quote_payments (quote_id, payment_method_id, position, amount)
    select id, payment_method_id, 1, total_amount
    from quotes
    where payment_method_id is not null
      and total_amount > 0
  `);
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("quote_payments");
};
