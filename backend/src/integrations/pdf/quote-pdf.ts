import puppeteer from "puppeteer";
import type { Quote } from "../../models/quotes/quotes.model.js";
import { quotePdfHtml } from "./templates/quote-pdf-template.js";

export async function generateQuotePdf(quote: Quote): Promise<Buffer> {
  const browser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(quotePdfHtml(quote), { waitUntil: "load" });
    const pdf = await page.pdf({
      format: "A4",
      landscape: true,
      margin: {
        top: "10mm",
        right: "10mm",
        bottom: "10mm",
        left: "10mm",
      },
      printBackground: true,
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}
