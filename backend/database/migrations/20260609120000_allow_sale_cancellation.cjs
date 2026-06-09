exports.up = async function up(knex) {
  await knex.schema.raw("alter table sales drop constraint sales_status_check");

  await knex.schema.alterTable("sales", (table) => {
    table
      .uuid("cancelled_by_user_id")
      .nullable()
      .references("id")
      .inTable("users")
      .onDelete("RESTRICT");
    table.timestamp("cancelled_at", { useTz: true }).nullable();
    table.string("cancellation_reason", 500).nullable();
  });

  await knex.schema.raw(
    "alter table sales add constraint sales_status_check check (status in ('COMPLETED', 'CANCELLED'))",
  );
  await knex.schema.raw(
    "alter table sales add constraint sales_cancellation_check check ((status = 'COMPLETED' and cancelled_by_user_id is null and cancelled_at is null and cancellation_reason is null) or (status = 'CANCELLED' and cancelled_by_user_id is not null and cancelled_at is not null and cancellation_reason is not null and btrim(cancellation_reason) <> ''))",
  );

  await knex.schema.raw(
    "alter table stock_movements drop constraint stock_movements_data_check",
  );
  await knex.schema.raw(
    "alter table stock_movements drop constraint stock_movements_type_check",
  );
  await knex.schema.raw(
    "alter table stock_movements add constraint stock_movements_type_check check (type in ('ENTRY', 'ADJUSTMENT', 'SALE', 'SALE_CANCEL'))",
  );
  await knex.schema.raw(
    "alter table stock_movements add constraint stock_movements_data_check check ((type = 'ENTRY' and sale_id is null and supplier_id is not null and quantity > 0 and unit_cost >= 0) or (type = 'ADJUSTMENT' and sale_id is null and supplier_id is null and quantity <> 0 and unit_cost is null and notes is not null and btrim(notes) <> '') or (type = 'SALE' and sale_id is not null and supplier_id is null and quantity < 0 and unit_cost is null and notes is null) or (type = 'SALE_CANCEL' and sale_id is not null and supplier_id is null and quantity > 0 and unit_cost is null and notes is not null and btrim(notes) <> ''))",
  );
};

exports.down = async function down(knex) {
  await knex("stock_movements").where("type", "SALE_CANCEL").del();
  await knex("sales").where("status", "CANCELLED").update({
    status: "COMPLETED",
    cancelled_by_user_id: null,
    cancelled_at: null,
    cancellation_reason: null,
  });

  await knex.schema.raw(
    "alter table stock_movements drop constraint stock_movements_data_check",
  );
  await knex.schema.raw(
    "alter table stock_movements drop constraint stock_movements_type_check",
  );
  await knex.schema.raw(
    "alter table stock_movements add constraint stock_movements_type_check check (type in ('ENTRY', 'ADJUSTMENT', 'SALE'))",
  );
  await knex.schema.raw(
    "alter table stock_movements add constraint stock_movements_data_check check ((type = 'ENTRY' and sale_id is null and supplier_id is not null and quantity > 0 and unit_cost >= 0) or (type = 'ADJUSTMENT' and sale_id is null and supplier_id is null and quantity <> 0 and unit_cost is null and notes is not null and btrim(notes) <> '') or (type = 'SALE' and sale_id is not null and supplier_id is null and quantity < 0 and unit_cost is null and notes is null))",
  );

  await knex.schema.raw(
    "alter table sales drop constraint sales_cancellation_check",
  );
  await knex.schema.raw("alter table sales drop constraint sales_status_check");
  await knex.schema.alterTable("sales", (table) => {
    table.dropColumn("cancellation_reason");
    table.dropColumn("cancelled_at");
    table.dropColumn("cancelled_by_user_id");
  });
  await knex.schema.raw(
    "alter table sales add constraint sales_status_check check (status in ('COMPLETED'))",
  );
};
