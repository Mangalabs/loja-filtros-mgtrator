const permissions = [
  "MANAGE_COMMERCIAL_SETTINGS",
  "IMPORT_PURCHASE_INVOICES",
  "MANAGE_STOCK_ADJUSTMENTS",
  "MANAGE_PAYMENT_METHODS",
  "MANAGE_FISCAL_SETTINGS",
  "MANAGE_FISCAL_DOCUMENTS",
  "MANAGE_CASH_REGISTER",
  "VIEW_REPORTS",
];

exports.up = async function up(knex) {
  await knex.schema.createTable("user_permissions", (table) => {
    table
      .uuid("user_id")
      .notNullable()
      .references("id")
      .inTable("users")
      .onDelete("CASCADE");
    table.string("permission", 80).notNullable();
    table
      .timestamp("created_at", { useTz: true })
      .notNullable()
      .defaultTo(knex.fn.now());

    table.primary(["user_id", "permission"]);
    table.check(
      `permission in (${permissions.map(() => "?").join(", ")})`,
      permissions,
      "user_permissions_permission_check",
    );
  });
};

exports.down = async function down(knex) {
  await knex.schema.dropTable("user_permissions");
};
