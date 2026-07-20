const authEventTypes = [
  "SETUP_SUCCESS",
  "LOGIN_SUCCESS",
  "LOGIN_FAILURE",
  "LOGOUT",
  "PASSWORD_CHANGED",
  "PASSWORD_RESET",
];

exports.up = async function up(knex) {
  await knex.schema.alterTable("users", (table) => {
    table.boolean("must_change_password").notNullable().defaultTo(false);
  });

  await knex.schema.raw(
    "alter table auth_events drop constraint if exists auth_events_event_type_check",
  );
  await knex.schema.raw(
    `alter table auth_events add constraint auth_events_event_type_check check (event_type in (${sqlStringList(
      authEventTypes,
    )}))`,
  );
};

exports.down = async function down(knex) {
  const previousAuthEventTypes = authEventTypes.filter(
    (eventType) =>
      !["PASSWORD_CHANGED", "PASSWORD_RESET"].includes(eventType),
  );

  await knex.schema.raw(
    "alter table auth_events drop constraint if exists auth_events_event_type_check",
  );
  await knex.schema.raw(
    `alter table auth_events add constraint auth_events_event_type_check check (event_type in (${sqlStringList(
      previousAuthEventTypes,
    )}))`,
  );

  await knex.schema.alterTable("users", (table) => {
    table.dropColumn("must_change_password");
  });
};

function sqlStringList(values) {
  return values.map((value) => `'${value}'`).join(", ");
}
