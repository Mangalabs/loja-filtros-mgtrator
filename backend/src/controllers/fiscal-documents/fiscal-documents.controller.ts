import { db } from "../../database/knex.js";
import { env } from "../../config/env.js";
import type { FiscalIssueRequest } from "../../integrations/fiscal/fiscal-provider.js";
import { makeFiscalProviderByName } from "../../integrations/fiscal/fiscal-provider-factory.js";
import { currentFiscalSettings } from "../fiscal-settings/fiscal-settings.controller.js";
import {
  findBlockingFiscalDocumentBySale,
  findFiscalDocumentBySource,
  getFiscalDocumentById,
  insertFiscalDocument,
  listFiscalDocuments,
  replaceFiscalDocumentIssue,
  updateFiscalDocumentStatus,
  type FiscalDocumentStatus,
  type FiscalDocumentSourceType,
} from "../../models/fiscal-documents/fiscal-documents.model.js";
import { getPickupReservationById } from "../../models/pickup-reservations/pickup-reservations.model.js";
import {
  getSaleById,
  saleHasLinkedOperation,
} from "../../models/sales/sales.model.js";
import { getShippingOrderById } from "../../models/shipping-orders/shipping-orders.model.js";
import { AppError, type AppErrorDetail } from "../../shared/errors/app-error.js";
import type { FiscalDocumentType } from "../../shared/fiscal/fiscal-types.js";

export async function indexFiscalDocuments(filters: { branchId: string }) {
  return {
    code: 200,
    status: "success",
    data: await listFiscalDocuments(filters),
  };
}

export async function showFiscalDocument(id: string, branchId: string) {
  const fiscalDocument = await getFiscalDocumentById(id, { branchId });

  if (!fiscalDocument) {
    throw new AppError("Documento fiscal nao encontrado.", 404);
  }

  return {
    code: 200,
    status: "success",
    data: fiscalDocument,
  };
}

export async function downloadFiscalDocumentFile(
  id: string,
  branchId: string,
  fileType: "danfe" | "xml",
) {
  const fiscalDocument = await getFiscalDocumentById(id, { branchId });

  if (!fiscalDocument) {
    throw new AppError("Documento fiscal nao encontrado.", 404);
  }

  const fileUrl =
    fileType === "xml" ? fiscalDocument.xmlUrl : fiscalDocument.pdfUrl;

  if (!fileUrl) {
    throw new AppError("Arquivo fiscal ainda nao disponivel.", 404);
  }

  if (fiscalDocument.provider === "MOCK" && fileUrl.startsWith("/mock/")) {
    const file = mockFiscalDocumentFile(
      fiscalDocument.providerReference ?? fiscalDocument.id,
      fileType === "xml" ? "xml" : "pdf",
    );

    return file;
  }

  const remoteUrl = validatedFiscalFileUrl(fileUrl);
  const response = await fetch(remoteUrl);

  if (!response.ok) {
    throw new AppError("Nao foi possivel baixar o arquivo fiscal agora.", 502);
  }

  return {
    content: Buffer.from(await response.arrayBuffer()),
    contentType:
      response.headers.get("content-type") ??
      (fileType === "xml" ? "application/xml" : "application/pdf"),
    fileName: fiscalDocumentFileName(fiscalDocument, fileType),
  };
}

export function mockFiscalDocumentFile(
  reference: string,
  extension: "pdf" | "xml",
) {
  const fileName = `${reference}.${extension}`;
  const files = {
    pdf: {
      content: mockFiscalDocumentPdf(reference),
      contentType: "application/pdf",
      fileName,
    },
    xml: {
      content: mockFiscalDocumentXml(reference),
      contentType: "application/xml; charset=utf-8",
      fileName,
    },
  };

  return files[extension];
}

function validatedFiscalFileUrl(fileUrl: string) {
  const parsedUrl = fiscalFileUrl(fileUrl);
  const allowedOrigins = focusFileAllowedOrigins();

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new AppError("URL do arquivo fiscal invalida.", 422);
  }

  if (!allowedOrigins.has(parsedUrl.origin)) {
    throw new AppError(
      "URL do arquivo fiscal fora do provedor configurado.",
      422,
    );
  }

  return parsedUrl.toString();
}

function fiscalFileUrl(fileUrl: string) {
  try {
    return new URL(fileUrl);
  } catch {
    throw new AppError("URL do arquivo fiscal invalida.", 422);
  }
}

function focusFileAllowedOrigins() {
  return new Set(
    [
      "https://homologacao.focusnfe.com.br",
      "https://api.focusnfe.com.br",
      env.fiscal.focus.baseUrls.HOMOLOGATION,
      env.fiscal.focus.baseUrls.PRODUCTION,
      env.fiscal.focus.baseUrl,
    ].map((baseUrl) => new URL(baseUrl).origin),
  );
}

function fiscalDocumentFileName(
  fiscalDocument: Awaited<ReturnType<typeof getFiscalDocumentById>>,
  fileType: "danfe" | "xml",
) {
  const extension = fileType === "xml" ? "xml" : "pdf";
  const reference =
    fiscalDocument?.providerReference ??
    fiscalDocument?.accessKey ??
    fiscalDocument?.id ??
    "documento-fiscal";

  return `${reference.replace(/[^a-zA-Z0-9_-]/g, "")}.${extension}`;
}

export async function syncFiscalDocument(id: string, branchId: string) {
  const fiscalDocument = await getFiscalDocumentById(id, { branchId });

  if (!fiscalDocument) {
    throw new AppError("Documento fiscal nao encontrado.", 404);
  }

  if (
    fiscalDocument.status === "CANCELLED" &&
    fiscalDocument.provider === "MOCK"
  ) {
    return {
      code: 200,
      status: "success",
      data: fiscalDocument,
    };
  }

  if (!fiscalDocument.providerReference) {
    throw new AppError("Documento fiscal sem referencia do provedor.", 422);
  }

  const fiscalSettings = await currentFiscalSettings(branchId);
  const provider = makeFiscalProviderByName(fiscalDocument.provider);
  const result = await provider.check({
    companyCnpj: fiscalSettings.companyCnpj,
    documentType: fiscalDocument.documentType,
    environment: fiscalDocument.environment,
    providerReference: fiscalDocument.providerReference,
  });
  const status = fiscalSyncStatus(fiscalDocument, result.status);
  const updated = await updateFiscalDocumentStatus(id, {
    status,
    accessKey: result.accessKey ?? fiscalDocument.accessKey,
    providerReference: result.providerReference,
    number: result.number ?? fiscalDocument.number,
    series: result.series ?? fiscalDocument.series,
    xmlUrl: result.xmlUrl ?? fiscalDocument.xmlUrl,
    pdfUrl: result.pdfUrl ?? fiscalDocument.pdfUrl,
    rejectionReason: fiscalSyncRejectionReason(
      status,
      fiscalDocument,
      result.rejectionReason,
    ),
    responsePayload: result.responsePayload,
    ...fiscalSyncCancellationAudit(status, fiscalDocument),
  });

  return {
    code: 200,
    status: "success",
    data: updated,
  };
}

function fiscalSyncStatus(
  fiscalDocument: Awaited<ReturnType<typeof getFiscalDocumentById>>,
  providerStatus: FiscalDocumentStatus,
) {
  return fiscalDocument?.cancellationReason
    ? fiscalCancellationSyncStatus(providerStatus)
    : providerStatus;
}

function fiscalCancellationSyncStatus(providerStatus: FiscalDocumentStatus) {
  const statusByProviderStatus: Partial<
    Record<FiscalDocumentStatus, FiscalDocumentStatus>
  > = {
    REJECTED: "AUTHORIZED",
  };

  return statusByProviderStatus[providerStatus] ?? providerStatus;
}

function fiscalSyncRejectionReason(
  status: FiscalDocumentStatus,
  fiscalDocument: Awaited<ReturnType<typeof getFiscalDocumentById>>,
  rejectionReason: string | null,
) {
  if (rejectionReason || status !== "AUTHORIZED") {
    return rejectionReason;
  }

  return fiscalDocument?.status === "AUTHORIZED"
    ? fiscalDocument.rejectionReason
    : null;
}

function mockFiscalDocumentPdf(reference: string) {
  return Buffer.from(
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
<< /Length 77 >>
stream
BT
/Helvetica 14 Tf
72 760 Td
(DANFE mock - ${reference}) Tj
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
331
%%EOF`,
  );
}

function mockFiscalDocumentXml(reference: string) {
  return `<nfeMock><referencia>${xmlEscape(reference)}</referencia><status>autorizado_mock</status></nfeMock>`;
}

function xmlEscape(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function cancelFiscalDocument(
  id: string,
  reason: string,
  cancelledByUserId: string,
  branchId: string,
) {
  const fiscalDocument = await getFiscalDocumentById(id, { branchId });

  if (!fiscalDocument) {
    throw new AppError("Documento fiscal nao encontrado.", 404);
  }

  if (!fiscalDocument.providerReference) {
    throw new AppError("Documento fiscal sem referencia do provedor.", 422);
  }

  if (fiscalDocument.status !== "AUTHORIZED") {
    throw new AppError("Somente nota autorizada pode ser cancelada.", 422);
  }

  const fiscalSettings = await currentFiscalSettings(branchId);
  const provider = makeFiscalProviderByName(fiscalDocument.provider);
  const result = await provider.cancel({
    companyCnpj: fiscalSettings.companyCnpj,
    documentType: fiscalDocument.documentType,
    environment: fiscalDocument.environment,
    providerReference: fiscalDocument.providerReference,
    reason,
  });
  const status = fiscalCancellationStatus(fiscalDocument.status, result.status);
  const cancellationAudit = fiscalCancellationAudit(status, {
    cancelledByUserId,
    reason,
  });
  const updated = await updateFiscalDocumentStatus(id, {
    status,
    accessKey: result.accessKey ?? fiscalDocument.accessKey,
    providerReference: result.providerReference,
    number: result.number ?? fiscalDocument.number,
    series: result.series ?? fiscalDocument.series,
    xmlUrl: result.xmlUrl ?? fiscalDocument.xmlUrl,
    pdfUrl: result.pdfUrl ?? fiscalDocument.pdfUrl,
    rejectionReason: result.rejectionReason,
    responsePayload: result.responsePayload,
    ...cancellationAudit,
  });

  return {
    code: 200,
    status: "success",
    data: updated,
  };
}

function fiscalCancellationStatus(
  currentStatus: FiscalDocumentStatus,
  providerStatus: FiscalDocumentStatus,
) {
  const statusByProviderStatus: Partial<
    Record<FiscalDocumentStatus, FiscalDocumentStatus>
  > = {
    REJECTED: currentStatus,
  };

  return statusByProviderStatus[providerStatus] ?? providerStatus;
}

function fiscalCancellationAudit(
  status: FiscalDocumentStatus,
  audit: { cancelledByUserId: string; reason: string },
) {
  const auditByStatus: Partial<
    Record<
      FiscalDocumentStatus,
      { cancelledByUserId: string; cancellationReason: string }
    >
  > = {
    CANCELLED: {
      cancelledByUserId: audit.cancelledByUserId,
      cancellationReason: audit.reason,
    },
    PROCESSING: {
      cancelledByUserId: audit.cancelledByUserId,
      cancellationReason: audit.reason,
    },
  };

  return auditByStatus[status] ?? {};
}

function existingFiscalCancellationAudit(
  fiscalDocument: Awaited<ReturnType<typeof getFiscalDocumentById>>,
) {
  return fiscalDocument?.cancelledByUserId && fiscalDocument.cancellationReason
    ? {
        cancelledByUserId: fiscalDocument.cancelledByUserId,
        cancellationReason: fiscalDocument.cancellationReason,
      }
    : {};
}

function fiscalSyncCancellationAudit(
  status: FiscalDocumentStatus,
  fiscalDocument: Awaited<ReturnType<typeof getFiscalDocumentById>>,
) {
  const auditByStatus: Partial<
    Record<FiscalDocumentStatus, ReturnType<typeof existingFiscalCancellationAudit>>
  > = {
    CANCELLED: existingFiscalCancellationAudit(fiscalDocument),
    PROCESSING: existingFiscalCancellationAudit(fiscalDocument),
  };

  return auditByStatus[status] ?? {};
}

export async function issueSaleFiscalDocument(
  saleId: string,
  issuedByUserId: string,
  documentType: FiscalDocumentType,
  branchId: string,
  additionalInformation: string | null,
) {
  const sale = await getSaleById(saleId, db, { branchId });

  if (!sale) {
    throw new AppError("Venda informada nao encontrada.", 404);
  }

  if (sale.status === "CANCELLED") {
    throw new AppError("Venda cancelada nao pode emitir NF-e.", 422);
  }

  if (sale.status === "OPEN") {
    throw new AppError("Conclua a venda antes de emitir NF-e.", 422);
  }

  return issueFiscalDocument({
    branchId,
    sourceType: "SALE",
    sourceId: sale.id,
    saleId: sale.id,
    issuedByUserId,
    documentType,
    additionalInformation,
    duplicateMessage: "Documento fiscal ja emitido para esta venda.",
  });
}

export async function previewSaleFiscalDocument(
  saleId: string,
  documentType: FiscalDocumentType,
  branchId: string,
  additionalInformation: string | null,
) {
  const sale = await getSaleById(saleId, db, { branchId });

  if (!sale) {
    throw new AppError("Venda informada nao encontrada.", 404);
  }

  if (sale.status === "CANCELLED") {
    throw new AppError("Venda cancelada nao pode gerar previa de NF-e.", 422);
  }

  if (sale.status === "OPEN") {
    throw new AppError("Conclua a venda antes de gerar previa de NF-e.", 422);
  }

  return previewFiscalDocument({
    branchId,
    sourceType: "SALE",
    sourceId: sale.id,
    saleId: sale.id,
    documentType,
    additionalInformation,
  });
}

export async function issueShippingOrderFiscalDocument(
  shippingOrderId: string,
  issuedByUserId: string,
  documentType: FiscalDocumentType,
  branchId: string,
  additionalInformation: string | null,
) {
  const shippingOrder = await getShippingOrderById(shippingOrderId, db, {
    branchId,
  });

  if (!shippingOrder) {
    throw new AppError("Pedido para envio nao encontrado.", 404);
  }

  if (shippingOrder.status !== "COMPLETED" || !shippingOrder.saleId) {
    throw new AppError("Pedido para envio ainda nao concluido.", 422);
  }

  return issueFiscalDocument({
    branchId,
    sourceType: "SHIPPING_ORDER",
    sourceId: shippingOrder.id,
    saleId: shippingOrder.saleId,
    issuedByUserId,
    documentType,
    additionalInformation,
    duplicateMessage: "Documento fiscal ja emitido para este pedido.",
  });
}

export async function previewShippingOrderFiscalDocument(
  shippingOrderId: string,
  documentType: FiscalDocumentType,
  branchId: string,
  additionalInformation: string | null,
) {
  const shippingOrder = await getShippingOrderById(shippingOrderId, db, {
    branchId,
  });

  if (!shippingOrder) {
    throw new AppError("Pedido para envio nao encontrado.", 404);
  }

  if (shippingOrder.status !== "COMPLETED" || !shippingOrder.saleId) {
    throw new AppError("Pedido para envio ainda nao concluido.", 422);
  }

  return previewFiscalDocument({
    branchId,
    sourceType: "SHIPPING_ORDER",
    sourceId: shippingOrder.id,
    saleId: shippingOrder.saleId,
    documentType,
    additionalInformation,
  });
}

export async function issuePickupReservationFiscalDocument(
  pickupReservationId: string,
  issuedByUserId: string,
  documentType: FiscalDocumentType,
  branchId: string,
  additionalInformation: string | null,
) {
  const pickupReservation = await getPickupReservationById(
    pickupReservationId,
    db,
    { branchId },
  );

  if (!pickupReservation) {
    throw new AppError("Reserva para retirada nao encontrada.", 404);
  }

  if (pickupReservation.status !== "COMPLETED" || !pickupReservation.saleId) {
    throw new AppError("Reserva para retirada ainda nao concluida.", 422);
  }

  return issueFiscalDocument({
    branchId,
    sourceType: "PICKUP_RESERVATION",
    sourceId: pickupReservation.id,
    saleId: pickupReservation.saleId,
    issuedByUserId,
    documentType,
    additionalInformation,
    duplicateMessage: "Documento fiscal ja emitido para esta reserva.",
  });
}

export async function previewPickupReservationFiscalDocument(
  pickupReservationId: string,
  documentType: FiscalDocumentType,
  branchId: string,
  additionalInformation: string | null,
) {
  const pickupReservation = await getPickupReservationById(
    pickupReservationId,
    db,
    { branchId },
  );

  if (!pickupReservation) {
    throw new AppError("Reserva para retirada nao encontrada.", 404);
  }

  if (pickupReservation.status !== "COMPLETED" || !pickupReservation.saleId) {
    throw new AppError("Reserva para retirada ainda nao concluida.", 422);
  }

  return previewFiscalDocument({
    branchId,
    sourceType: "PICKUP_RESERVATION",
    sourceId: pickupReservation.id,
    saleId: pickupReservation.saleId,
    documentType,
    additionalInformation,
  });
}

type IssueFiscalDocumentInput = {
  branchId: string;
  sourceType: FiscalDocumentSourceType;
  sourceId: string;
  saleId: string;
  issuedByUserId: string;
  documentType: FiscalDocumentType;
  additionalInformation: string | null;
  duplicateMessage: string;
};

type FiscalDocumentRequestInput = Omit<
  IssueFiscalDocumentInput,
  "duplicateMessage" | "issuedByUserId"
>;

async function issueFiscalDocument(input: IssueFiscalDocumentInput) {
  const fiscalDocument = await db.transaction(async (transaction) => {
    if (
      input.sourceType === "SALE" &&
      (await saleHasLinkedOperation(transaction, input.saleId))
    ) {
      throw new AppError(
        "Venda gerada por envio ou retirada deve emitir NF-e pelo fluxo de origem.",
        409,
      );
    }

    const existing = await findFiscalDocumentBySource(
      transaction,
      input.sourceType,
      input.sourceId,
      input.documentType,
    );

    if (existing && existing.status !== "REJECTED") {
      throw new AppError(input.duplicateMessage, 409);
    }

    const blockingFiscalDocument = await findBlockingFiscalDocumentBySale(
      transaction,
      input.saleId,
      input.documentType,
    );

    if (blockingFiscalDocument) {
      throw new AppError(
        "Documento fiscal ja emitido para esta venda operacional.",
        409,
      );
    }

    const { fiscalSettings, requestPayload } = await fiscalDocumentRequest(
      input,
      transaction,
    );
    ensureFiscalSettingsCanIssue(fiscalSettings);
    const provider = makeFiscalProviderByName(fiscalSettings.provider);

    ensureFiscalReadiness(requestPayload, fiscalSettings.provider);
    const result = await provider.issue(requestPayload);

    const fiscalDocumentInput = {
      branchId: input.branchId,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      documentType: input.documentType,
      provider: result.provider,
      environment: fiscalSettings.environment,
      status: result.status,
      accessKey: result.accessKey,
      providerReference: result.providerReference,
      number: result.number,
      series: result.series,
      xmlUrl: result.xmlUrl,
      pdfUrl: result.pdfUrl,
      rejectionReason: result.rejectionReason,
      requestPayload,
      responsePayload: result.responsePayload,
      issuedByUserId: input.issuedByUserId,
    };

    if (existing) {
      return replaceFiscalDocumentIssue(
        transaction,
        existing.id,
        fiscalDocumentInput,
      );
    }

    return insertFiscalDocument(transaction, fiscalDocumentInput);
  });

  return {
    code: 201,
    status: "success",
    data: fiscalDocument,
  };
}

async function previewFiscalDocument(input: FiscalDocumentRequestInput) {
  const { fiscalSettings, requestPayload } = await fiscalDocumentRequest(
    input,
    db,
  );
  const provider = makeFiscalProviderByName(fiscalSettings.provider);

  ensureFiscalReadiness(requestPayload, fiscalSettings.provider);

  return provider.preview(requestPayload);
}

async function fiscalDocumentRequest(
  input: FiscalDocumentRequestInput,
  database: typeof db | Parameters<typeof getSaleById>[1],
) {
  const sale = await getSaleById(input.saleId, database, {
    branchId: input.branchId,
  });

  if (!sale) {
    throw new AppError("Venda informada nao encontrada.", 404);
  }

  if (sale.status !== "COMPLETED") {
    throw new AppError("Conclua a venda antes de emitir NF-e.", 422);
  }

  const fiscalSettings = await currentFiscalSettings(input.branchId);

  return {
    fiscalSettings,
    requestPayload: {
      reference: fiscalReference(input.sourceType, input.sourceId),
      documentType: input.documentType,
      environment: fiscalSettings.environment,
      companyCnpj: fiscalSettings.companyCnpj,
      additionalInformation: input.additionalInformation,
      defaultNatureOperation: fiscalSettings.defaultNatureOperation,
      defaultSaleCfop: fiscalSettings.defaultSaleCfop,
      defaultIcmsCst: fiscalSettings.defaultIcmsCst,
      defaultPisCst: fiscalSettings.defaultPisCst,
      defaultCofinsCst: fiscalSettings.defaultCofinsCst,
      sale,
    },
  };
}

function ensureFiscalSettingsCanIssue(
  settings: Awaited<ReturnType<typeof currentFiscalSettings>>,
) {
  if (settings.environment !== "PRODUCTION" || settings.allowProduction) {
    return;
  }

  throw new AppError(
    "Emissao em producao bloqueada pela configuracao fiscal.",
    422,
  );
}

function fiscalReference(sourceType: FiscalDocumentSourceType, sourceId: string) {
  return `${sourceType}${sourceId}`.replace(/[^a-zA-Z0-9]/g, "");
}

type FiscalSale = IssueFiscalDocumentInput extends never
  ? never
  : NonNullable<Awaited<ReturnType<typeof getSaleById>>>;

function ensureFiscalReadiness(
  request: FiscalIssueRequest,
  provider: Awaited<ReturnType<typeof currentFiscalSettings>>["provider"],
) {
  if (provider !== "FOCUS") {
    return;
  }

  const errors = fiscalReadinessErrors(request);

  if (errors.length > 0) {
    throw new AppError(
      "Dados fiscais incompletos para emissao da NF-e.",
      422,
      errors,
    );
  }
}

function fiscalReadinessErrors(request: FiscalIssueRequest): AppErrorDetail[] {
  return [
    ...requiredClientFiscalFields(request.sale),
    ...requiredFiscalSettingsFields(request),
    ...invalidBillingFields(request.sale),
    ...request.sale.items.flatMap((item, index) =>
      requiredItemFiscalFields(item, index + 1),
    ),
  ];
}

function requiredFiscalSettingsFields(
  request: FiscalIssueRequest,
): AppErrorDetail[] {
  const fieldChecks: Array<[string, unknown, string]> = [
    [
      "defaultNatureOperation",
      request.defaultNatureOperation,
      "Natureza da operacao padrao e obrigatoria.",
    ],
    [
      "defaultSaleCfop",
      request.defaultSaleCfop,
      "CFOP padrao de venda e obrigatorio.",
    ],
    [
      "defaultIcmsCst",
      request.defaultIcmsCst,
      "CST/CSOSN ICMS padrao e obrigatorio.",
    ],
    [
      "defaultPisCst",
      request.defaultPisCst,
      "CST PIS padrao e obrigatorio.",
    ],
    [
      "defaultCofinsCst",
      request.defaultCofinsCst,
      "CST COFINS padrao e obrigatorio.",
    ],
  ];

  return [
    ...missingFieldDetails(fieldChecks),
    ...invalidFiscalSettingsFields(request),
  ];
}

function invalidFiscalSettingsFields(
  request: FiscalIssueRequest,
): AppErrorDetail[] {
  const fieldChecks: Array<[string, unknown, RegExp, string]> = [
    [
      "defaultSaleCfop",
      request.defaultSaleCfop,
      /^\d{4}$/,
      "CFOP padrao de venda deve conter 4 digitos.",
    ],
    [
      "defaultIcmsCst",
      request.defaultIcmsCst,
      /^\d{2,3}$/,
      "CST/CSOSN ICMS padrao deve conter 2 ou 3 digitos.",
    ],
    [
      "defaultPisCst",
      request.defaultPisCst,
      /^\d{2}$/,
      "CST PIS padrao deve conter 2 digitos.",
    ],
    [
      "defaultCofinsCst",
      request.defaultCofinsCst,
      /^\d{2}$/,
      "CST COFINS padrao deve conter 2 digitos.",
    ],
  ];

  return invalidFieldDetails(fieldChecks);
}

function requiredClientFiscalFields(
  sale: FiscalIssueRequest["sale"],
): AppErrorDetail[] {
  const documentFieldByPersonType: Record<string, string | null> = {
    ES: null,
    PF: "clientDocument",
    PJ: "clientDocument",
  };
  const fieldChecks: Array<[string, unknown, string]> = [
    ["clientName", sale.clientName, "Nome do cliente e obrigatorio."],
    [
      documentFieldByPersonType[sale.clientPersonType ?? "PF"] ??
        "clientDocument",
      documentFieldByPersonType[sale.clientPersonType ?? "PF"]
        ? sale.clientDocument
        : true,
      "CPF/CNPJ do cliente e obrigatorio.",
    ],
    [
      "clientAddressStreet",
      sale.clientAddressStreet,
      "Logradouro do cliente e obrigatorio.",
    ],
    [
      "clientAddressNumber",
      sale.clientAddressNumber,
      "Numero do endereco do cliente e obrigatorio.",
    ],
    [
      "clientAddressDistrict",
      sale.clientAddressDistrict,
      "Bairro do cliente e obrigatorio.",
    ],
    [
      "clientAddressCity",
      sale.clientAddressCity,
      "Cidade do cliente e obrigatoria.",
    ],
    [
      "clientAddressState",
      sale.clientAddressState,
      "UF do cliente e obrigatoria.",
    ],
    [
      "clientAddressZipCode",
      sale.clientAddressZipCode,
      "CEP do cliente e obrigatorio.",
    ],
    [
      "clientStateRegistration",
      sale.clientStateRegistrationIndicator === "1"
        ? sale.clientStateRegistration
        : true,
      "Inscricao estadual do cliente e obrigatoria para contribuinte ICMS.",
    ],
  ];

  return [
    ...missingFieldDetails(fieldChecks),
    ...invalidClientFiscalFields(sale),
  ];
}

function invalidClientFiscalFields(
  sale: FiscalIssueRequest["sale"],
): AppErrorDetail[] {
  const documentPatternsByPersonType: Record<string, RegExp | null> = {
    ES: null,
    PF: /^\d{11}$/,
    PJ: /^\d{14}$/,
  };
  const documentPattern =
    documentPatternsByPersonType[sale.clientPersonType ?? "PF"] ?? null;
  const fieldChecks: Array<[string, unknown, RegExp | null, string]> = [
    [
      "clientDocument",
      fiscalDigits(sale.clientDocument),
      documentPattern,
      "CPF/CNPJ do cliente deve conter 11 ou 14 digitos.",
    ],
    [
      "clientAddressState",
      sale.clientAddressState,
      /^[A-Z]{2}$/i,
      "UF do cliente deve conter 2 letras.",
    ],
    [
      "clientAddressZipCode",
      fiscalDigits(sale.clientAddressZipCode),
      /^\d{8}$/,
      "CEP do cliente deve conter 8 digitos.",
    ],
  ];

  return invalidFieldDetails(fieldChecks);
}

function invalidBillingFields(
  sale: FiscalIssueRequest["sale"],
): AppErrorDetail[] {
  const firstBillingDueDate = saleFirstBillingDueDate(sale);

  if (!hasBillingPayment(sale) || !firstBillingDueDate) {
    return [];
  }

  if (firstBillingDueDate > fiscalBrazilDate()) {
    return [];
  }

  return [
    {
      field: "billingDueDate",
      message:
        "Vencimento do boleto/fatura deve ser posterior a data de emissao da NF-e.",
    },
  ];
}

function hasBillingPayment(sale: FiscalIssueRequest["sale"]) {
  const payments = sale.payments.length
    ? sale.payments
    : [{ paymentMethodCode: sale.paymentMethodCode }];

  return payments.some(
    (payment) => paymentFiscalCode(payment.paymentMethodCode) === "15",
  );
}

function saleFirstBillingDueDate(sale: FiscalIssueRequest["sale"]) {
  return (
    sale.paymentInstallments
      .map((installment) => fiscalDateOnly(installment.dueDate))
      .filter((date): date is string => Boolean(date))
      .sort()[0] ??
    fiscalDateOnly(sale.billingDueDate) ??
    fiscalDateOnly(sale.billingIssueDate)
  );
}

function paymentFiscalCode(paymentMethodCode: string) {
  const paymentCodes: Record<string, string> = {
    BOLETO: "15",
    CASH: "01",
    CREDIT: "03",
    DEBIT: "04",
    PIX: "20",
  };

  return paymentCodes[paymentMethodCode] ?? "99";
}

function fiscalDateOnly(value?: string | null) {
  return value?.slice(0, 10) || null;
}

function fiscalBrazilDate(date = new Date()) {
  const brazilOffsetHours = 3;

  return new Date(date.getTime() - brazilOffsetHours * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

function requiredItemFiscalFields(
  item: FiscalIssueRequest["sale"]["items"][number],
  position: number,
): AppErrorDetail[] {
  const fieldChecks: Array<[string, unknown, string]> = [
    [
      `items.${position}.productNcm`,
      item.productNcm,
      `NCM do item ${position} e obrigatorio.`,
    ],
    [
      `items.${position}.productOrigin`,
      item.productOrigin,
      `Origem fiscal do item ${position} e obrigatoria.`,
    ],
  ];

  return [
    ...missingFieldDetails(fieldChecks),
    ...invalidItemFiscalFields(item, position),
  ];
}

function missingFieldDetails(fieldChecks: Array<[string, unknown, string]>) {
  return fieldChecks
    .filter(([, value]) => !value)
    .map(([field, _value, message]) => ({ field, message }));
}

function invalidItemFiscalFields(
  item: FiscalIssueRequest["sale"]["items"][number],
  position: number,
): AppErrorDetail[] {
  const fieldChecks: Array<[string, unknown, RegExp, string]> = [
    [
      `items.${position}.productNcm`,
      item.productNcm,
      /^\d{8}$/,
      `NCM do item ${position} deve conter 8 digitos.`,
    ],
    [
      `items.${position}.productOrigin`,
      item.productOrigin,
      /^[0-8]$/,
      `Origem fiscal do item ${position} deve estar entre 0 e 8.`,
    ],
  ];

  return invalidFieldDetails(fieldChecks);
}

function invalidFieldDetails(
  fieldChecks: Array<[string, unknown, RegExp | null, string]>,
) {
  return fieldChecks
    .filter(([_, value, pattern]) =>
      Boolean(value) && pattern ? !pattern.test(String(value)) : false,
    )
    .map(([field, _value, _pattern, message]) => ({ field, message }));
}

function fiscalDigits(value: string | null) {
  const normalized = value?.replace(/\D/g, "");
  return normalized || null;
}
