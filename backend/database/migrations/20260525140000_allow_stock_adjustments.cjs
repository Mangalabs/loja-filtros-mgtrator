exports.up = async function up(knex) {
  await knex.schema.raw(
    "alter table stock_movements drop constraint stock_movements_type_check",
  );
  await knex.schema.raw(
    "alter table stock_movements drop constraint stock_movements_quantity_positive_check",
  );
  await knex.schema.raw(
    "alter table stock_movements drop constraint stock_movements_unit_cost_nonnegative_check",
  );

  await knex.schema.alterTable("stock_movements", (table) => {
    table.uuid("supplier_id").nullable().alter();
    table.decimal("unit_cost", 12, 2).nullable().alter();
  });

  await knex.schema.raw(
    "alter table stock_movements add constraint stock_movements_type_check check (type in ('ENTRY', 'ADJUSTMENT'))",
  );
  await knex.schema.raw(
    "alter table stock_movements add constraint stock_movements_data_check check ((type = 'ENTRY' and supplier_id is not null and quantity > 0 and unit_cost >= 0) or (type = 'ADJUSTMENT' and supplier_id is null and quantity <> 0 and unit_cost is null and notes is not null and btrim(notes) <> ''))",
  );
};

exports.down = async function down(knex) {
  await knex("stock_movements").where("type", "ADJUSTMENT").del();

  await knex.schema.raw(
    "alter table stock_movements drop constraint stock_movements_data_check",
  );
  await knex.schema.raw(
    "alter table stock_movements drop constraint stock_movements_type_check",
  );

  await knex.schema.alterTable("stock_movements", (table) => {
    table.uuid("supplier_id").notNullable().alter();
    table.decimal("unit_cost", 12, 2).notNullable().alter();
  });

  await knex.schema.raw(
    "alter table stock_movements add constraint stock_movements_type_check check (type in ('ENTRY'))",
  );
  await knex.schema.raw(
    "alter table stock_movements add constraint stock_movements_quantity_positive_check check (quantity > 0)",
  );
  await knex.schema.raw(
    "alter table stock_movements add constraint stock_movements_unit_cost_nonnegative_check check (unit_cost >= 0)",
  );
};
