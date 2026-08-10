exports.up = async function up(knex) {
  await knex.raw("create extension if not exists pg_trgm");

  await knex.schema.alterTable("products", (table) => {
    table.index(["branch_id", "name"], "products_branch_name_index");
    table.index(
      ["branch_id", "active", "name"],
      "products_branch_active_name_index",
    );
  });

  await knex.raw(
    "create index if not exists products_name_trgm_index on products using gin (name gin_trgm_ops)",
  );
  await knex.raw(
    "create index if not exists products_internal_code_trgm_index on products using gin (internal_code gin_trgm_ops)",
  );
  await knex.raw(
    "create index if not exists products_barcode_trgm_index on products using gin (barcode gin_trgm_ops)",
  );
  await knex.raw(
    "create index if not exists products_location_trgm_index on products using gin (location gin_trgm_ops)",
  );
  await knex.raw(
    "create index if not exists brands_name_trgm_index on brands using gin (name gin_trgm_ops)",
  );
};

exports.down = async function down(knex) {
  await knex.raw("drop index if exists brands_name_trgm_index");
  await knex.raw("drop index if exists products_location_trgm_index");
  await knex.raw("drop index if exists products_barcode_trgm_index");
  await knex.raw("drop index if exists products_internal_code_trgm_index");
  await knex.raw("drop index if exists products_name_trgm_index");

  await knex.schema.alterTable("products", (table) => {
    table.dropIndex(
      ["branch_id", "active", "name"],
      "products_branch_active_name_index",
    );
    table.dropIndex(["branch_id", "name"], "products_branch_name_index");
  });
};
