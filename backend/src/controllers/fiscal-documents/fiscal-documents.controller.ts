import { env } from "../../config/env.js";
import { db } from "../../database/knex.js";
import { makeFiscalProvider } from "../../integrations/fiscal/fiscal-provider-factory.js";
import type { FiscalDocumentType } from "../../integrations/fiscal/fiscal-provider.js";
import {
  findFiscalDocumentBySource,
  getFiscalDocumentById,
  insertFiscalDocument,
  listFiscalDocuments,
  type FiscalDocumentSourceType,
} from "../../models/fiscal-documents/fiscal-documents.model.js";
import { getPickupReservationById } from "../../models/pickup-reservations/pickup-reservations.model.js";
import { getSaleById } from "../../models/sales/sales.model.js";
import { getShippingOrderById } from "../../models/shipping-orders/shipping-orders.model.js";
import { AppError } from "../../shared/errors/app-error.js";

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

export async function issueSaleFiscalDocument(
  saleId: string,
  issuedByUserId: string,
  documentType: FiscalDocumentType,
) {
  const sale = await getSaleById(saleId);

  if (!sale) {
    throw new AppError("Venda informada nao encontrada.", 404);
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
