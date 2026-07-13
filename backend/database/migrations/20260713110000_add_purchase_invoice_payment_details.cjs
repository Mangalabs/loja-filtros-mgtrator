exports.up = async function up(knex) {
  await knex.schema.alterTable("purchase_invoices", (table) => {
    table.string("transporter_name", 160);
    table.string("transporter_document", 20);
  });

  await knex.schema.createTable("purchase_invoice_installments", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("purchase_invoice_id")
      .notNullable()
      .references("id")
      .inTable("purchase_invoices")
      .onDelete("CASCADE");
    table.integer("position").notNullable();
    table.string("number", 20);
    table.date("due_date");
    table.decimal("value", 12, 2).notNullable().defaultTo(0);
    table
      .timestamp("created_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());

    table.check(
      "position > 0",
      [],
      "purchase_invoice_installments_position_check",
    );
    table.check("value >= 0", [], "purchase_invoice_installments_value_check");
    table.unique(["purchase_invoice_id", "position"]);
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTableIfExists("purchase_invoice_installments");

  await knex.schema.alterTable("purchase_invoices", (table) => {
    table.dropColumn("transporter_document");
    table.dropColumn("transporter_name");
  });
};
