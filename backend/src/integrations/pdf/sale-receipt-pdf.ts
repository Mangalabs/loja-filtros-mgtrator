import type { Sale } from "../../models/sales/sales.model.js";
import { pdfStoreWithLogo } from "./pdf-store.js";
import { renderPdf } from "./pdf-renderer.js";
import { saleReceiptPdfHtml } from "./templates/sale-receipt-pdf-template.js";

export async function generateSaleReceiptPdf(sale: Sale): Promise<Buffer> {
  return renderPdf({
    html: saleReceiptPdfHtml(sale, pdfStoreWithLogo()),
  });
}
