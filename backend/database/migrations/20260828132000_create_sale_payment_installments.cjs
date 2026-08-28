exports.up = async function up(knex) {
  await knex.schema.createTable("sale_payment_installments", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("sale_id")
      .notNullable()
      .references("id")
      .inTable("sales")
      .onDelete("CASCADE");
    table.integer("position").notNullable();
    table.date("due_date").notNullable();
    table.decimal("amount", 12, 2).notNullable();
    table
      .timestamp("created_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());

    table.check("position > 0", [], "sale_payment_installments_position_check");
    table.check("amount > 0", [], "sale_payment_installments_amount_check");
    table.unique(["sale_id", "position"]);
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("sale_payment_installments");
};
