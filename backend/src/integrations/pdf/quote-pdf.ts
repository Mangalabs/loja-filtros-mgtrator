import { env } from "../../config/env.js";
import type { Quote } from "../../models/quotes/quotes.model.js";
import { pdfAssetDataUri } from "./pdf-assets.js";
import { renderPdf } from "./pdf-renderer.js";
import { quotePdfHtml } from "./templates/quote-pdf-template.js";

export async function generateQuotePdf(quote: Quote): Promise<Buffer> {
  return renderPdf({
    html: quotePdfHtml(quote, {
      ...env.quotePdfStore,
      logoDataUri: pdfAssetDataUri(
        "logo_mgtratorpecas_png_azul.png",
        "image/png",
      ),
    }),
    landscape: true,
  });
}
