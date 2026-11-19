import { db } from "../../database/knex.js";
import type {
  FiscalEnvironment,
  FiscalProviderName,
} from "../../shared/fiscal/fiscal-types.js";

export type FiscalSettings = {
  id: string;
  branchId: string | null;
  branchName: string | null;
  provider: FiscalProviderName;
  environment: FiscalEnvironment;
  companyCnpj: string | null;
  allowProduction: boolean;
  defaultNatureOperation: string | null;
  defaultSaleCfop: string | null;
  defaultIcmsCst: string | null;
  defaultPisCst: string | null;
  defaultCofinsCst: string | null;
  municipalRegistration: string | null;
  serviceMunicipalityName: string | null;
  serviceMunicipalityState: string | null;
  serviceMunicipalityIbgeCode: string | null;
  serviceTaxRegime: "SIMPLES_NACIONAL_NORMAL";
  defaultIssRate: string;
  simpleNationalNominalTaxRate: string | null;
  defaultRetainPis: boolean;
  defaultRetainCofins: boolean;
  defaultRetainCsll: boolean;
  defaultRetainIr: boolean;
  defaultRetainInss: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type FiscalSettingsInput = {
  provider: FiscalProviderName;
  environment: FiscalEnvironment;
  companyCnpj: string | null;
  allowProduction: boolean;
  defaultNatureOperation?: string | null;
  defaultSaleCfop?: string | null;
  defaultIcmsCst?: string | null;
  defaultPisCst?: string | null;
  defaultCofinsCst?: string | null;
  municipalRegistration?: string | null;
  serviceMunicipalityName?: string | null;
  serviceMunicipalityState?: string | null;
  serviceMunicipalityIbgeCode?: string | null;
  serviceTaxRegime?: "SIMPLES_NACIONAL_NORMAL";
  defaultIssRate?: number;
  simpleNationalNominalTaxRate?: number | null;
  defaultRetainPis?: boolean;
  defaultRetainCofins?: boolean;
  defaultRetainCsll?: boolean;
  defaultRetainIr?: boolean;
  defaultRetainInss?: boolean;
};

const fiscalSettingsColumns = [
  "fiscal_settings.id",
  "fiscal_settings.branch_id as branchId",
  "branches.name as branchName",
  "fiscal_settings.provider",
  "fiscal_settings.environment",
  "fiscal_settings.company_cnpj as companyCnpj",
  "fiscal_settings.allow_production as allowProduction",
  "fiscal_settings.default_nature_operation as defaultNatureOperation",
  "fiscal_settings.default_sale_cfop as defaultSaleCfop",
  "fiscal_settings.default_icms_cst as defaultIcmsCst",
  "fiscal_settings.default_pis_cst as defaultPisCst",
  "fiscal_settings.default_cofins_cst as defaultCofinsCst",
  "fiscal_settings.municipal_registration as municipalRegistration",
  "fiscal_settings.service_municipality_name as serviceMunicipalityName",
  "fiscal_settings.service_municipality_state as serviceMunicipalityState",
  "fiscal_settings.service_municipality_ibge_code as serviceMunicipalityIbgeCode",
  "fiscal_settings.service_tax_regime as serviceTaxRegime",
  "fiscal_settings.default_iss_rate as defaultIssRate",
  "fiscal_settings.simple_national_nominal_tax_rate as simpleNationalNominalTaxRate",
  "fiscal_settings.default_retain_pis as defaultRetainPis",
  "fiscal_settings.default_retain_cofins as defaultRetainCofins",
  "fiscal_settings.default_retain_csll as defaultRetainCsll",
  "fiscal_settings.default_retain_ir as defaultRetainIr",
  "fiscal_settings.default_retain_inss as defaultRetainInss",
  "fiscal_settings.created_at as createdAt",
  "fiscal_settings.updated_at as updatedAt",
];

export async function getFiscalSettings(filters: {
  branchId: string;
}): Promise<
  FiscalSettings | undefined
> {
  return fiscalSettingsQuery()
    .where("fiscal_settings.branch_id", filters.branchId)
    .first();
}

export async function upsertFiscalSettings(
  branchId: string,
  input: FiscalSettingsInput,
): Promise<FiscalSettings> {
  const existing = await getFiscalSettings({ branchId });

  if (existing) {
    const [updated] = await db("fiscal_settings")
      .where("id", existing.id)
      .update({
        provider: input.provider,
        environment: input.environment,
        company_cnpj: input.companyCnpj,
        allow_production: input.allowProduction,
        default_nature_operation: input.defaultNatureOperation,
        default_sale_cfop: input.defaultSaleCfop,
        default_icms_cst: input.defaultIcmsCst,
        default_pis_cst: input.defaultPisCst,
        default_cofins_cst: input.defaultCofinsCst,
        municipal_registration:
          input.municipalRegistration === undefined
            ? existing.municipalRegistration
            : input.municipalRegistration,
        service_municipality_name:
          input.serviceMunicipalityName === undefined
            ? existing.serviceMunicipalityName
            : input.serviceMunicipalityName,
        service_municipality_state:
          input.serviceMunicipalityState === undefined
            ? existing.serviceMunicipalityState
            : input.serviceMunicipalityState,
        service_municipality_ibge_code:
          input.serviceMunicipalityIbgeCode === undefined
            ? existing.serviceMunicipalityIbgeCode
            : input.serviceMunicipalityIbgeCode,
        service_tax_regime:
          input.serviceTaxRegime ?? existing.serviceTaxRegime,
        default_iss_rate: input.defaultIssRate ?? existing.defaultIssRate,
        simple_national_nominal_tax_rate:
          input.simpleNationalNominalTaxRate === undefined
            ? existing.simpleNationalNominalTaxRate
            : input.simpleNationalNominalTaxRate,
        default_retain_pis:
          input.defaultRetainPis ?? existing.defaultRetainPis,
        default_retain_cofins:
          input.defaultRetainCofins ?? existing.defaultRetainCofins,
        default_retain_csll:
          input.defaultRetainCsll ?? existing.defaultRetainCsll,
        default_retain_ir: input.defaultRetainIr ?? existing.defaultRetainIr,
        default_retain_inss:
          input.defaultRetainInss ?? existing.defaultRetainInss,
        updated_at: db.fn.now(),
      })
      .returning("id");

    return findFiscalSettingsById(updated.id);
  }

  const [created] = await db("fiscal_settings")
    .insert({
      branch_id: branchId,
      provider: input.provider,
      environment: input.environment,
      company_cnpj: input.companyCnpj,
      allow_production: input.allowProduction,
      default_nature_operation: input.defaultNatureOperation,
      default_sale_cfop: input.defaultSaleCfop,
      default_icms_cst: input.defaultIcmsCst,
      default_pis_cst: input.defaultPisCst,
      default_cofins_cst: input.defaultCofinsCst,
      municipal_registration: input.municipalRegistration ?? null,
      service_municipality_name: input.serviceMunicipalityName ?? null,
      service_municipality_state: input.serviceMunicipalityState ?? null,
      service_municipality_ibge_code:
        input.serviceMunicipalityIbgeCode ?? null,
      service_tax_regime:
        input.serviceTaxRegime ?? "SIMPLES_NACIONAL_NORMAL",
      default_iss_rate: input.defaultIssRate ?? 2,
      simple_national_nominal_tax_rate:
        input.simpleNationalNominalTaxRate ?? null,
      default_retain_pis: input.defaultRetainPis ?? false,
      default_retain_cofins: input.defaultRetainCofins ?? false,
      default_retain_csll: input.defaultRetainCsll ?? false,
      default_retain_ir: input.defaultRetainIr ?? false,
      default_retain_inss: input.defaultRetainInss ?? false,
    })
    .returning("id");

  return findFiscalSettingsById(created.id);
}

function fiscalSettingsQuery() {
  return db("fiscal_settings")
    .leftJoin("branches", "branches.id", "fiscal_settings.branch_id")
    .select<FiscalSettings[]>(fiscalSettingsColumns);
}

async function findFiscalSettingsById(id: string): Promise<FiscalSettings> {
  const settings = await fiscalSettingsQuery()
    .where("fiscal_settings.id", id)
    .first();

  if (!settings) {
    throw new Error("Fiscal settings were not found after save");
  }

  return settings;
}
