const authEventTypes = [
  "SETUP_SUCCESS",
  "LOGIN_SUCCESS",
  "LOGIN_FAILURE",
  "LOGOUT",
];

exports.up = async function up(knex) {
  await knex.schema.createTable("auth_events", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table
      .uuid("user_id")
      .references("id")
      .inTable("users")
      .onDelete("SET NULL");
    table.string("email", 160).notNullable();
    table.string("event_type", 40).notNullable();
    table.string("ip_address", 80);
    table.string("user_agent", 500);
    table.string("reason", 160);
    table
      .timestamp("created_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());

    table.index(["user_id", "created_at"]);
    table.index(["event_type", "created_at"]);
    table.check(
      `event_type in (${authEventTypes.map(() => "?").join(", ")})`,
      authEventTypes,
      "auth_events_event_type_check",
    );
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTable("auth_events");
};
