import { env } from "../../config/env.js";
import { db } from "../../database/knex.js";
import {
  makeFiscalProvider,
  makeFiscalProviderByName,
} from "../../integrations/fiscal/fiscal-provider-factory.js";
import {
  findFiscalDocumentBySource,
  getFiscalDocumentById,
  insertFiscalDocument,
  listFiscalDocuments,
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

export async function syncFiscalDocument(id: string) {
  const fiscalDocument = await getFiscalDocumentById(id);

  if (!fiscalDocument) {
    throw new AppError("Documento fiscal nao encontrado.", 404);
  }

  if (fiscalDocument.status === "CANCELLED") {
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
    providerReference: fiscalDocument.providerReference,
  });
  const updated = await updateFiscalDocumentStatus(id, {
    status: result.status,
    accessKey: result.accessKey,
    providerReference: result.providerReference,
    number: result.number,
    series: result.series,
    xmlUrl: result.xmlUrl,
    pdfUrl: result.pdfUrl,
    rejectionReason: result.rejectionReason,
    responsePayload: result.responsePayload,
  });

  return {
    code: 200,
    status: "success",
    data: updated,
  };
}

export async function cancelFiscalDocument(id: string, reason: string) {
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
    providerReference: fiscalDocument.providerReference,
    reason,
  });
  const updated = await updateFiscalDocumentStatus(id, {
    status: fiscalCancellationStatus(fiscalDocument.status, result.status),
    accessKey: result.accessKey,
    providerReference: result.providerReference,
    number: result.number,
    series: result.series,
    xmlUrl: result.xmlUrl,
    pdfUrl: result.pdfUrl,
    rejectionReason: result.rejectionReason,
    responsePayload: result.responsePayload,
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

    if (existing) {
      throw new AppError(input.duplicateMessage, 409);
    }

    const provider = makeFiscalProvider();
    const requestPayload = {
      reference: fiscalReference(input.sourceType, input.sourceId),
      documentType: input.documentType,
      environment: env.fiscal.environment,
      sale,
    };
    ensureFiscalReadiness(requestPayload.sale);
    const result = await provider.issue(requestPayload);

    return insertFiscalDocument(transaction, {
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      documentType: input.documentType,
      provider: result.provider,
      environment: env.fiscal.environment,
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
    });
  });

  return {
    code: 201,
    status: "success",
    data: fiscalDocument,
  };
}

function fiscalReference(sourceType: FiscalDocumentSourceType, sourceId: string) {
  return `${sourceType}-${sourceId}`;
}

type FiscalSale = IssueFiscalDocumentInput extends never
  ? never
  : NonNullable<Awaited<ReturnType<typeof getSaleById>>>;

function ensureFiscalReadiness(sale: FiscalSale) {
  if (env.fiscal.provider !== "focus") {
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
    ["clientAddressState", sale.clientAddressState, "UF do cliente e obrigatoria."],
    [
      "clientAddressZipCode",
      sale.clientAddressZipCode,
      "CEP do cliente e obrigatorio.",
    ],
  ];

  return missingFieldDetails(fieldChecks);
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

  return missingFieldDetails(fieldChecks);
}

function missingFieldDetails(fieldChecks: Array<[string, unknown, string]>) {
  return fieldChecks
    .filter(([, value]) => !value)
    .map(([field, _value, message]) => ({ field, message }));
}
