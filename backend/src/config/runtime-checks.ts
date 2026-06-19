import { existsSync } from "node:fs";
import type { env } from "./env.js";

type RuntimeEnv = typeof env;

type ConfigurationCheck = (runtimeEnv: RuntimeEnv) => string[];

const productionChecks: ConfigurationCheck[] = [
  validateJwtSecret,
  validateDatabaseUrl,
  validatePuppeteerExecutable,
  validateFocusProductionToken,
];

export function validateRuntimeConfiguration(runtimeEnv: RuntimeEnv) {
  if (runtimeEnv.nodeEnv !== "production") {
    return;
  }

  const errors = productionChecks.flatMap((check) => check(runtimeEnv));

  if (errors.length === 0) {
    return;
  }

  throw new Error(
    ["Invalid production configuration:", ...errors.map((error) => `- ${error}`)].join(
      "\n",
    ),
  );
}

function validateJwtSecret(runtimeEnv: RuntimeEnv) {
  const unsafeFragments = ["replace-with", "integration-tests-only"];
  const hasUnsafeFragment = unsafeFragments.some((fragment) =>
    runtimeEnv.jwtSecret.includes(fragment),
  );

  return hasUnsafeFragment
    ? ["JWT_SECRET parece ser placeholder. Configure um segredo forte."]
    : [];
}

function validateDatabaseUrl(runtimeEnv: RuntimeEnv) {
  const credentials = databaseCredentials(runtimeEnv.databaseUrl);

  if (!credentials) {
    return ["DATABASE_URL invalida ou nao parseavel."];
  }

  if (!credentials.password) {
    return ["DATABASE_URL nao possui senha configurada."];
  }

  return credentials.username === "postgres" && credentials.password === "postgres"
    ? ["DATABASE_URL usa a senha padrao do PostgreSQL."]
    : [];
}

function validatePuppeteerExecutable(runtimeEnv: RuntimeEnv) {
  const { executablePath } = runtimeEnv.puppeteer;

  if (!executablePath) {
    return [];
  }

  return existsSync(executablePath)
    ? []
    : [
        "PUPPETEER_EXECUTABLE_PATH aponta para um arquivo inexistente. Configure o caminho do Chrome/Chromium.",
      ];
}

function validateFocusProductionToken(runtimeEnv: RuntimeEnv) {
  if (
    runtimeEnv.fiscal.provider !== "focus" ||
    runtimeEnv.fiscal.environment !== "PRODUCTION"
  ) {
    return [];
  }

  return runtimeEnv.fiscal.focus.tokens.PRODUCTION
    ? []
    : ["FOCUS_NFE_PRODUCTION_TOKEN e obrigatorio para Focus em producao."];
}

function databaseCredentials(databaseUrl: string) {
  try {
    const parsed = new URL(databaseUrl);

    return {
      password: decodeURIComponent(parsed.password),
      username: decodeURIComponent(parsed.username),
    };
  } catch {
    return null;
  }
}
