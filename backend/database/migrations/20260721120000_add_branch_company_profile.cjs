exports.up = async function up(knex) {
  await knex.schema.alterTable("branches", (table) => {
    table.string("legal_name", 180);
    table.string("trade_name", 180);
    table.string("document", 32);
    table.string("state_registration", 40);
    table.string("address_street", 180);
    table.string("address_number", 30);
    table.string("address_complement", 80);
    table.string("address_district", 100);
    table.string("address_city", 100);
    table.string("address_state", 2);
    table.string("address_zip_code", 20);
    table.string("phone", 40);
    table.string("email", 160);
  });
};

exports.down = async function down(knex) {
  await knex.schema.alterTable("branches", (table) => {
    table.dropColumn("legal_name");
    table.dropColumn("trade_name");
    table.dropColumn("document");
    table.dropColumn("state_registration");
    table.dropColumn("address_street");
    table.dropColumn("address_number");
    table.dropColumn("address_complement");
    table.dropColumn("address_district");
    table.dropColumn("address_city");
    table.dropColumn("address_state");
    table.dropColumn("address_zip_code");
    table.dropColumn("phone");
    table.dropColumn("email");
  });
};
