exports.up = async function up(knex) {
  await knex.schema.alterTable("sale_items", (table) => {
    table.integer("position").notNullable().defaultTo(1);
  });

  await knex.schema.raw(
    "create unique index sale_items_sale_position_unique on sale_items (sale_id, position)",
  );
};

exports.down = async function down(knex) {
  await knex.schema.raw("drop index if exists sale_items_sale_position_unique");

  await knex.schema.alterTable("sale_items", (table) => {
    table.dropColumn("position");
  });
};
