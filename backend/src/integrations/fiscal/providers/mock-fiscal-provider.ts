import type {
  FiscalIssueRequest,
  FiscalIssueResult,
  FiscalProvider,
} from "../fiscal-provider.js";

export class MockFiscalProvider implements FiscalProvider {
  async issue(request: FiscalIssueRequest): Promise<FiscalIssueResult> {
    const referenceDigits = request.reference.replace(/\D/g, "").slice(-8);
    const number = Number(referenceDigits || 1);

    return {
      provider: "MOCK",
      status: "AUTHORIZED",
      accessKey: `MOCK-${request.reference}`,
      providerReference: request.reference,
      number,
      series: 1,
      xmlUrl: `/mock/fiscal-documents/${request.reference}.xml`,
      pdfUrl: `/mock/fiscal-documents/${request.reference}.pdf`,
      rejectionReason: null,
      responsePayload: {
        ambiente: request.environment,
        documento: request.documentType,
        referencia: request.reference,
        status: "autorizado_mock",
      },
    };
  }
}
