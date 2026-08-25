exports.up = async function up(knex) {
  await knex.schema.alterTable("products", (table) => {
    table.boolean("replenishment_monitor_enabled").notNullable().defaultTo(false);
  });
};

exports.down = async function down(knex) {
  await knex.schema.alterTable("products", (table) => {
    table.dropColumn("replenishment_monitor_enabled");
  });
};
