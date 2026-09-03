exports.up = async function up(knex) {
  await knex.schema.raw(
    "alter table stock_movements drop constraint stock_movements_data_check",
  );
  await knex.schema.raw(
    "alter table stock_movements drop constraint stock_movements_type_check",
  );
  await knex.schema.raw(
    "alter table stock_movements add constraint stock_movements_type_check check (type in ('ENTRY', 'ADJUSTMENT', 'SALE', 'SALE_CANCEL', 'SALE_RETURN', 'SALE_CORRECTION'))",
  );
  await knex.schema.raw(
    "alter table stock_movements add constraint stock_movements_data_check check ((type = 'ENTRY' and sale_id is null and supplier_id is not null and quantity > 0 and unit_cost >= 0) or (type = 'ADJUSTMENT' and sale_id is null and supplier_id is null and quantity <> 0 and unit_cost is null and notes is not null and btrim(notes) <> '') or (type = 'SALE' and sale_id is not null and supplier_id is null and quantity < 0 and unit_cost is null and notes is null) or (type in ('SALE_CANCEL', 'SALE_RETURN') and sale_id is not null and supplier_id is null and quantity > 0 and unit_cost is null and notes is not null and btrim(notes) <> '') or (type = 'SALE_CORRECTION' and sale_id is not null and supplier_id is null and quantity <> 0 and unit_cost is null and notes is not null and btrim(notes) <> ''))",
  );
};

exports.down = async function down(knex) {
  await knex("stock_movements").where("type", "SALE_CORRECTION").del();
  await knex.schema.raw(
    "alter table stock_movements drop constraint stock_movements_data_check",
  );
  await knex.schema.raw(
    "alter table stock_movements drop constraint stock_movements_type_check",
  );
  await knex.schema.raw(
    "alter table stock_movements add constraint stock_movements_type_check check (type in ('ENTRY', 'ADJUSTMENT', 'SALE', 'SALE_CANCEL', 'SALE_RETURN'))",
  );
  await knex.schema.raw(
    "alter table stock_movements add constraint stock_movements_data_check check ((type = 'ENTRY' and sale_id is null and supplier_id is not null and quantity > 0 and unit_cost >= 0) or (type = 'ADJUSTMENT' and sale_id is null and supplier_id is null and quantity <> 0 and unit_cost is null and notes is not null and btrim(notes) <> '') or (type = 'SALE' and sale_id is not null and supplier_id is null and quantity < 0 and unit_cost is null and notes is null) or (type in ('SALE_CANCEL', 'SALE_RETURN') and sale_id is not null and supplier_id is null and quantity > 0 and unit_cost is null and notes is not null and btrim(notes) <> ''))",
  );
};
