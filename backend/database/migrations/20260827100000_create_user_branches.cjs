exports.up = async function up(knex) {
  await knex.schema.createTable("user_branches", (table) => {
    table
      .uuid("user_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");
    table
      .uuid("branch_id")
      .notNullable()
      .references("id")
      .inTable("branches")
      .onDelete("CASCADE");
    table
      .timestamp("created_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());

    table.primary(["user_id", "branch_id"]);
    table.index(["branch_id"], "user_branches_branch_id_index");
  });

  await knex.schema.raw(`
    insert into user_branches (user_id, branch_id)
    select id, branch_id
    from users
    where branch_id is not null
    on conflict (user_id, branch_id) do nothing
  `);
};

exports.down = async function down(knex) {
  await knex.schema.dropTable("user_branches");
};
