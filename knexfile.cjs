require("dotenv/config");

const connection =
  process.env.DATABASE_URL ??
  "postgres://postgres:postgres@127.0.0.1:5432/loja_filtros";

module.exports = {
  client: "pg",
  connection,
  migrations: {
    directory: "./database/migrations",
    extension: "cjs",
  },
  seeds: {
    directory: "./database/seeds",
    extension: "cjs",
  },
};
