import type { Branch } from "../../models/branches/branches.model.js";
import type { FiscalService } from "../../models/fiscal-services/fiscal-services.model.js";
import type { FiscalSettings } from "../../models/fiscal-settings/fiscal-settings.model.js";
import type { ServiceFiscalDocumentInput } from "../../shared/fiscal/service-fiscal-document.js";
import { pdfStoreWithLogo } from "./pdf-store.js";
import { renderPdf } from "./pdf-renderer.js";
import { serviceFiscalDocumentPreviewHtml } from "./templates/service-fiscal-document-preview-template.js";

export async function generateServiceFiscalDocumentPreviewPdf(input: {
  branch: Branch | undefined;
  fiscalSettings: FiscalSettings;
  fiscalService: FiscalService;
  document: ServiceFiscalDocumentInput;
}) {
  return renderPdf({
    html: serviceFiscalDocumentPreviewHtml({
      ...input,
      store: pdfStoreWithLogo(input.branch),
    }),
  });
}
