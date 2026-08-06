import { db } from "../../database/knex.js";

export type CommercialSettings = {
  id: string;
  branchId: string | null;
  branchName: string | null;
  defaultProfitMarginPercentage: string;
  defaultQuoteDueDays: number;
  defaultQuoteValidityDays: number;
  createdAt: Date;
  updatedAt: Date;
};

export type CommercialSettingsInput = {
  defaultProfitMarginPercentage: number;
  defaultQuoteDueDays: number;
  defaultQuoteValidityDays: number;
};

const commercialSettingsColumns = [
  "commercial_settings.id",
  "commercial_settings.branch_id as branchId",
  "branches.name as branchName",
  "commercial_settings.default_profit_margin_percentage as defaultProfitMarginPercentage",
  "commercial_settings.default_quote_due_days as defaultQuoteDueDays",
  "commercial_settings.default_quote_validity_days as defaultQuoteValidityDays",
  "commercial_settings.created_at as createdAt",
  "commercial_settings.updated_at as updatedAt",
];

export async function getCommercialSettings(filters: {
  branchId: string;
}): Promise<
  CommercialSettings | undefined
> {
  return commercialSettingsQuery()
    .where("commercial_settings.branch_id", filters.branchId)
    .first();
}

export async function upsertCommercialSettings(
  branchId: string,
  input: CommercialSettingsInput,
): Promise<CommercialSettings> {
  const existing = await getCommercialSettings({ branchId });

  if (existing) {
    const [updated] = await db("commercial_settings")
      .where("id", existing.id)
      .update({
        default_profit_margin_percentage: input.defaultProfitMarginPercentage,
        default_quote_due_days: input.defaultQuoteDueDays,
        default_quote_validity_days: input.defaultQuoteValidityDays,
        updated_at: db.fn.now(),
      })
      .returning("id");

    return findCommercialSettingsById(updated.id);
  }

  const [created] = await db("commercial_settings")
    .insert({
      branch_id: branchId,
      default_profit_margin_percentage: input.defaultProfitMarginPercentage,
      default_quote_due_days: input.defaultQuoteDueDays,
      default_quote_validity_days: input.defaultQuoteValidityDays,
    })
    .returning("id");

  return findCommercialSettingsById(created.id);
}

function commercialSettingsQuery() {
  return db("commercial_settings")
    .leftJoin("branches", "branches.id", "commercial_settings.branch_id")
    .select<CommercialSettings[]>(commercialSettingsColumns);
}

async function findCommercialSettingsById(
  id: string,
): Promise<CommercialSettings> {
  const settings = await commercialSettingsQuery()
    .where("commercial_settings.id", id)
    .first();

  if (!settings) {
    throw new Error("Commercial settings were not found after save");
  }

  return settings;
}
