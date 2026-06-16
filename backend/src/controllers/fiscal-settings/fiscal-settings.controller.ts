import { env } from "../../config/env.js";
import {
  getFiscalSettings,
  upsertFiscalSettings,
  type FiscalSettingsInput,
} from "../../models/fiscal-settings/fiscal-settings.model.js";
import { AppError } from "../../shared/errors/app-error.js";

export async function showFiscalSettings() {
  return {
    code: 200,
    status: "success",
    data: await currentFiscalSettings(),
  };
}

export async function replaceFiscalSettings(input: FiscalSettingsInput) {
  ensureProductionIsExplicitlyAllowed(input);

  const settings = await upsertFiscalSettings({
    ...input,
    companyCnpj: fiscalDigits(input.companyCnpj),
  });

  return {
    code: 200,
    status: "success",
    data: settings,
  };
}

export async function currentFiscalSettings() {
  const settings = await getFiscalSettings();

  if (settings) {
    return settings;
  }

  return upsertFiscalSettings({
    provider:
      env.fiscal.provider.toUpperCase() as FiscalSettingsInput["provider"],
    environment: env.fiscal.environment,
    companyCnpj: fiscalDigits(env.fiscal.focus.companyCnpj),
    allowProduction: false,
  });
}

function ensureProductionIsExplicitlyAllowed(input: FiscalSettingsInput) {
  if (input.environment !== "PRODUCTION" || input.allowProduction) {
    return;
  }

  throw new AppError(
    "Ambiente de producao exige confirmacao explicita.",
    422,
  );
}

function fiscalDigits(value: string | null) {
  const normalized = value?.replace(/\D/g, "");
  return normalized || null;
}
