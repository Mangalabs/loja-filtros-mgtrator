exports.up = async function up(knex) {
  await knex.schema.createTable("payment_methods", (table) => {
    table.uuid("id").primary().defaultTo(knex.raw("gen_random_uuid()"));
    table.string("code", 20).notNullable().unique();
    table.string("name", 80).notNullable();
    table.boolean("active").notNullable().defaultTo(true);
    table.timestamps(true, true);
  });

  await knex("payment_methods").insert([
    { code: "PIX", name: "PIX" },
    { code: "DEBIT", name: "Cartao de debito" },
    { code: "BOLETO", name: "Boleto" },
  ]);
};

exports.down = async function down(knex) {
  await knex.schema.dropTable("payment_methods");
};
