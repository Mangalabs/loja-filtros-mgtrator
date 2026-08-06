import {
  getCommercialSettings,
  upsertCommercialSettings,
  type CommercialSettingsInput,
} from "../../models/commercial-settings/commercial-settings.model.js";

export async function showCommercialSettings(branchId: string) {
  return {
    code: 200,
    status: "success",
    data: await currentCommercialSettings(branchId),
  };
}

export async function replaceCommercialSettings(
  branchId: string,
  input: CommercialSettingsInput,
) {
  const settings = await upsertCommercialSettings(
    branchId,
    {
      defaultProfitMarginPercentage: Number(
        input.defaultProfitMarginPercentage.toFixed(2),
      ),
      defaultQuoteValidityDays: input.defaultQuoteValidityDays,
    },
  );

  return {
    code: 200,
    status: "success",
    data: settings,
  };
}

export async function currentCommercialSettings(branchId: string) {
  const settings = await getCommercialSettings({ branchId });

  return (
    settings ??
    upsertCommercialSettings(branchId, {
      defaultProfitMarginPercentage: 0,
      defaultQuoteValidityDays: 7,
    })
  );
}
