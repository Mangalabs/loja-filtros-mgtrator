exports.up = async function up(knex) {
  await knex.schema.alterTable("stock_movements", (table) => {
    table
      .uuid("purchase_invoice_id")
      .references("id")
      .inTable("purchase_invoices")
      .onDelete("SET NULL");
  });

  await knex.schema.raw(
    "create index stock_movements_purchase_invoice_id_index on stock_movements (purchase_invoice_id)",
  );
};

exports.down = async function down(knex) {
  await knex.schema.raw(
    "drop index if exists stock_movements_purchase_invoice_id_index",
  );

  await knex.schema.alterTable("stock_movements", (table) => {
    table.dropColumn("purchase_invoice_id");
  });
};
