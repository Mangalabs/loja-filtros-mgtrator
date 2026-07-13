exports.up = async function up(knex) {
  await knex.schema.alterTable("products", (table) => {
    table.decimal("profit_margin_percentage", 8, 2).nullable();
  });

  await knex.schema.raw(
    "alter table products add constraint products_profit_margin_percentage_check check (profit_margin_percentage is null or (profit_margin_percentage >= 0 and profit_margin_percentage <= 1000))",
  );
};

exports.down = async function down(knex) {
  await knex.schema.raw(
    "alter table products drop constraint if exists products_profit_margin_percentage_check",
  );

  await knex.schema.alterTable("products", (table) => {
    table.dropColumn("profit_margin_percentage");
  });
};
