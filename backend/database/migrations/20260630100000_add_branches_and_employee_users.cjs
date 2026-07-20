exports.up = async function up(knex) {
  await knex.schema.createTable("branches", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.string("name", 160).notNullable();
    table.string("code", 40);
    table.boolean("active").notNullable().defaultTo(true);
    table
      .timestamp("created_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());
    table
      .timestamp("updated_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());

    table.unique(["name"]);
    table.unique(["code"]);
  });

  await knex.schema.alterTable("users", (table) => {
    table
      .uuid("branch_id")
      .references("id")
      .inTable("branches")
      .onDelete("RESTRICT");
  });

  await knex.schema.raw(
    "alter table users drop constraint if exists users_role_check",
  );
  await knex.schema.raw(
    "alter table users add constraint users_role_check check (role in ('ADMIN', 'EMPLOYEE'))",
  );
};

exports.down = async function down(knex) {
  await knex.schema.raw(
    "alter table users drop constraint if exists users_role_check",
  );
  await knex.schema.raw(
    "alter table users add constraint users_role_check check (role in ('ADMIN'))",
  );

  await knex.schema.alterTable("users", (table) => {
    table.dropColumn("branch_id");
  });

  await knex.schema.dropTable("branches");
};
