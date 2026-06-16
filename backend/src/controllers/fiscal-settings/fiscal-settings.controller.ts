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
  const companyCnpj = fiscalDigits(input.companyCnpj);
  ensureFocusCompanyCnpj(input.provider, companyCnpj);

  const settings = await upsertFiscalSettings({
    ...input,
    allowProduction: fiscalProductionAllowance(input),
    companyCnpj,
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

function fiscalProductionAllowance(input: FiscalSettingsInput) {
  return input.environment === "PRODUCTION" && input.allowProduction;
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

function ensureFocusCompanyCnpj(
  provider: FiscalSettingsInput["provider"],
  companyCnpj: string | null,
) {
  if (provider !== "FOCUS" || companyCnpj?.length === 14) {
    return;
  }

  throw new AppError(
    "CNPJ fiscal da loja deve ter 14 digitos para usar Focus NFe.",
    422,
  );
}

function fiscalDigits(value: string | null) {
  const normalized = value?.replace(/\D/g, "");
  return normalized || null;
}
