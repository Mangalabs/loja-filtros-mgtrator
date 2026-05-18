import "dotenv/config";

export const env = {
  host: process.env.HOST ?? "127.0.0.1",
  port: Number(process.env.PORT ?? 3333),
  databaseUrl:
    process.env.DATABASE_URL ??
    "postgres://postgres:postgres@127.0.0.1:5432/loja_filtros",
};
