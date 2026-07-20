exports.up = async function up(knex) {
  await knex.schema.alterTable("quotes", (table) => {
    table.decimal("discount_percentage", 5, 2).notNullable().defaultTo(0);
    table.check(
      "discount_percentage >= 0 and discount_percentage <= 100",
      [],
      "quotes_discount_percentage_check",
    );
  });

  await knex.schema.alterTable("quote_items", (table) => {
    table.decimal("discount_percentage", 5, 2).notNullable().defaultTo(0);
    table.check(
      "discount_percentage >= 0 and discount_percentage <= 100",
      [],
      "quote_items_discount_percentage_check",
    );
  });
};

exports.down = async function down(knex) {
  await knex.schema.alterTable("quote_items", (table) => {
    table.dropChecks(["quote_items_discount_percentage_check"]);
    table.dropColumn("discount_percentage");
  });

  await knex.schema.alterTable("quotes", (table) => {
    table.dropChecks(["quotes_discount_percentage_check"]);
    table.dropColumn("discount_percentage");
  });
};
