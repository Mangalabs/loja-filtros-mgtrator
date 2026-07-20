exports.up = async function up(knex) {
  await knex.schema.alterTable("fiscal_documents", (table) => {
    table
      .uuid("branch_id")
      .references("id")
      .inTable("branches")
      .onDelete("RESTRICT");
  });

  await knex.schema.raw(`
    update fiscal_documents
    set branch_id = sales.branch_id
    from sales
    where fiscal_documents.source_type = 'SALE'
      and fiscal_documents.source_id = sales.id
      and fiscal_documents.branch_id is null
      and sales.branch_id is not null
  `);

  await knex.schema.raw(`
    update fiscal_documents
    set branch_id = shipping_orders.branch_id
    from shipping_orders
    where fiscal_documents.source_type = 'SHIPPING_ORDER'
      and fiscal_documents.source_id = shipping_orders.id
      and fiscal_documents.branch_id is null
      and shipping_orders.branch_id is not null
  `);

  await knex.schema.raw(`
    update fiscal_documents
    set branch_id = pickup_reservations.branch_id
    from pickup_reservations
    where fiscal_documents.source_type = 'PICKUP_RESERVATION'
      and fiscal_documents.source_id = pickup_reservations.id
      and fiscal_documents.branch_id is null
      and pickup_reservations.branch_id is not null
  `);

  await knex.schema.raw(
    "create index fiscal_documents_branch_id_index on fiscal_documents (branch_id)",
  );
};

exports.down = async function down(knex) {
  await knex.schema.raw("drop index if exists fiscal_documents_branch_id_index");

  await knex.schema.alterTable("fiscal_documents", (table) => {
    table.dropColumn("branch_id");
  });
};
