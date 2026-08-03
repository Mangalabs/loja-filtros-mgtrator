exports.up = async function up(knex) {
  await knex.schema.raw("alter table products alter column name type varchar(500)");
};

exports.down = async function down(knex) {
  await knex.schema.raw("alter table products alter column name type varchar(180)");
};
