import type {
  ServiceFiscalCancelRequest,
  ServiceFiscalCheckRequest,
  ServiceFiscalIssueRequest,
  ServiceFiscalIssueResult,
  ServiceFiscalProvider,
} from "../service-fiscal-provider.js";

export class MockServiceFiscalProvider implements ServiceFiscalProvider {
  async cancel(
    request: ServiceFiscalCancelRequest,
  ): Promise<ServiceFiscalIssueResult> {
    return {
      provider: "MOCK",
      status: "CANCELLED",
      providerReference: request.providerReference,
      protocol: `MOCK-CANCEL-${request.providerReference}`,
      accessKey: null,
      nfseNumber: null,
      xmlUrl: null,
      pdfUrl: null,
      rejectionReason: null,
      responsePayload: {
        status: "cancelado",
        justificativa: request.justification,
      },
    };
  }

  async check(
    request: ServiceFiscalCheckRequest,
  ): Promise<ServiceFiscalIssueResult> {
    return {
      provider: "MOCK",
      status: "AUTHORIZED",
      providerReference: request.providerReference,
      protocol: `MOCK-${request.providerReference}`,
      accessKey: `MOCK-NFSE-${request.providerReference}`,
      nfseNumber: null,
      xmlUrl: `/mock/service-fiscal-documents/${request.providerReference}.xml`,
      pdfUrl: `/mock/service-fiscal-documents/${request.providerReference}.pdf`,
      rejectionReason: null,
      responsePayload: {
        ambiente: request.environment,
        ref: request.providerReference,
        status: "autorizado_mock",
      },
    };
  }

  async issue(
    request: ServiceFiscalIssueRequest,
  ): Promise<ServiceFiscalIssueResult> {
    return {
      provider: "MOCK",
      status: "AUTHORIZED",
      providerReference: request.reference,
      protocol: `MOCK-${request.dpsNumber}`,
      accessKey: `MOCK-NFSE-${request.reference}`,
      nfseNumber: String(request.dpsNumber),
      xmlUrl: `/mock/service-fiscal-documents/${request.reference}.xml`,
      pdfUrl: `/mock/service-fiscal-documents/${request.reference}.pdf`,
      rejectionReason: null,
      responsePayload: {
        ambiente: request.environment,
        ref: request.reference,
        status: "autorizado_mock",
      },
    };
  }
}
