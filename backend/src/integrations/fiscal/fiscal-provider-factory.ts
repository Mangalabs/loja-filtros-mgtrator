import type { FiscalProviderName } from "../../shared/fiscal/fiscal-types.js";
import type { FiscalProvider } from "./fiscal-provider.js";
import { FocusFiscalProvider } from "./providers/focus-fiscal-provider.js";
import { MockFiscalProvider } from "./providers/mock-fiscal-provider.js";

const fiscalProviderFactories: Record<string, () => FiscalProvider> = {
  focus: () => new FocusFiscalProvider(),
  mock: () => new MockFiscalProvider(),
};

export function makeFiscalProviderByName(
  providerName: FiscalProviderName,
): FiscalProvider {
  return fiscalProviderFactories[providerName.toLowerCase()]();
}
