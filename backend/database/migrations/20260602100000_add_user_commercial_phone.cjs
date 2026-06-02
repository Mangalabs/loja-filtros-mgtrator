exports.up = async function up(knex) {
  await knex.schema.alterTable("users", (table) => {
    table.string("phone", 32);
  });
};

exports.down = async function down(knex) {
  await knex.schema.alterTable("users", (table) => {
    table.dropColumn("phone");
  });
};
