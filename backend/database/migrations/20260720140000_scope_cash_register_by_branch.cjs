exports.up = async function up(knex) {
  await knex.schema.alterTable("cash_register_sessions", (table) => {
    table
      .uuid("branch_id")
      .references("id")
      .inTable("branches")
      .onDelete("RESTRICT");
  });

  await knex.schema.raw(`
    update cash_register_sessions
    set branch_id = source.branch_id
    from (
      select id as branch_id
      from branches
      order by created_at asc, id asc
      limit 1
    ) as source
    where cash_register_sessions.branch_id is null
  `);

  await knex.schema.raw(
    "drop index if exists cash_register_sessions_one_open_unique",
  );
  await knex.schema.raw(
    "create unique index cash_register_sessions_one_open_per_branch_unique on cash_register_sessions (branch_id) where status = 'OPEN' and branch_id is not null",
  );
  await knex.schema.raw(
    "create index cash_register_sessions_branch_id_index on cash_register_sessions (branch_id)",
  );
};

exports.down = async function down(knex) {
  await knex.schema.raw(
    "drop index if exists cash_register_sessions_branch_id_index",
  );
  await knex.schema.raw(
    "drop index if exists cash_register_sessions_one_open_per_branch_unique",
  );
  await knex.schema.raw(
    "create unique index cash_register_sessions_one_open_unique on cash_register_sessions ((true)) where status = 'OPEN'",
  );

  await knex.schema.alterTable("cash_register_sessions", (table) => {
    table.dropColumn("branch_id");
  });
};
