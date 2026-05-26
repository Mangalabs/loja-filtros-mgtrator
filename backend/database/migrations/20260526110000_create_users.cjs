exports.up = async function up(knex) {
  await knex.schema.createTable("users", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.string("name", 160).notNullable();
    table.string("email", 160).notNullable();
    table.text("password_hash").notNullable();
    table.string("role", 20).notNullable().defaultTo("ADMIN");
    table.boolean("active").notNullable().defaultTo(true);
    table.timestamp("created_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());
    table.timestamp("updated_at", { useTz: true }).notNullable().defaultTo(knex.fn.now());

    table.unique(["email"]);
    table.check("role in ('ADMIN')", [], "users_role_check");
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTable("users");
};
