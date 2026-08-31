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

  async preview(request: FiscalIssueRequest) {
    return {
      content: Buffer.from(
        `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 86 >>
stream
BT
/Helvetica 14 Tf
72 760 Td
(Previa DANFE mock - ${request.reference}) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000204 00000 n 
trailer
<< /Root 1 0 R /Size 5 >>
startxref
340
%%EOF`,
      ),
      contentType: "application/pdf",
      fileName: `previa-${request.reference}.pdf`,
    };
  }
}
