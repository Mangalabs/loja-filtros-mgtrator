import type { Quote } from "../../models/quotes/quotes.model.js";
import { pdfStoreWithLogo, type PdfStoreProfile } from "./pdf-store.js";
import { renderPdf } from "./pdf-renderer.js";
import { quotePdfHtml } from "./templates/quote-pdf-template.js";

export async function generateQuotePdf(
  quote: Quote,
  storeProfile?: PdfStoreProfile | null,
): Promise<Buffer> {
  return renderPdf({
    html: quotePdfHtml(quote, pdfStoreWithLogo(storeProfile)),
    landscape: true,
  });
}
