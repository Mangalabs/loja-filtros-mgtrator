exports.up = async function up(knex) {
  await knex.schema.createTable("pickup_reservations", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("client_id")
      .notNullable()
      .references("id")
      .inTable("clients")
      .onDelete("RESTRICT");
    table
      .uuid("created_by_user_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("RESTRICT");
    table
      .uuid("cancelled_by_user_id")
      .nullable()
      .references("id")
      .inTable("users")
      .onDelete("RESTRICT");
    table
      .uuid("completed_by_user_id")
      .nullable()
      .references("id")
      .inTable("users")
      .onDelete("RESTRICT");
    table
      .uuid("sale_id")
      .nullable()
      .references("id")
      .inTable("sales")
      .onDelete("RESTRICT");
    table.string("status", 20).notNullable().defaultTo("RESERVED");
    table.decimal("total_amount", 12, 2).notNullable();
    table
      .timestamp("created_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
    table.timestamp("cancelled_at", { useTz: true }).nullable();
    table.timestamp("completed_at", { useTz: true }).nullable();
    table.string("cancellation_reason", 500).nullable();

    table.check(
      "status in ('RESERVED', 'CANCELLED', 'COMPLETED')",
      [],
      "pickup_reservations_status_check",
    );
    table.check(
      "total_amount >= 0",
      [],
      "pickup_reservations_total_amount_check",
    );
    table.index(["status", "created_at"]);
  });

  await knex.schema.createTable("pickup_reservation_items", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("pickup_reservation_id")
      .notNullable()
      .references("id")
      .inTable("pickup_reservations")
      .onDelete("CASCADE");
    table
      .uuid("product_id")
      .notNullable()
      .references("id")
      .inTable("products")
      .onDelete("RESTRICT");
    table.decimal("quantity", 12, 3).notNullable();
    table.decimal("unit_price", 12, 2).notNullable();
    table.decimal("total_amount", 12, 2).notNullable();

    table.check("quantity > 0", [], "pickup_reservation_items_quantity_check");
    table.check(
      "unit_price >= 0",
      [],
      "pickup_reservation_items_unit_price_check",
    );
    table.check(
      "total_amount >= 0",
      [],
      "pickup_reservation_items_total_amount_check",
    );
  });

  await knex.schema.raw(
    "alter table pickup_reservations add constraint pickup_reservations_cancellation_check check ((status = 'CANCELLED' and cancelled_by_user_id is not null and cancelled_at is not null and cancellation_reason is not null and btrim(cancellation_reason) <> '') or (status <> 'CANCELLED' and cancelled_by_user_id is null and cancelled_at is null and cancellation_reason is null))",
  );
  await knex.schema.raw(
    "alter table pickup_reservations add constraint pickup_reservations_completion_check check ((status = 'COMPLETED' and sale_id is not null and completed_by_user_id is not null and completed_at is not null) or (status <> 'COMPLETED' and sale_id is null and completed_by_user_id is null and completed_at is null))",
  );
};

exports.down = async function down(knex) {
  await knex.schema.dropTable("pickup_reservation_items");
  await knex.schema.dropTable("pickup_reservations");
};
