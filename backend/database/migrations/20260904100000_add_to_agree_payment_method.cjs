exports.up = async function up(knex) {
  await knex("payment_methods")
    .insert({ code: "TO_AGREE", name: "A combinar" })
    .onConflict("code")
    .ignore();
};

exports.down = async function down(knex) {
  await knex("payment_methods").where({ code: "TO_AGREE" }).del();
};
