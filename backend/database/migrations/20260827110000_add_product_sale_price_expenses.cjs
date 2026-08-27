exports.up = async function up(knex) {
  await knex.schema.alterTable("products", (table) => {
    table.decimal("accessory_expenses", 12, 2).notNullable().defaultTo(0);
    table.decimal("other_expenses", 12, 2).notNullable().defaultTo(0);
  });

  await knex.schema.raw(
    "alter table products add constraint products_accessory_expenses_check check (accessory_expenses >= 0)",
  );
  await knex.schema.raw(
    "alter table products add constraint products_other_expenses_check check (other_expenses >= 0)",
  );
};

exports.down = async function down(knex) {
  await knex.schema.raw(
    "alter table products drop constraint if exists products_accessory_expenses_check",
  );
  await knex.schema.raw(
    "alter table products drop constraint if exists products_other_expenses_check",
  );

  await knex.schema.alterTable("products", (table) => {
    table.dropColumn("accessory_expenses");
    table.dropColumn("other_expenses");
  });
};
