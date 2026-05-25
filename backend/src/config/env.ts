import "dotenv/config";

const developmentDatabaseUrl =
  process.env.DATABASE_URL ??
  "postgres://postgres:postgres@127.0.0.1:5433/loja_filtros";

const testDatabaseUrl =
  process.env.TEST_DATABASE_URL ??
  "postgres://postgres:postgres@127.0.0.1:5433/loja_filtros_test";

export const env = {
  host: process.env.HOST ?? "127.0.0.1",
  port: Number(process.env.PORT ?? 3333),
  databaseUrl: process.env.NODE_ENV === "test" ? testDatabaseUrl : developmentDatabaseUrl,
};
