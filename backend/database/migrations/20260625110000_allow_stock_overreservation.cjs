exports.up = async function up(knex) {
  await knex.schema.raw(
    "alter table products drop constraint products_reserved_stock_check",
  );
  await knex.schema.raw(
    "alter table products add constraint products_reserved_stock_check check (reserved_stock >= 0)",
  );
};

exports.down = async function down(knex) {
  await knex.schema.raw(
    "alter table products drop constraint products_reserved_stock_check",
  );
  await knex.schema.raw(
    "alter table products add constraint products_reserved_stock_check check (reserved_stock >= 0 and reserved_stock <= current_stock)",
  );
};
