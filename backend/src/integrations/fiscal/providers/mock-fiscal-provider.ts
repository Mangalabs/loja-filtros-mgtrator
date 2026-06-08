import type {
  FiscalCancelRequest,
  FiscalCancelResult,
  FiscalCheckRequest,
  FiscalCheckResult,
  FiscalIssueRequest,
  FiscalIssueResult,
  FiscalProvider,
} from "../fiscal-provider.js";

export class MockFiscalProvider implements FiscalProvider {
  async cancel(request: FiscalCancelRequest): Promise<FiscalCancelResult> {
    return {
      provider: "MOCK",
      status: "CANCELLED",
      accessKey: `MOCK-${request.providerReference}`,
      providerReference: request.providerReference,
      number: Number(
        request.providerReference.replace(/\D/g, "").slice(-8) || 1,
      ),
      series: 1,
      xmlUrl: `/mock/fiscal-documents/${request.providerReference}.xml`,
      pdfUrl: `/mock/fiscal-documents/${request.providerReference}.pdf`,
      rejectionReason: null,
      responsePayload: {
        documento: request.documentType,
        justificativa: request.reason,
        referencia: request.providerReference,
        status: "cancelado_mock",
      },
    };
  }

  async check(request: FiscalCheckRequest): Promise<FiscalCheckResult> {
    return {
      provider: "MOCK",
      status: "AUTHORIZED",
      accessKey: `MOCK-${request.providerReference}`,
      providerReference: request.providerReference,
      number: Number(
        request.providerReference.replace(/\D/g, "").slice(-8) || 1,
      ),
      series: 1,
      xmlUrl: `/mock/fiscal-documents/${request.providerReference}.xml`,
      pdfUrl: `/mock/fiscal-documents/${request.providerReference}.pdf`,
      rejectionReason: null,
      responsePayload: {
        documento: request.documentType,
        referencia: request.providerReference,
        status: "autorizado_mock",
      },
    };
  }

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
