exports.up = async function up(knex) {
  await knex.schema.createTable("clients", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.string("person_type", 2).notNullable();
    table.string("name", 160).notNullable();
    table.string("document", 32);
    table.string("email", 160);
    table.string("phone", 32);
    table.boolean("active").notNullable().defaultTo(true);
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.check("person_type in ('PF', 'PJ', 'ES')", [], "clients_person_type_check");
    table.index(["name"]);
    table.index(["document"]);
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTable("clients");
};
