import { db } from "../../database/knex.js";

export type CommercialSettings = {
  id: string;
  defaultProfitMarginPercentage: string;
  createdAt: Date;
  updatedAt: Date;
};

export type CommercialSettingsInput = {
  defaultProfitMarginPercentage: number;
};

const commercialSettingsColumns = [
  "id",
  "default_profit_margin_percentage as defaultProfitMarginPercentage",
  "created_at as createdAt",
  "updated_at as updatedAt",
];

export async function getCommercialSettings(): Promise<
  CommercialSettings | undefined
> {
  return db("commercial_settings").select(commercialSettingsColumns).first();
}

export async function upsertCommercialSettings(
  input: CommercialSettingsInput,
): Promise<CommercialSettings> {
  const existing = await getCommercialSettings();

  if (existing) {
    const [updated] = await db("commercial_settings")
      .where("id", existing.id)
      .update({
        default_profit_margin_percentage: input.defaultProfitMarginPercentage,
        updated_at: db.fn.now(),
      })
      .returning("id");

    return findCommercialSettingsById(updated.id);
  }

  const [created] = await db("commercial_settings")
    .insert({
      default_profit_margin_percentage: input.defaultProfitMarginPercentage,
    })
    .returning("id");

  return findCommercialSettingsById(created.id);
}

async function findCommercialSettingsById(
  id: string,
): Promise<CommercialSettings> {
  const settings = await db("commercial_settings")
    .select(commercialSettingsColumns)
    .where("id", id)
    .first();

  if (!settings) {
    throw new Error("Commercial settings were not found after save");
  }

  return settings;
}
