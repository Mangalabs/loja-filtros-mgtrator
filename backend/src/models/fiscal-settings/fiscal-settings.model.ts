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
