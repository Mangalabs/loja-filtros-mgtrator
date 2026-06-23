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

function booleanEnv(value: string | undefined, fallback = false) {
  const normalized = value?.trim().toLowerCase();
  const values: Record<string, boolean> = {
    "1": true,
    false: false,
    no: false,
    off: false,
    true: true,
    yes: true,
  };

  return normalized ? values[normalized] ?? fallback : fallback;
}

function listEnv(value: string | undefined) {
  return (
    value
      ?.split(",")
      .map((item) => item.trim())
      .filter(Boolean) ?? []
  );
}

function sameSiteEnv(value: string | undefined) {
  const sameSite = envOrDefault(value, "strict").toLowerCase();
  const values: Record<string, "lax" | "none" | "strict"> = {
    lax: "lax",
    none: "none",
    strict: "strict",
  };

  return values[sameSite] ?? "strict";
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

function focusBaseUrl(environment: "HOMOLOGATION" | "PRODUCTION") {
  const defaultBaseUrlByEnvironment = {
    HOMOLOGATION: "https://homologacao.focusnfe.com.br",
    PRODUCTION: "https://api.focusnfe.com.br",
  };
  const configuredBaseUrlByEnvironment = {
    HOMOLOGATION:
      process.env.FOCUS_NFE_HOMOLOGATION_BASE_URL ??
      process.env.FOCUS_NFE_BASE_URL,
    PRODUCTION: process.env.FOCUS_NFE_PRODUCTION_BASE_URL,
  };

  return envOrDefault(
    configuredBaseUrlByEnvironment[environment],
    defaultBaseUrlByEnvironment[environment],
  );
}

function focusToken(environment: "HOMOLOGATION" | "PRODUCTION") {
  const tokenByEnvironment = {
    HOMOLOGATION: process.env.FOCUS_NFE_HOMOLOGATION_TOKEN,
    PRODUCTION: process.env.FOCUS_NFE_PRODUCTION_TOKEN,
  };

  return optionalEnv(
    tokenByEnvironment[environment] ?? process.env.FOCUS_NFE_TOKEN,
  );
}

const fiscalEnvironmentValue = fiscalEnvironment(process.env.FISCAL_ENVIRONMENT);

export const env = {
  nodeEnv,
  host: process.env.HOST ?? "127.0.0.1",
  port: Number(process.env.PORT ?? 3333),
  databaseUrl: nodeEnv === "test" ? testDatabaseUrl : developmentDatabaseUrl,
  jwtSecret,
  authCookie: {
    sameSite: sameSiteEnv(process.env.AUTH_COOKIE_SAME_SITE),
    secure: booleanEnv(process.env.AUTH_COOKIE_SECURE, nodeEnv === "production"),
  },
  cors: {
    allowedOrigins: listEnv(process.env.CORS_ORIGIN),
  },
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
  puppeteer: {
    executablePath: optionalEnv(process.env.PUPPETEER_EXECUTABLE_PATH),
    noSandbox: booleanEnv(process.env.PUPPETEER_NO_SANDBOX, true),
  },
  fiscal: {
    provider: fiscalProvider(process.env.FISCAL_PROVIDER),
    environment: fiscalEnvironmentValue,
    focus: {
      baseUrl: focusBaseUrl(fiscalEnvironmentValue),
      baseUrls: {
        HOMOLOGATION: focusBaseUrl("HOMOLOGATION"),
        PRODUCTION: focusBaseUrl("PRODUCTION"),
      },
      token: focusToken(fiscalEnvironmentValue),
      tokens: {
        HOMOLOGATION: focusToken("HOMOLOGATION"),
        PRODUCTION: focusToken("PRODUCTION"),
      },
      companyCnpj: optionalEnv(process.env.FOCUS_NFE_COMPANY_CNPJ),
    },
  },
};
