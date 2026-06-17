import { db } from "../../database/knex.js";
import { makeFiscalProviderByName } from "../../integrations/fiscal/fiscal-provider-factory.js";
import { currentFiscalSettings } from "../fiscal-settings/fiscal-settings.controller.js";
import {
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
import { getSaleById } from "../../models/sales/sales.model.js";
import { getShippingOrderById } from "../../models/shipping-orders/shipping-orders.model.js";
import { AppError, type AppErrorDetail } from "../../shared/errors/app-error.js";
import type { FiscalDocumentType } from "../../shared/fiscal/fiscal-types.js";

export async function indexFiscalDocuments() {
  return {
    code: 200,
    status: "success",
    data: await listFiscalDocuments(),
  };
}

export async function showFiscalDocument(id: string) {
  const fiscalDocument = await getFiscalDocumentById(id);

  if (!fiscalDocument) {
    throw new AppError("Documento fiscal nao encontrado.", 404);
  }

  return {
    code: 200,
    status: "success",
    data: fiscalDocument,
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

export async function syncFiscalDocument(id: string) {
  const fiscalDocument = await getFiscalDocumentById(id);

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

  const provider = makeFiscalProviderByName(fiscalDocument.provider);
  const result = await provider.check({
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
    rejectionReason: result.rejectionReason,
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
) {
  const fiscalDocument = await getFiscalDocumentById(id);

  if (!fiscalDocument) {
    throw new AppError("Documento fiscal nao encontrado.", 404);
  }

  if (!fiscalDocument.providerReference) {
    throw new AppError("Documento fiscal sem referencia do provedor.", 422);
  }

  if (fiscalDocument.status !== "AUTHORIZED") {
    throw new AppError("Somente nota autorizada pode ser cancelada.", 422);
  }

  const provider = makeFiscalProviderByName(fiscalDocument.provider);
  const result = await provider.cancel({
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
) {
  const sale = await getSaleById(saleId);

  if (!sale) {
    throw new AppError("Venda informada nao encontrada.", 404);
  }

  if (sale.status === "CANCELLED") {
    throw new AppError("Venda cancelada nao pode emitir NF-e.", 422);
  }

  return issueFiscalDocument({
    sourceType: "SALE",
    sourceId: sale.id,
    saleId: sale.id,
    issuedByUserId,
    documentType,
    duplicateMessage: "Documento fiscal ja emitido para esta venda.",
  });
}

export async function issueShippingOrderFiscalDocument(
  shippingOrderId: string,
  issuedByUserId: string,
  documentType: FiscalDocumentType,
) {
  const shippingOrder = await getShippingOrderById(shippingOrderId);

  if (!shippingOrder) {
    throw new AppError("Pedido para envio nao encontrado.", 404);
  }

  if (shippingOrder.status !== "COMPLETED" || !shippingOrder.saleId) {
    throw new AppError("Pedido para envio ainda nao concluido.", 422);
  }

  return issueFiscalDocument({
    sourceType: "SHIPPING_ORDER",
    sourceId: shippingOrder.id,
    saleId: shippingOrder.saleId,
    issuedByUserId,
    documentType,
    duplicateMessage: "Documento fiscal ja emitido para este pedido.",
  });
}

export async function issuePickupReservationFiscalDocument(
  pickupReservationId: string,
  issuedByUserId: string,
  documentType: FiscalDocumentType,
) {
  const pickupReservation = await getPickupReservationById(pickupReservationId);

  if (!pickupReservation) {
    throw new AppError("Reserva para retirada nao encontrada.", 404);
  }

  if (pickupReservation.status !== "COMPLETED" || !pickupReservation.saleId) {
    throw new AppError("Reserva para retirada ainda nao concluida.", 422);
  }

  return issueFiscalDocument({
    sourceType: "PICKUP_RESERVATION",
    sourceId: pickupReservation.id,
    saleId: pickupReservation.saleId,
    issuedByUserId,
    documentType,
    duplicateMessage: "Documento fiscal ja emitido para esta reserva.",
  });
}

type IssueFiscalDocumentInput = {
  sourceType: FiscalDocumentSourceType;
  sourceId: string;
  saleId: string;
  issuedByUserId: string;
  documentType: FiscalDocumentType;
  duplicateMessage: string;
};

async function issueFiscalDocument(input: IssueFiscalDocumentInput) {
  const fiscalDocument = await db.transaction(async (transaction) => {
    const sale = await getSaleById(input.saleId, transaction);

    if (!sale) {
      throw new AppError("Venda informada nao encontrada.", 404);
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

    const fiscalSettings = await currentFiscalSettings();
    ensureFiscalSettingsCanIssue(fiscalSettings);
    const provider = makeFiscalProviderByName(fiscalSettings.provider);
    const requestPayload = {
      reference: fiscalReference(input.sourceType, input.sourceId),
      documentType: input.documentType,
      environment: fiscalSettings.environment,
      companyCnpj: fiscalSettings.companyCnpj,
      sale,
    };
    ensureFiscalReadiness(requestPayload.sale, fiscalSettings.provider);
    const result = await provider.issue(requestPayload);

    const fiscalDocumentInput = {
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
  sale: FiscalSale,
  provider: Awaited<ReturnType<typeof currentFiscalSettings>>["provider"],
) {
  if (provider !== "FOCUS") {
    return;
  }

  const errors = fiscalReadinessErrors(sale);

  if (errors.length > 0) {
    throw new AppError(
      "Dados fiscais incompletos para emissao da NF-e.",
      422,
      errors,
    );
  }
}

function fiscalReadinessErrors(sale: FiscalSale): AppErrorDetail[] {
  return [
    ...requiredClientFiscalFields(sale),
    ...sale.items.flatMap((item, index) =>
      requiredItemFiscalFields(item, index + 1),
    ),
  ];
}

function requiredClientFiscalFields(sale: FiscalSale): AppErrorDetail[] {
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
  ];

  return [
    ...missingFieldDetails(fieldChecks),
    ...invalidClientFiscalFields(sale),
  ];
}

function invalidClientFiscalFields(sale: FiscalSale): AppErrorDetail[] {
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

function requiredItemFiscalFields(
  item: FiscalSale["items"][number],
  position: number,
): AppErrorDetail[] {
  const fieldChecks: Array<[string, unknown, string]> = [
    [
      `items.${position}.productNcm`,
      item.productNcm,
      `NCM do item ${position} e obrigatorio.`,
    ],
    [
      `items.${position}.productCfop`,
      item.productCfop,
      `CFOP do item ${position} e obrigatorio.`,
    ],
    [
      `items.${position}.productOrigin`,
      item.productOrigin,
      `Origem fiscal do item ${position} e obrigatoria.`,
    ],
    [
      `items.${position}.productIcmsCst`,
      item.productIcmsCst,
      `CST/CSOSN ICMS do item ${position} e obrigatorio.`,
    ],
    [
      `items.${position}.productPisCst`,
      item.productPisCst,
      `CST PIS do item ${position} e obrigatorio.`,
    ],
    [
      `items.${position}.productCofinsCst`,
      item.productCofinsCst,
      `CST COFINS do item ${position} e obrigatorio.`,
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
  item: FiscalSale["items"][number],
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
      `items.${position}.productCfop`,
      item.productCfop,
      /^\d{4}$/,
      `CFOP do item ${position} deve conter 4 digitos.`,
    ],
    [
      `items.${position}.productOrigin`,
      item.productOrigin,
      /^[0-8]$/,
      `Origem fiscal do item ${position} deve estar entre 0 e 8.`,
    ],
    [
      `items.${position}.productIcmsCst`,
      item.productIcmsCst,
      /^\d{2,3}$/,
      `CST/CSOSN ICMS do item ${position} deve conter 2 ou 3 digitos.`,
    ],
    [
      `items.${position}.productPisCst`,
      item.productPisCst,
      /^\d{2}$/,
      `CST PIS do item ${position} deve conter 2 digitos.`,
    ],
    [
      `items.${position}.productCofinsCst`,
      item.productCofinsCst,
      /^\d{2}$/,
      `CST COFINS do item ${position} deve conter 2 digitos.`,
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
