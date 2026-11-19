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
  const currentSettings = await getFiscalSettings({ branchId });

  ensureProductionIsExplicitlyAllowed(input, currentSettings);
  const companyCnpj = fiscalDigits(input.companyCnpj);
  ensureFocusCompanyCnpj(input.provider, companyCnpj);

  const settings = await upsertFiscalSettings(
    branchId,
    {
      provider: input.provider,
      environment: input.environment,
      allowProduction: fiscalProductionAllowance(input),
      companyCnpj,
      defaultNatureOperation: currentDefaultNatureOperation(
        input.defaultNatureOperation,
      ),
      defaultSaleCfop: currentDefaultSaleCfop(input.defaultSaleCfop),
      defaultIcmsCst: fiscalDigits(input.defaultIcmsCst),
      defaultPisCst: fiscalDigits(input.defaultPisCst),
      defaultCofinsCst: fiscalDigits(input.defaultCofinsCst),
      municipalRegistration: optionalFiscalText(input.municipalRegistration),
      serviceMunicipalityName: optionalFiscalText(
        input.serviceMunicipalityName,
      ),
      serviceMunicipalityState: optionalFiscalState(
        input.serviceMunicipalityState,
      ),
      serviceMunicipalityIbgeCode: optionalFiscalDigits(
        input.serviceMunicipalityIbgeCode,
      ),
      serviceTaxRegime: input.serviceTaxRegime,
      defaultIssRate: input.defaultIssRate,
      simpleNationalNominalTaxRate: input.simpleNationalNominalTaxRate,
      defaultRetainPis: input.defaultRetainPis,
      defaultRetainCofins: input.defaultRetainCofins,
      defaultRetainCsll: input.defaultRetainCsll,
      defaultRetainIr: input.defaultRetainIr,
      defaultRetainInss: input.defaultRetainInss,
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
      ...fiscalIssueDefaults(settings),
    });
  }

  if (
    settings &&
    (fiscalSettingsMissingIssueDefaults(settings) ||
      fiscalSettingsUseOutdatedSaleDefaults(settings))
  ) {
    return upsertFiscalSettings(branchId, {
      provider: settings.provider,
      environment: settings.environment,
      companyCnpj: settings.companyCnpj,
      allowProduction: settings.allowProduction,
      ...fiscalIssueDefaults(settings),
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
      ...fiscalIssueDefaults(settings),
    });
  }

  return upsertFiscalSettings(branchId, {
    provider:
      env.fiscal.provider.toUpperCase() as FiscalSettingsInput["provider"],
    environment: env.fiscal.environment,
    companyCnpj: branchCompanyCnpj ?? fiscalDigits(env.fiscal.focus.companyCnpj),
    allowProduction: false,
    ...defaultFiscalIssueSettings(),
  });
}

type FiscalIssueDefaultsInput = Pick<
  FiscalSettingsInput,
  | "defaultNatureOperation"
  | "defaultSaleCfop"
  | "defaultIcmsCst"
  | "defaultPisCst"
  | "defaultCofinsCst"
>;

function fiscalIssueDefaults(settings: FiscalIssueDefaultsInput) {
  return {
    defaultNatureOperation:
      currentDefaultNatureOperation(settings.defaultNatureOperation),
    defaultSaleCfop: currentDefaultSaleCfop(settings.defaultSaleCfop),
    defaultIcmsCst:
      fiscalDigits(settings.defaultIcmsCst) ??
      defaultFiscalIssueSettings().defaultIcmsCst,
    defaultPisCst:
      fiscalDigits(settings.defaultPisCst) ??
      defaultFiscalIssueSettings().defaultPisCst,
    defaultCofinsCst:
      fiscalDigits(settings.defaultCofinsCst) ??
      defaultFiscalIssueSettings().defaultCofinsCst,
  };
}

function defaultFiscalIssueSettings() {
  return {
    defaultNatureOperation:
      "Venda de mercadoria adquirida ou recebida de terceiros (ST)",
    defaultSaleCfop: "5403",
    defaultIcmsCst: "102",
    defaultPisCst: "49",
    defaultCofinsCst: "49",
  };
}

function currentDefaultNatureOperation(value?: string | null) {
  const normalized = fiscalText(value);

  return !normalized ||
    normalized === "Venda de mercadoria" ||
    normalized === "5.102/6.102 - Venda mercadoria terceiros"
    ? defaultFiscalIssueSettings().defaultNatureOperation
    : normalized;
}

function currentDefaultSaleCfop(value?: string | null) {
  const normalized = fiscalDigits(value);

  return normalized === "5403"
    ? normalized
    : defaultFiscalIssueSettings().defaultSaleCfop;
}

function fiscalSettingsUseOutdatedSaleDefaults(
  settings: FiscalIssueDefaultsInput,
) {
  return (
    currentDefaultNatureOperation(settings.defaultNatureOperation) !==
      settings.defaultNatureOperation ||
    currentDefaultSaleCfop(settings.defaultSaleCfop) !==
      settings.defaultSaleCfop
  );
}

function fiscalSettingsMissingIssueDefaults(settings: FiscalIssueDefaultsInput) {
  return [
    settings.defaultNatureOperation,
    settings.defaultSaleCfop,
    settings.defaultIcmsCst,
    settings.defaultPisCst,
    settings.defaultCofinsCst,
  ].some((value) => !value);
}

function fiscalProductionAllowance(input: FiscalSettingsInput) {
  return input.environment === "PRODUCTION" && input.allowProduction;
}

function ensureProductionIsExplicitlyAllowed(
  input: FiscalSettingsPayload,
  currentSettings?: Awaited<ReturnType<typeof getFiscalSettings>>,
) {
  if (input.environment !== "PRODUCTION") {
    return;
  }

  if (!input.allowProduction) {
    throw new AppError(
      "Ambiente de producao exige confirmacao explicita.",
      422,
    );
  }

  if (
    currentSettings?.environment === "PRODUCTION" &&
    currentSettings.allowProduction
  ) {
    return;
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

function fiscalDigits(value?: string | null) {
  const normalized = value?.replace(/\D/g, "");
  return normalized || null;
}

function fiscalText(value?: string | null) {
  return value?.trim() || null;
}

function optionalFiscalText(value?: string | null) {
  return value === undefined ? undefined : fiscalText(value);
}

function optionalFiscalDigits(value?: string | null) {
  return value === undefined ? undefined : fiscalDigits(value);
}

function optionalFiscalState(value?: string | null) {
  const normalized = optionalFiscalText(value);

  return normalized?.toUpperCase() ?? normalized;
}
