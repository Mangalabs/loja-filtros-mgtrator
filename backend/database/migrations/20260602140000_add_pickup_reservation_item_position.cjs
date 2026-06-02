exports.up = async function up(knex) {
  await knex.schema.alterTable("pickup_reservation_items", (table) => {
    table.integer("position").notNullable().defaultTo(1);
  });

  await knex.schema.raw(
    "create unique index pickup_reservation_items_reservation_position_unique on pickup_reservation_items (pickup_reservation_id, position)",
  );
};

exports.down = async function down(knex) {
  await knex.schema.raw("drop index if exists pickup_reservation_items_reservation_position_unique");

  await knex.schema.alterTable("pickup_reservation_items", (table) => {
    table.dropColumn("position");
  });
};
