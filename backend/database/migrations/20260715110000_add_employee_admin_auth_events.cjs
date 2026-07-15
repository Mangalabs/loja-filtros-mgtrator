const authEventTypes = [
  "SETUP_SUCCESS",
  "LOGIN_SUCCESS",
  "LOGIN_FAILURE",
  "LOGOUT",
  "PASSWORD_CHANGED",
  "PASSWORD_RESET",
  "EMPLOYEE_CREATED",
  "EMPLOYEE_UPDATED",
  "EMPLOYEE_STATUS_CHANGED",
];

exports.up = async function up(knex) {
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
    (eventType) => !eventType.startsWith("EMPLOYEE_"),
  );

  await knex.schema.raw(
    "alter table auth_events drop constraint if exists auth_events_event_type_check",
  );
  await knex.schema.raw(
    `alter table auth_events add constraint auth_events_event_type_check check (event_type in (${sqlStringList(
      previousAuthEventTypes,
    )}))`,
  );
};

function sqlStringList(values) {
  return values.map((value) => `'${value}'`).join(", ");
}
