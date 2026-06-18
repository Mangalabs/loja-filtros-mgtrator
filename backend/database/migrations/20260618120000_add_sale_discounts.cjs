exports.up = async function up(knex) {
  await knex.schema.alterTable("sales", (table) => {
    table.decimal("subtotal_amount", 12, 2).notNullable().defaultTo(0);
    table.decimal("discount_amount", 12, 2).notNullable().defaultTo(0);
  });

  await knex("sales").update({
    subtotal_amount: knex.ref("total_amount"),
    discount_amount: 0,
  });

  await knex.schema.raw(
    "alter table sales add constraint sales_subtotal_amount_check check (subtotal_amount >= 0)",
  );
  await knex.schema.raw(
    "alter table sales add constraint sales_discount_amount_check check (discount_amount >= 0 and discount_amount <= subtotal_amount)",
  );
}

exports.down = async function down(knex) {
  await knex.schema.raw(
    "alter table sales drop constraint if exists sales_discount_amount_check",
  );
  await knex.schema.raw(
    "alter table sales drop constraint if exists sales_subtotal_amount_check",
  );
  await knex.schema.alterTable("sales", (table) => {
    table.dropColumn("discount_amount");
    table.dropColumn("subtotal_amount");
  });
}
