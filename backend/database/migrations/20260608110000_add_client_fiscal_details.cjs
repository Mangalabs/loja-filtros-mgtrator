exports.up = async function up(knex) {
  await knex.schema.alterTable("clients", (table) => {
    table.string("state_registration", 32);
    table.string("state_registration_indicator", 1);
    table.string("address_street", 160);
    table.string("address_number", 32);
    table.string("address_complement", 80);
    table.string("address_district", 80);
    table.string("address_city", 80);
    table.string("address_state", 2);
    table.string("address_zip_code", 16);
  });

  await knex.schema.raw(
    "alter table clients add constraint clients_state_registration_indicator_check check (state_registration_indicator is null or state_registration_indicator in ('1', '2', '9'))",
  );
};

exports.down = async function down(knex) {
  await knex.schema.raw(
    "alter table clients drop constraint if exists clients_state_registration_indicator_check",
  );
  await knex.schema.alterTable("clients", (table) => {
    table.dropColumn("state_registration");
    table.dropColumn("state_registration_indicator");
    table.dropColumn("address_street");
    table.dropColumn("address_number");
    table.dropColumn("address_complement");
    table.dropColumn("address_district");
    table.dropColumn("address_city");
    table.dropColumn("address_state");
    table.dropColumn("address_zip_code");
  });
};
