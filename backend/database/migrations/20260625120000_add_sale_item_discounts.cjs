exports.up = async function up(knex) {
  await knex.schema.alterTable("sale_items", (table) => {
    table.decimal("discount_amount", 12, 2).notNullable().defaultTo(0);
    table.check(
      "discount_amount >= 0",
      [],
      "sale_items_discount_amount_check",
    );
  });
};

exports.down = async function down(knex) {
  await knex.schema.alterTable("sale_items", (table) => {
    table.dropChecks(["sale_items_discount_amount_check"]);
    table.dropColumn("discount_amount");
  });
};
