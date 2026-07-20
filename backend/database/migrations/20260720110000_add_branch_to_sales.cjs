exports.up = async function up(knex) {
  await knex.schema.alterTable("sales", (table) => {
    table
      .uuid("branch_id")
      .references("id")
      .inTable("branches")
      .onDelete("RESTRICT");
  });

  await knex.schema.raw(`
    update sales
    set branch_id = source.branch_id
    from (
      select distinct on (sale_items.sale_id)
        sale_items.sale_id,
        products.branch_id
      from sale_items
      join products on products.id = sale_items.product_id
      where products.branch_id is not null
      order by sale_items.sale_id, sale_items.position asc nulls last, sale_items.id
    ) as source
    where sales.id = source.sale_id
      and sales.branch_id is null
  `);

  await knex.schema.raw(
    "create index sales_branch_id_index on sales (branch_id)",
  );
};

exports.down = async function down(knex) {
  await knex.schema.raw("drop index if exists sales_branch_id_index");

  await knex.schema.alterTable("sales", (table) => {
    table.dropColumn("branch_id");
  });
};
