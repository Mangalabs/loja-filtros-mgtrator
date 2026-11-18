import type { FiscalProviderName } from "../../shared/fiscal/fiscal-types.js";
import type { ServiceFiscalProvider } from "./service-fiscal-provider.js";
import { FocusServiceFiscalProvider } from "./providers/focus-service-fiscal-provider.js";
import { MockServiceFiscalProvider } from "./providers/mock-service-fiscal-provider.js";

const providerFactories: Record<string, () => ServiceFiscalProvider> = {
  focus: () => new FocusServiceFiscalProvider(),
  mock: () => new MockServiceFiscalProvider(),
};

export function makeServiceFiscalProviderByName(
  providerName: FiscalProviderName,
): ServiceFiscalProvider {
  return providerFactories[providerName.toLowerCase()]();
}
