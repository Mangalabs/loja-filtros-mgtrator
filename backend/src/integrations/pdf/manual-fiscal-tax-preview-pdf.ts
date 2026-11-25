import type { FiscalIssueRequest } from "../fiscal/fiscal-provider.js";
import type { Branch } from "../../models/branches/branches.model.js";
import { pdfStoreWithLogo } from "./pdf-store.js";
import { renderPdf } from "./pdf-renderer.js";
import { manualFiscalTaxPreviewHtml } from "./templates/manual-fiscal-tax-preview-template.js";

export async function generateManualFiscalTaxPreviewPdf(input: {
  branch: Branch | undefined;
  request: FiscalIssueRequest;
}) {
  return renderPdf({
    html: manualFiscalTaxPreviewHtml({
      request: input.request,
      store: pdfStoreWithLogo(input.branch),
    }),
    landscape: true,
  });
}

export function hasManualFiscalTaxes(request: FiscalIssueRequest) {
  return request.sale.items.some((item) =>
    [
      item.icmsBaseCalculation,
      item.icmsRate,
      item.pisBaseCalculation,
      item.pisRate,
      item.cofinsBaseCalculation,
      item.cofinsRate,
      item.ipiBaseCalculation,
      item.ipiRate,
    ].some((value) => value !== null && value !== undefined),
  );
}
