exports.up = async function up(knex) {
  await knex.schema.alterTable("quotes", (table) => {
    table.date("billing_issue_date").nullable();
    table.date("billing_due_date").nullable();
  });

  await knex.schema.alterTable("sales", (table) => {
    table.date("billing_issue_date").nullable();
    table.date("billing_due_date").nullable();
  });

  await knex.schema.raw(
    "alter table quotes add constraint quotes_billing_dates_check check (billing_issue_date is null or billing_due_date is null or billing_due_date >= billing_issue_date)",
  );
  await knex.schema.raw(
    "alter table sales add constraint sales_billing_dates_check check (billing_issue_date is null or billing_due_date is null or billing_due_date >= billing_issue_date)",
  );
};

exports.down = async function down(knex) {
  await knex.schema.raw(
    "alter table sales drop constraint if exists sales_billing_dates_check",
  );
  await knex.schema.raw(
    "alter table quotes drop constraint if exists quotes_billing_dates_check",
  );

  await knex.schema.alterTable("sales", (table) => {
    table.dropColumn("billing_due_date");
    table.dropColumn("billing_issue_date");
  });

  await knex.schema.alterTable("quotes", (table) => {
    table.dropColumn("billing_due_date");
    table.dropColumn("billing_issue_date");
  });
};
