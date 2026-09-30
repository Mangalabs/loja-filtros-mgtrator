exports.up = async function up(knex) {
  await knex.schema.raw(
    "alter table products drop constraint if exists products_profit_margin_percentage_check",
  );

  await knex.schema.raw(
    "alter table products alter column profit_margin_percentage type numeric using profit_margin_percentage::numeric",
  );

  await knex.schema.raw(
    "alter table products add constraint products_profit_margin_percentage_check check (profit_margin_percentage is null or profit_margin_percentage >= 0)",
  );
};

exports.down = async function down(knex) {
  await knex.schema.raw(
    "alter table products drop constraint if exists products_profit_margin_percentage_check",
  );

  await knex.schema.raw(
    "alter table products add constraint products_profit_margin_percentage_check check (profit_margin_percentage is null or (profit_margin_percentage >= 0 and profit_margin_percentage <= 1000))",
  );

  await knex.schema.raw(
    "alter table products alter column profit_margin_percentage type numeric(8, 2) using profit_margin_percentage::numeric(8, 2)",
  );
};
