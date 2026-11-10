exports.up = async function up(knex) {
  await knex.schema.alterTable("quotes", (table) => {
    table.string("freight_type", 3);
    table.decimal("freight_amount", 12, 2).notNullable().defaultTo(0);
  });

  await knex.raw(
    "alter table quotes add constraint quotes_freight_type_check check (freight_type is null or freight_type in ('CIF', 'FOB'))",
  );
  await knex.raw(
    "alter table quotes add constraint quotes_freight_amount_check check (freight_amount >= 0)",
  );
};

exports.down = async function down(knex) {
  await knex.raw(
    "alter table quotes drop constraint if exists quotes_freight_amount_check",
  );
  await knex.raw(
    "alter table quotes drop constraint if exists quotes_freight_type_check",
  );

  await knex.schema.alterTable("quotes", (table) => {
    table.dropColumn("freight_amount");
    table.dropColumn("freight_type");
  });
};
