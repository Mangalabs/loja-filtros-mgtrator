exports.up = async function up(knex) {
  await knex("payment_methods")
    .insert({ code: "CREDIT", name: "Cartao de credito" })
    .onConflict("code")
    .ignore();
};

exports.down = async function down(knex) {
  await knex("payment_methods").where({ code: "CREDIT" }).del();
};
