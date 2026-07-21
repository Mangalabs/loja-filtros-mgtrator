import type { Quote } from "../../models/quotes/quotes.model.js";
import { pdfStoreWithLogo } from "./pdf-store.js";
import { renderPdf } from "./pdf-renderer.js";
import { quotePdfHtml } from "./templates/quote-pdf-template.js";

export async function generateQuotePdf(quote: Quote): Promise<Buffer> {
  return renderPdf({
    html: quotePdfHtml(quote, pdfStoreWithLogo()),
    landscape: true,
  });
}
