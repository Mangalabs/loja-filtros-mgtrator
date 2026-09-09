import { renderPdf } from "./pdf-renderer.js";
import {
  reportPdfHtml,
  type ReportPdfDocument,
} from "./templates/report-pdf-template.js";

export async function generateReportPdf(
  report: ReportPdfDocument,
): Promise<Buffer> {
  return renderPdf({ html: reportPdfHtml(report), landscape: true });
}
