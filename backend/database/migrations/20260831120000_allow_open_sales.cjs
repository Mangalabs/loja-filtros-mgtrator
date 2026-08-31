exports.up = async function up(knex) {
  await knex.schema.raw("alter table sales drop constraint sales_cancellation_check");
  await knex.schema.raw("alter table sales drop constraint sales_status_check");

  await knex.schema.raw(
    "alter table sales add constraint sales_status_check check (status in ('OPEN', 'COMPLETED', 'CANCELLED'))",
  );
  await knex.schema.raw(
    "alter table sales add constraint sales_cancellation_check check ((status in ('OPEN', 'COMPLETED') and cancelled_by_user_id is null and cancelled_at is null and cancellation_reason is null) or (status = 'CANCELLED' and cancelled_by_user_id is not null and cancelled_at is not null and cancellation_reason is not null and btrim(cancellation_reason) <> ''))",
  );
};

exports.down = async function down(knex) {
  await knex("sales").where("status", "OPEN").update({ status: "COMPLETED" });

  await knex.schema.raw("alter table sales drop constraint sales_cancellation_check");
  await knex.schema.raw("alter table sales drop constraint sales_status_check");

  await knex.schema.raw(
    "alter table sales add constraint sales_status_check check (status in ('COMPLETED', 'CANCELLED'))",
  );
  await knex.schema.raw(
    "alter table sales add constraint sales_cancellation_check check ((status = 'COMPLETED' and cancelled_by_user_id is null and cancelled_at is null and cancellation_reason is null) or (status = 'CANCELLED' and cancelled_by_user_id is not null and cancelled_at is not null and cancellation_reason is not null and btrim(cancellation_reason) <> ''))",
  );
};
