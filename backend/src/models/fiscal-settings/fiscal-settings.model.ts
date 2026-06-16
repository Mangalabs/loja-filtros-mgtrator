import { db } from "../../database/knex.js";
import type {
  FiscalEnvironment,
  FiscalProviderName,
} from "../../shared/fiscal/fiscal-types.js";

export type FiscalSettings = {
  id: string;
  provider: FiscalProviderName;
  environment: FiscalEnvironment;
  companyCnpj: string | null;
  allowProduction: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type FiscalSettingsInput = {
  provider: FiscalProviderName;
  environment: FiscalEnvironment;
  companyCnpj: string | null;
  allowProduction: boolean;
};

const fiscalSettingsColumns = [
  "id",
  "provider",
  "environment",
  "company_cnpj as companyCnpj",
  "allow_production as allowProduction",
  "created_at as createdAt",
  "updated_at as updatedAt",
];

export async function getFiscalSettings(): Promise<
  FiscalSettings | undefined
> {
  return db("fiscal_settings").select(fiscalSettingsColumns).first();
}

export async function upsertFiscalSettings(
  input: FiscalSettingsInput,
): Promise<FiscalSettings> {
  const existing = await getFiscalSettings();

  if (existing) {
    const [updated] = await db("fiscal_settings")
      .where("id", existing.id)
      .update({
        provider: input.provider,
        environment: input.environment,
        company_cnpj: input.companyCnpj,
        allow_production: input.allowProduction,
        updated_at: db.fn.now(),
      })
      .returning("id");

    return findFiscalSettingsById(updated.id);
  }

  const [created] = await db("fiscal_settings")
    .insert({
      provider: input.provider,
      environment: input.environment,
      company_cnpj: input.companyCnpj,
      allow_production: input.allowProduction,
    })
    .returning("id");

  return findFiscalSettingsById(created.id);
}

async function findFiscalSettingsById(id: string): Promise<FiscalSettings> {
  const settings = await db("fiscal_settings")
    .select(fiscalSettingsColumns)
    .where("id", id)
    .first();

  if (!settings) {
    throw new Error("Fiscal settings were not found after save");
  }

  return settings;
}
