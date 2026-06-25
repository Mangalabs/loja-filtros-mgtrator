exports.up = async function up(knex) {
  await knex.schema.alterTable("quotes", (table) => {
    table.decimal("subtotal_amount", 12, 2).nullable();
    table.decimal("discount_amount", 12, 2).notNullable().defaultTo(0);
  });

  await knex("quotes").update({
    subtotal_amount: knex.ref("total_amount"),
  });

  await knex.schema.alterTable("quotes", (table) => {
    table.decimal("subtotal_amount", 12, 2).notNullable().alter();
    table.check(
      "subtotal_amount >= 0",
      [],
      "quotes_subtotal_amount_check",
    );
    table.check("discount_amount >= 0", [], "quotes_discount_amount_check");
    table.check(
      "discount_amount <= subtotal_amount",
      [],
      "quotes_discount_limit_check",
    );
  });

  await knex.schema.alterTable("quote_items", (table) => {
    table.decimal("discount_amount", 12, 2).notNullable().defaultTo(0);
    table.check(
      "discount_amount >= 0",
      [],
      "quote_items_discount_amount_check",
    );
  });
};

exports.down = async function down(knex) {
  await knex.schema.alterTable("quote_items", (table) => {
    table.dropChecks(["quote_items_discount_amount_check"]);
    table.dropColumn("discount_amount");
  });

  await knex.schema.alterTable("quotes", (table) => {
    table.dropChecks([
      "quotes_subtotal_amount_check",
      "quotes_discount_amount_check",
      "quotes_discount_limit_check",
    ]);
    table.dropColumn("subtotal_amount");
    table.dropColumn("discount_amount");
  });
};
