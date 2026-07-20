exports.up = async function up(knex) {
  await knex.schema.alterTable("clients", (table) => {
    table
      .uuid("branch_id")
      .references("id")
      .inTable("branches")
      .onDelete("restrict")
      .index();
  });

  await knex.schema.raw(`
    update clients
    set branch_id = (
      select id
      from branches
      order by created_at asc, id asc
      limit 1
    )
    where clients.branch_id is null
  `);
};

exports.down = async function down(knex) {
  await knex.schema.alterTable("clients", (table) => {
    table.dropColumn("branch_id");
  });
};
