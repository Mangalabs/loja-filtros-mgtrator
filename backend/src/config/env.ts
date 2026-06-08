import "dotenv/config";

const developmentDatabaseUrl =
  process.env.DATABASE_URL ??
  "postgres://postgres:postgres@127.0.0.1:5433/loja_filtros";

const testDatabaseUrl =
  process.env.TEST_DATABASE_URL ??
  "postgres://postgres:postgres@127.0.0.1:5433/loja_filtros_test";

const nodeEnv = process.env.NODE_ENV ?? "development";
const jwtSecret =
  process.env.JWT_SECRET ??
  (nodeEnv === "test"
    ? "loja-filtros-integration-tests-only-jwt-secret"
    : undefined);

if (!jwtSecret || jwtSecret.length < 32) {
  throw new Error("JWT_SECRET must be configured with at least 32 characters.");
}

function optionalEnv(value: string | undefined) {
  return value?.trim() || null;
}

function envOrDefault(value: string | undefined, fallback: string) {
  return value?.trim() || fallback;
}

function fiscalProvider(value: string | undefined) {
  const provider = envOrDefault(value, "mock").toLowerCase();
  const providers: Record<string, "mock" | "focus"> = {
    focus: "focus",
    mock: "mock",
  };

  return providers[provider] ?? "mock";
}

function fiscalEnvironment(value: string | undefined) {
  const environment = envOrDefault(value, "homologation").toLowerCase();
  const environments: Record<string, "HOMOLOGATION" | "PRODUCTION"> = {
    homologation: "HOMOLOGATION",
    production: "PRODUCTION",
  };

  return environments[environment] ?? "HOMOLOGATION";
}

export const env = {
  nodeEnv,
  host: process.env.HOST ?? "127.0.0.1",
  port: Number(process.env.PORT ?? 3333),
  databaseUrl: nodeEnv === "test" ? testDatabaseUrl : developmentDatabaseUrl,
  jwtSecret,
  quotePdfStore: {
    name: envOrDefault(process.env.QUOTE_PDF_STORE_NAME, "Filtros MG"),
    address: envOrDefault(
      process.env.QUOTE_PDF_STORE_ADDRESS,
      "Endereco da loja a configurar",
    ),
    city: envOrDefault(
      process.env.QUOTE_PDF_STORE_CITY,
      "Cidade/UF a configurar",
    ),
    document: envOrDefault(
      process.env.QUOTE_PDF_STORE_DOCUMENT,
      "Documento comercial sem valor fiscal",
    ),
    phone: optionalEnv(process.env.QUOTE_PDF_STORE_PHONE),
    email: optionalEnv(process.env.QUOTE_PDF_STORE_EMAIL),
  },
  fiscal: {
    provider: fiscalProvider(process.env.FISCAL_PROVIDER),
    environment: fiscalEnvironment(process.env.FISCAL_ENVIRONMENT),
    focus: {
      baseUrl: envOrDefault(
        process.env.FOCUS_NFE_BASE_URL,
        "https://homologacao.focusnfe.com.br",
      ),
      token: optionalEnv(process.env.FOCUS_NFE_TOKEN),
      companyCnpj: optionalEnv(process.env.FOCUS_NFE_COMPANY_CNPJ),
    },
  },
};
