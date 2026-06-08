import { env } from "../../config/env.js";
import { db } from "../../database/knex.js";
import { makeFiscalProvider } from "../../integrations/fiscal/fiscal-provider-factory.js";
import type { FiscalDocumentType } from "../../integrations/fiscal/fiscal-provider.js";
import {
  findFiscalDocumentBySource,
  getFiscalDocumentById,
  insertFiscalDocument,
  listFiscalDocuments,
} from "../../models/fiscal-documents/fiscal-documents.model.js";
import { getSaleById } from "../../models/sales/sales.model.js";
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
  const fiscalDocument = await db.transaction(async (transaction) => {
    const sale = await getSaleById(saleId, transaction);

    if (!sale) {
      throw new AppError("Venda informada nao encontrada.", 404);
    }

    const existing = await findFiscalDocumentBySource(
      transaction,
      "SALE",
      saleId,
      documentType,
    );

    if (existing) {
      throw new AppError("Documento fiscal ja emitido para esta venda.", 409);
    }

    const provider = makeFiscalProvider();
    const requestPayload = {
      reference: fiscalReference("SALE", sale.id),
      documentType,
      environment: env.fiscal.environment,
      sale,
    };
    const result = await provider.issue(requestPayload);

    return insertFiscalDocument(transaction, {
      sourceType: "SALE",
      sourceId: sale.id,
      documentType,
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
      issuedByUserId,
    });
  });

  return {
    code: 201,
    status: "success",
    data: fiscalDocument,
  };
}

function fiscalReference(sourceType: "SALE", sourceId: string) {
  return `${sourceType}-${sourceId}`;
}
