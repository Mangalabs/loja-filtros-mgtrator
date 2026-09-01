exports.up = async function up(knex) {
  await knex("payment_methods")
    .insert({ code: "CASH", name: "Dinheiro" })
    .onConflict("code")
    .ignore();
};

exports.down = async function down(knex) {
  await knex("payment_methods").where({ code: "CASH" }).del();
};
