exports.up = async function up(knex) {
  await knex.schema.alterTable("sales", (table) => {
    table.integer("sale_number").nullable();
  });
  await knex.schema.alterTable("quotes", (table) => {
    table.integer("quote_number").nullable();
  });

  await knex.schema.raw(`
    update sales
    set sale_number = numbered.position
    from (
      select
        id,
        row_number() over (
          partition by branch_id
          order by created_at asc, id asc
        ) as position
      from sales
    ) numbered
    where sales.id = numbered.id
  `);
  await knex.schema.raw(`
    update quotes
    set quote_number = numbered.position
    from (
      select
        id,
        row_number() over (
          partition by branch_id
          order by created_at asc, id asc
        ) as position
      from quotes
    ) numbered
    where quotes.id = numbered.id
  `);

  await knex.schema.alterTable("sales", (table) => {
    table.integer("sale_number").notNullable().alter();
  });
  await knex.schema.alterTable("quotes", (table) => {
    table.integer("quote_number").notNullable().alter();
  });

  await knex.schema.raw(
    "create unique index sales_branch_sale_number_unique on sales (branch_id, sale_number) where branch_id is not null",
  );
  await knex.schema.raw(
    "create unique index quotes_branch_quote_number_unique on quotes (branch_id, quote_number) where branch_id is not null",
  );
};

exports.down = async function down(knex) {
  await knex.schema.raw("drop index if exists quotes_branch_quote_number_unique");
  await knex.schema.raw("drop index if exists sales_branch_sale_number_unique");

  await knex.schema.alterTable("quotes", (table) => {
    table.dropColumn("quote_number");
  });
  await knex.schema.alterTable("sales", (table) => {
    table.dropColumn("sale_number");
  });
};
