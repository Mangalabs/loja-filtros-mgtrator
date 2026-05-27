exports.up = async function up(knex) {
  await knex.schema.raw("alter table shipping_orders drop constraint shipping_orders_status_check");
  await knex.schema.alterTable("shipping_orders", (table) => {
    table
      .uuid("separated_by_user_id")
      .nullable()
      .references("id")
      .inTable("users")
      .onDelete("RESTRICT");
    table.timestamp("separated_at", { useTz: true }).nullable();
  });
  await knex.schema.raw(
    "alter table shipping_orders add constraint shipping_orders_status_check check (status in ('QUOTED', 'APPROVED', 'SEPARATED', 'CANCELLED'))",
  );
  await knex.schema.raw(
    "alter table shipping_orders add constraint shipping_orders_separation_check check ((status = 'SEPARATED' and separated_by_user_id is not null and separated_at is not null) or (status in ('QUOTED', 'APPROVED') and separated_by_user_id is null and separated_at is null) or (status = 'CANCELLED' and ((separated_by_user_id is null and separated_at is null) or (separated_by_user_id is not null and separated_at is not null))))",
  );
};

exports.down = async function down(knex) {
  await knex.schema.raw("alter table shipping_orders drop constraint shipping_orders_separation_check");
  await knex("shipping_orders").where("status", "SEPARATED").update({ status: "APPROVED" });
  await knex.schema.raw("alter table shipping_orders drop constraint shipping_orders_status_check");
  await knex.schema.alterTable("shipping_orders", (table) => {
    table.dropColumn("separated_by_user_id");
    table.dropColumn("separated_at");
  });
  await knex.schema.raw(
    "alter table shipping_orders add constraint shipping_orders_status_check check (status in ('QUOTED', 'APPROVED', 'CANCELLED'))",
  );
};
