exports.up = async function up(knex) {
  await knex.schema.alterTable("suppliers", (table) => {
    table
      .uuid("branch_id")
      .references("id")
      .inTable("branches")
      .onDelete("restrict")
      .index();
  });

  await knex.schema.alterTable("purchase_invoices", (table) => {
    table
      .uuid("branch_id")
      .references("id")
      .inTable("branches")
      .onDelete("restrict")
      .index();
  });

  await knex.schema.raw(`
    update suppliers
    set branch_id = (
      select id
      from branches
      order by created_at asc, id asc
      limit 1
    )
    where suppliers.branch_id is null
  `);

  await knex.schema.raw(`
    update purchase_invoices
    set branch_id = suppliers.branch_id
    from suppliers
    where purchase_invoices.supplier_id = suppliers.id
      and purchase_invoices.branch_id is null
      and suppliers.branch_id is not null
  `);

  await knex.schema.raw(`
    update purchase_invoices
    set branch_id = (
      select id
      from branches
      order by created_at asc, id asc
      limit 1
    )
    where purchase_invoices.branch_id is null
  `);
};

exports.down = async function down(knex) {
  await knex.schema.alterTable("purchase_invoices", (table) => {
    table.dropColumn("branch_id");
  });

  await knex.schema.alterTable("suppliers", (table) => {
    table.dropColumn("branch_id");
  });
};
