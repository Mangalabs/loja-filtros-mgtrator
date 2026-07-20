exports.up = async function up(knex) {
  await knex.schema.alterTable("quotes", (table) => {
    table
      .uuid("branch_id")
      .references("id")
      .inTable("branches")
      .onDelete("RESTRICT");
  });

  await knex.schema.raw(`
    update quotes
    set branch_id = source.branch_id
    from (
      select distinct on (quote_items.quote_id)
        quote_items.quote_id,
        products.branch_id
      from quote_items
      join products on products.id = quote_items.product_id
      where products.branch_id is not null
      order by quote_items.quote_id, quote_items.position asc nulls last, quote_items.id
    ) as source
    where quotes.id = source.quote_id
      and quotes.branch_id is null
  `);

  await knex.schema.raw(
    "create index quotes_branch_id_index on quotes (branch_id)",
  );
};

exports.down = async function down(knex) {
  await knex.schema.raw("drop index if exists quotes_branch_id_index");

  await knex.schema.alterTable("quotes", (table) => {
    table.dropColumn("branch_id");
  });
};
