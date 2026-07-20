exports.up = async function up(knex) {
  await knex.schema.alterTable("sale_item_returns", (table) => {
    table.decimal("refund_amount", 12, 2);
    table
      .uuid("refund_payment_method_id")
      .references("id")
      .inTable("payment_methods")
      .onDelete("RESTRICT");
    table.timestamp("refunded_at", { useTz: true });
    table.string("refund_reference", 120);
  });

  await knex.schema.raw(`
    update sale_item_returns
    set
      refund_amount = round(((sale_item_returns.quantity / sale_items.quantity) * sale_items.total_amount)::numeric, 2),
      refund_payment_method_id = sale_payments.payment_method_id,
      refunded_at = sale_item_returns.created_at
    from sale_items
    cross join sale_payments
    where sale_items.id = sale_item_returns.sale_item_id
      and sale_payments.sale_id = sale_item_returns.sale_id
  `);

  await knex.schema.raw(`
    alter table sale_item_returns
      alter column refund_amount set not null,
      alter column refund_payment_method_id set not null,
      alter column refunded_at set not null
  `);

  await knex.schema.raw(
    "alter table sale_item_returns add constraint sale_item_returns_refund_amount_check check (refund_amount >= 0)",
  );
  await knex.schema.raw(
    "alter table sale_item_returns add constraint sale_item_returns_refund_reference_check check (refund_reference is null or btrim(refund_reference) <> '')",
  );
};

exports.down = async function down(knex) {
  await knex.schema.raw(
    "alter table sale_item_returns drop constraint if exists sale_item_returns_refund_reference_check",
  );
  await knex.schema.raw(
    "alter table sale_item_returns drop constraint if exists sale_item_returns_refund_amount_check",
  );

  await knex.schema.alterTable("sale_item_returns", (table) => {
    table.dropColumn("refund_reference");
    table.dropColumn("refunded_at");
    table.dropColumn("refund_payment_method_id");
    table.dropColumn("refund_amount");
  });
};
