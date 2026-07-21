import { env } from "../../config/env.js";
import { findBranchById } from "../../models/branches/branches.model.js";
import {
  getFiscalSettings,
  upsertFiscalSettings,
  type FiscalSettingsInput,
} from "../../models/fiscal-settings/fiscal-settings.model.js";
import { AppError } from "../../shared/errors/app-error.js";

export const FISCAL_PRODUCTION_CONFIRMATION = "EMITIR EM PRODUCAO";

export type FiscalSettingsPayload = FiscalSettingsInput & {
  productionConfirmation?: string | null;
};

export async function showFiscalSettings(branchId: string) {
  return {
    code: 200,
    status: "success",
    data: await currentFiscalSettings(branchId),
  };
}

export async function replaceFiscalSettings(
  branchId: string,
  input: FiscalSettingsPayload,
) {
  ensureProductionIsExplicitlyAllowed(input);
  const companyCnpj = fiscalDigits(input.companyCnpj);
  ensureFocusCompanyCnpj(input.provider, companyCnpj);

  const settings = await upsertFiscalSettings(
    branchId,
    {
      provider: input.provider,
      environment: input.environment,
      allowProduction: fiscalProductionAllowance(input),
      companyCnpj,
    },
  );

  return {
    code: 200,
    status: "success",
    data: settings,
  };
}

export async function currentFiscalSettings(branchId: string) {
  const settings = await getFiscalSettings({ branchId });
  const branch = await findBranchById(branchId);
  const branchCompanyCnpj = fiscalDigits(branch?.document ?? null);

  if (
    settings &&
    branchCompanyCnpj &&
    settings.companyCnpj !== branchCompanyCnpj
  ) {
    return upsertFiscalSettings(branchId, {
      provider: settings.provider,
      environment: settings.environment,
      companyCnpj: branchCompanyCnpj,
      allowProduction: settings.allowProduction,
    });
  }

  if (settings?.companyCnpj) {
    return settings;
  }

  if (settings) {
    return upsertFiscalSettings(branchId, {
      provider: settings.provider,
      environment: settings.environment,
      companyCnpj: branchCompanyCnpj,
      allowProduction: settings.allowProduction,
    });
  }

  return upsertFiscalSettings(branchId, {
    provider:
      env.fiscal.provider.toUpperCase() as FiscalSettingsInput["provider"],
    environment: env.fiscal.environment,
    companyCnpj: branchCompanyCnpj ?? fiscalDigits(env.fiscal.focus.companyCnpj),
    allowProduction: false,
  });
}

function fiscalProductionAllowance(input: FiscalSettingsInput) {
  return input.environment === "PRODUCTION" && input.allowProduction;
}

function ensureProductionIsExplicitlyAllowed(input: FiscalSettingsPayload) {
  if (input.environment !== "PRODUCTION") {
    return;
  }

  if (!input.allowProduction) {
    throw new AppError(
      "Ambiente de producao exige confirmacao explicita.",
      422,
    );
  }

  if (input.productionConfirmation === FISCAL_PRODUCTION_CONFIRMATION) {
    return;
  }

  throw new AppError(
    `Digite ${FISCAL_PRODUCTION_CONFIRMATION} para habilitar emissao em producao.`,
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
