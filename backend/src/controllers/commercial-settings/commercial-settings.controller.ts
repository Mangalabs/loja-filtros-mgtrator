import {
  getCommercialSettings,
  upsertCommercialSettings,
  type CommercialSettingsInput,
} from "../../models/commercial-settings/commercial-settings.model.js";

export async function showCommercialSettings() {
  return {
    code: 200,
    status: "success",
    data: await currentCommercialSettings(),
  };
}

export async function replaceCommercialSettings(
  input: CommercialSettingsInput,
) {
  const settings = await upsertCommercialSettings({
    defaultProfitMarginPercentage: Number(
      input.defaultProfitMarginPercentage.toFixed(2),
    ),
  });

  return {
    code: 200,
    status: "success",
    data: settings,
  };
}

export async function currentCommercialSettings() {
  const settings = await getCommercialSettings();

  return (
    settings ??
    upsertCommercialSettings({
      defaultProfitMarginPercentage: 0,
    })
  );
}
