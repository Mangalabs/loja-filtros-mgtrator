exports.up = async function up(knex) {
  await knex.schema.raw(
    "alter table shipping_orders drop constraint shipping_orders_status_check",
  );
  await knex.schema.alterTable("shipping_orders", (table) => {
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
    "alter table shipping_orders add constraint shipping_orders_status_check check (status in ('QUOTED', 'APPROVED', 'CANCELLED'))",
  );
  await knex.schema.raw(
    "alter table shipping_orders add constraint shipping_orders_cancellation_check check ((status = 'CANCELLED' and cancelled_by_user_id is not null and cancelled_at is not null and cancellation_reason is not null and btrim(cancellation_reason) <> '') or (status <> 'CANCELLED' and cancelled_by_user_id is null and cancelled_at is null and cancellation_reason is null))",
  );
};

exports.down = async function down(knex) {
  await knex("shipping_orders").where("status", "CANCELLED").del();
  await knex.schema.raw(
    "alter table shipping_orders drop constraint shipping_orders_cancellation_check",
  );
  await knex.schema.raw(
    "alter table shipping_orders drop constraint shipping_orders_status_check",
  );
  await knex.schema.alterTable("shipping_orders", (table) => {
    table.dropColumn("cancelled_by_user_id");
    table.dropColumn("cancelled_at");
    table.dropColumn("cancellation_reason");
  });
  await knex.schema.raw(
    "alter table shipping_orders add constraint shipping_orders_status_check check (status in ('QUOTED', 'APPROVED'))",
  );
};
