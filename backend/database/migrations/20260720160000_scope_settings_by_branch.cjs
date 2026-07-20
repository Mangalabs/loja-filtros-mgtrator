exports.up = async function up(knex) {
  await knex.schema.alterTable("commercial_settings", (table) => {
    table
      .uuid("branch_id")
      .references("id")
      .inTable("branches")
      .onDelete("RESTRICT");
  });

  await knex.schema.alterTable("fiscal_settings", (table) => {
    table
      .uuid("branch_id")
      .references("id")
      .inTable("branches")
      .onDelete("RESTRICT");
  });

  await knex.schema.raw(`
    update commercial_settings
    set branch_id = source.branch_id
    from (
      select id as branch_id
      from branches
      order by created_at asc, id asc
      limit 1
    ) as source
    where commercial_settings.branch_id is null
  `);

  await knex.schema.raw(`
    update fiscal_settings
    set branch_id = source.branch_id
    from (
      select id as branch_id
      from branches
      order by created_at asc, id asc
      limit 1
    ) as source
    where fiscal_settings.branch_id is null
  `);

  await knex.schema.raw("drop index if exists commercial_settings_single_row_unique");
  await knex.schema.raw("drop index if exists fiscal_settings_single_row_unique");
  await knex.schema.raw(
    "create unique index commercial_settings_branch_id_unique on commercial_settings (branch_id) where branch_id is not null",
  );
  await knex.schema.raw(
    "create unique index fiscal_settings_branch_id_unique on fiscal_settings (branch_id) where branch_id is not null",
  );
};

exports.down = async function down(knex) {
  await knex.schema.raw("drop index if exists fiscal_settings_branch_id_unique");
  await knex.schema.raw(
    "drop index if exists commercial_settings_branch_id_unique",
  );
  await knex.schema.raw(
    "create unique index fiscal_settings_single_row_unique on fiscal_settings ((true))",
  );
  await knex.schema.raw(
    "create unique index commercial_settings_single_row_unique on commercial_settings ((true))",
  );

  await knex.schema.alterTable("fiscal_settings", (table) => {
    table.dropColumn("branch_id");
  });

  await knex.schema.alterTable("commercial_settings", (table) => {
    table.dropColumn("branch_id");
  });
};
