const path = require("node:path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../.env"), quiet: true });
dotenv.config({
  path: path.resolve(__dirname, ".env"),
  override: true,
  quiet: true,
});

const environment = process.env.NODE_ENV ?? "development";
const connectionByEnvironment = {
  development: process.env.DATABASE_URL,
  production: process.env.DATABASE_URL,
  test: process.env.TEST_DATABASE_URL,
};
const connection =
  connectionByEnvironment[environment] ?? process.env.DATABASE_URL;

if (!connection) {
  throw new Error(
    `${environment === "test" ? "TEST_DATABASE_URL" : "DATABASE_URL"} must be configured for Knex.`,
  );
}

module.exports = {
  client: "pg",
  connection,
  migrations: {
    directory: path.resolve(__dirname, "database/migrations"),
    extension: "cjs",
  },
  seeds: {
    directory: path.resolve(__dirname, "database/seeds"),
    extension: "cjs",
  },
};
