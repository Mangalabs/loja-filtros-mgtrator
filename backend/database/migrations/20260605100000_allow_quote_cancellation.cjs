exports.up = async function up(knex) {
  await knex.schema.alterTable("quotes", (table) => {
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
    "alter table quotes drop constraint quotes_status_check",
  );
  await knex.schema.raw(
    "alter table quotes add constraint quotes_status_check check (status in ('DRAFT', 'CANCELLED'))",
  );
  await knex.schema.raw(
    "alter table quotes add constraint quotes_cancellation_check check ((status = 'CANCELLED' and cancelled_by_user_id is not null and cancelled_at is not null and cancellation_reason is not null and btrim(cancellation_reason) <> '') or (status <> 'CANCELLED' and cancelled_by_user_id is null and cancelled_at is null and cancellation_reason is null))",
  );
};

exports.down = async function down(knex) {
  await knex.schema.raw(
    "alter table quotes drop constraint quotes_cancellation_check",
  );
  await knex("quotes").where("status", "CANCELLED").update({
    status: "DRAFT",
    cancelled_by_user_id: null,
    cancelled_at: null,
    cancellation_reason: null,
  });
  await knex.schema.raw(
    "alter table quotes drop constraint quotes_status_check",
  );
  await knex.schema.raw(
    "alter table quotes add constraint quotes_status_check check (status in ('DRAFT'))",
  );

  await knex.schema.alterTable("quotes", (table) => {
    table.dropColumn("cancellation_reason");
    table.dropColumn("cancelled_at");
    table.dropColumn("cancelled_by_user_id");
  });
};
