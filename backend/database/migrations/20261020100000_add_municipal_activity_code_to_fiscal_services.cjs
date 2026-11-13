exports.up = async function up(knex) {
  await knex.schema.alterTable("fiscal_services", (table) => {
    table.string("municipal_activity_code", 9);
  });

  await knex.schema.raw(`
    alter table fiscal_services
    add constraint fiscal_services_municipal_activity_code_check
    check (
      municipal_activity_code is null
      or municipal_activity_code ~ '^[0-9]{9}$'
    )
  `);
};

exports.down = async function down(knex) {
  await knex.schema.raw(
    "alter table fiscal_services drop constraint if exists fiscal_services_municipal_activity_code_check",
  );

  await knex.schema.alterTable("fiscal_services", (table) => {
    table.dropColumn("municipal_activity_code");
  });
};
