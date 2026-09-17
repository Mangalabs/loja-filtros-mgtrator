import type { Knex } from "knex";
import { db } from "../../database/knex.js";
import type {
  FiscalDocumentType,
  FiscalEnvironment,
  FiscalProviderName,
  FiscalProviderStatus,
} from "../../shared/fiscal/fiscal-types.js";

export type FiscalDocumentSourceType =
  | "SALE"
  | "SHIPPING_ORDER"
  | "PICKUP_RESERVATION"
  | "MANUAL_NFE";
export type FiscalDocumentStatus =
  | "PENDING"
  | "PROCESSING"
  | "AUTHORIZED"
  | "REJECTED"
  | "CANCELLED";

export type FiscalDocument = {
  id: string;
  branchId: string | null;
  branchName: string | null;
  sourceType: FiscalDocumentSourceType;
  sourceId: string;
  documentType: FiscalDocumentType;
  provider: FiscalProviderName;
  environment: FiscalEnvironment;
  status: FiscalDocumentStatus;
  accessKey: string | null;
  providerReference: string | null;
  number: number | null;
  series: number | null;
  xmlUrl: string | null;
  pdfUrl: string | null;
  rejectionReason: string | null;
  requestPayload: Record<string, unknown> | null;
  responsePayload: Record<string, unknown> | null;
  issuedByUserId: string;
  issuedByUserName: string;
  issuedAt: Date | null;
  cancelledByUserId: string | null;
  cancelledByUserName: string | null;
  cancelledAt: Date | null;
  cancellationReason: string | null;
  correctionLetters: FiscalDocumentCorrectionLetter[];
  createdAt: Date;
  updatedAt: Date;
};

export type FiscalDocumentCorrectionLetter = {
  id: string;
  fiscalDocumentId: string;
  correctionText: string;
  responsePayload: Record<string, unknown>;
  createdByUserId: string;
  createdByUserName: string;
  createdAt: Date;
};

export type FiscalDocumentCorrectionLetterInput = {
  fiscalDocumentId: string;
  correctionText: string;
  responsePayload: Record<string, unknown>;
  createdByUserId: string;
};

export type FiscalDocumentInput = {
  branchId: string;
  sourceType: FiscalDocumentSourceType;
  sourceId: string;
  documentType: FiscalDocumentType;
  provider: FiscalProviderName;
  environment: FiscalEnvironment;
  status: FiscalProviderStatus;
  accessKey: string | null;
  providerReference: string | null;
  number: number | null;
  series: number | null;
  xmlUrl: string | null;
  pdfUrl: string | null;
  rejectionReason: string | null;
  requestPayload: Record<string, unknown>;
  responsePayload: Record<string, unknown>;
  issuedByUserId: string;
};

export type FiscalDocumentUpdateInput = {
  status: FiscalDocumentStatus;
  accessKey: string | null;
  providerReference: string;
  number: number | null;
  series: number | null;
  xmlUrl: string | null;
  pdfUrl: string | null;
  rejectionReason: string | null;
  responsePayload: Record<string, unknown>;
  cancelledByUserId?: string;
  cancellationReason?: string;
};

const fiscalDocumentColumns = [
  "fiscal_documents.id",
  "fiscal_documents.branch_id as branchId",
  "branches.name as branchName",
  "fiscal_documents.source_type as sourceType",
  "fiscal_documents.source_id as sourceId",
  "fiscal_documents.document_type as documentType",
  "fiscal_documents.provider",
  "fiscal_documents.environment",
  "fiscal_documents.status",
  "fiscal_documents.access_key as accessKey",
  "fiscal_documents.provider_reference as providerReference",
  "fiscal_documents.number",
  "fiscal_documents.series",
  "fiscal_documents.xml_url as xmlUrl",
  "fiscal_documents.pdf_url as pdfUrl",
  "fiscal_documents.rejection_reason as rejectionReason",
  "fiscal_documents.request_payload as requestPayload",
  "fiscal_documents.response_payload as responsePayload",
  "fiscal_documents.issued_by_user_id as issuedByUserId",
  "issued_users.name as issuedByUserName",
  "fiscal_documents.issued_at as issuedAt",
  "fiscal_documents.cancelled_by_user_id as cancelledByUserId",
  "cancelled_users.name as cancelledByUserName",
  "fiscal_documents.cancelled_at as cancelledAt",
  "fiscal_documents.cancellation_reason as cancellationReason",
  "fiscal_documents.created_at as createdAt",
  "fiscal_documents.updated_at as updatedAt",
];

export async function listFiscalDocuments(filters: {
  branchId: string;
}): Promise<FiscalDocument[]> {
  const documents = await fiscalDocumentQuery(db)
    .where("fiscal_documents.branch_id", filters.branchId)
    .orderBy("fiscal_documents.created_at", "desc");

  return withFiscalDocumentCorrectionLetters(db, documents);
}

export async function getFiscalDocumentById(
  id: string,
  filters?: { branchId?: string | null },
): Promise<FiscalDocument | undefined> {
  const fiscalDocument = await fiscalDocumentQuery(db)
    .where("fiscal_documents.id", id)
    .modify((query) => {
      if (filters?.branchId) {
        query.where("fiscal_documents.branch_id", filters.branchId);
      }
    })
    .first();

  return fiscalDocument
    ? (await withFiscalDocumentCorrectionLetters(db, [fiscalDocument]))[0]
    : undefined;
}

export async function findFiscalDocumentBySource(
  transaction: Knex.Transaction,
  sourceType: FiscalDocumentSourceType,
  sourceId: string,
  documentType: FiscalDocumentType,
): Promise<FiscalDocument | undefined> {
  const fiscalDocument = await fiscalDocumentQuery(transaction)
    .where({
      "fiscal_documents.source_type": sourceType,
      "fiscal_documents.source_id": sourceId,
      "fiscal_documents.document_type": documentType,
    })
    .first();

  return fiscalDocument
    ? (await withFiscalDocumentCorrectionLetters(transaction, [fiscalDocument]))[0]
    : undefined;
}

export async function findBlockingFiscalDocumentBySale(
  transaction: Knex.Transaction,
  saleId: string,
  documentType: FiscalDocumentType,
): Promise<FiscalDocument | undefined> {
  const fiscalDocument = await fiscalDocumentQuery(transaction)
    .where("fiscal_documents.document_type", documentType)
    .whereNot("fiscal_documents.status", "REJECTED")
    .where((query) => {
      query
        .where({
          "fiscal_documents.source_type": "SALE",
          "fiscal_documents.source_id": saleId,
        })
        .orWhereExists(function linkedShippingOrder() {
          this.select(transaction.raw("1"))
            .from("shipping_orders")
            .whereRaw("shipping_orders.id = fiscal_documents.source_id")
            .where("fiscal_documents.source_type", "SHIPPING_ORDER")
            .where("shipping_orders.sale_id", saleId);
        })
        .orWhereExists(function linkedPickupReservation() {
          this.select(transaction.raw("1"))
            .from("pickup_reservations")
            .whereRaw("pickup_reservations.id = fiscal_documents.source_id")
            .where("fiscal_documents.source_type", "PICKUP_RESERVATION")
            .where("pickup_reservations.sale_id", saleId);
        });
    })
    .first();

  return fiscalDocument
    ? (await withFiscalDocumentCorrectionLetters(transaction, [fiscalDocument]))[0]
    : undefined;
}

export async function insertFiscalDocument(
  transaction: Knex.Transaction,
  input: FiscalDocumentInput,
): Promise<FiscalDocument> {
  const [created] = await transaction("fiscal_documents")
    .insert({
      branch_id: input.branchId,
      source_type: input.sourceType,
      source_id: input.sourceId,
      document_type: input.documentType,
      provider: input.provider,
      environment: input.environment,
      status: input.status,
      access_key: input.accessKey,
      provider_reference: input.providerReference,
      number: input.number,
      series: input.series,
      xml_url: input.xmlUrl,
      pdf_url: input.pdfUrl,
      rejection_reason: input.rejectionReason,
      request_payload: input.requestPayload,
      response_payload: input.responsePayload,
      issued_by_user_id: input.issuedByUserId,
      issued_at: transaction.fn.now(),
    })
    .returning("id");

  const fiscalDocument = await fiscalDocumentQuery(transaction)
    .where("fiscal_documents.id", created.id)
    .first();

  if (!fiscalDocument) {
    throw new Error("Fiscal document was not found after creation");
  }

  return (await withFiscalDocumentCorrectionLetters(transaction, [fiscalDocument]))[0];
}

export async function replaceFiscalDocumentIssue(
  transaction: Knex.Transaction,
  id: string,
  input: FiscalDocumentInput,
): Promise<FiscalDocument> {
  const [updated] = await transaction("fiscal_documents")
    .where("id", id)
    .update({
      provider: input.provider,
      branch_id: input.branchId,
      environment: input.environment,
      status: input.status,
      access_key: input.accessKey,
      provider_reference: input.providerReference,
      number: input.number,
      series: input.series,
      xml_url: input.xmlUrl,
      pdf_url: input.pdfUrl,
      rejection_reason: input.rejectionReason,
      request_payload: input.requestPayload,
      response_payload: input.responsePayload,
      issued_by_user_id: input.issuedByUserId,
      issued_at: transaction.fn.now(),
      updated_at: transaction.fn.now(),
    })
    .returning("id");

  const fiscalDocument = await fiscalDocumentQuery(transaction)
    .where("fiscal_documents.id", updated.id)
    .first();

  if (!fiscalDocument) {
    throw new Error("Fiscal document was not found after replacement");
  }

  return (await withFiscalDocumentCorrectionLetters(transaction, [fiscalDocument]))[0];
}

export async function updateFiscalDocumentStatus(
  id: string,
  input: FiscalDocumentUpdateInput,
): Promise<FiscalDocument> {
  const [updated] = await db("fiscal_documents")
    .where("id", id)
    .update({
      status: input.status,
      access_key: input.accessKey,
      provider_reference: input.providerReference,
      number: input.number,
      series: input.series,
      xml_url: input.xmlUrl,
      pdf_url: input.pdfUrl,
      rejection_reason: input.rejectionReason,
      response_payload: input.responsePayload,
      cancelled_by_user_id: input.cancelledByUserId ?? null,
      cancelled_at:
        input.status === "CANCELLED" && input.cancelledByUserId
          ? db.fn.now()
          : null,
      cancellation_reason: input.cancellationReason ?? null,
      updated_at: db.fn.now(),
    })
    .returning("id");

  const fiscalDocument = await fiscalDocumentQuery(db)
    .where("fiscal_documents.id", updated.id)
    .first();

  if (!fiscalDocument) {
    throw new Error("Fiscal document was not found after update");
  }

  return (await withFiscalDocumentCorrectionLetters(db, [fiscalDocument]))[0];
}

export async function insertFiscalDocumentCorrectionLetter(
  input: FiscalDocumentCorrectionLetterInput,
): Promise<FiscalDocumentCorrectionLetter> {
  const [created] = await db("fiscal_document_correction_letters")
    .insert({
      fiscal_document_id: input.fiscalDocumentId,
      correction_text: input.correctionText,
      response_payload: input.responsePayload,
      created_by_user_id: input.createdByUserId,
    })
    .returning("id");

  const correctionLetter = await fiscalDocumentCorrectionLetterQuery(db)
    .where("fiscal_document_correction_letters.id", created.id)
    .first();

  if (!correctionLetter) {
    throw new Error("Fiscal correction letter was not found after creation");
  }

  return correctionLetter;
}

function fiscalDocumentQuery(database: Knex | Knex.Transaction) {
  return database("fiscal_documents")
    .leftJoin("branches", "branches.id", "fiscal_documents.branch_id")
    .join(
      "users as issued_users",
      "issued_users.id",
      "fiscal_documents.issued_by_user_id",
    )
    .leftJoin(
      "users as cancelled_users",
      "cancelled_users.id",
      "fiscal_documents.cancelled_by_user_id",
    )
    .select<FiscalDocument[]>(fiscalDocumentColumns);
}

function fiscalDocumentCorrectionLetterQuery(
  database: Knex | Knex.Transaction,
) {
  return database("fiscal_document_correction_letters")
    .join(
      "users",
      "users.id",
      "fiscal_document_correction_letters.created_by_user_id",
    )
    .select<FiscalDocumentCorrectionLetter[]>([
      "fiscal_document_correction_letters.id",
      "fiscal_document_correction_letters.fiscal_document_id as fiscalDocumentId",
      "fiscal_document_correction_letters.correction_text as correctionText",
      "fiscal_document_correction_letters.response_payload as responsePayload",
      "fiscal_document_correction_letters.created_by_user_id as createdByUserId",
      "users.name as createdByUserName",
      "fiscal_document_correction_letters.created_at as createdAt",
    ]);
}

async function withFiscalDocumentCorrectionLetters(
  database: Knex | Knex.Transaction,
  fiscalDocuments: FiscalDocument[],
) {
  if (fiscalDocuments.length === 0) {
    return [];
  }

  const documentIds = fiscalDocuments.map((fiscalDocument) => fiscalDocument.id);
  const correctionLetters = await fiscalDocumentCorrectionLetterQuery(database)
    .whereIn("fiscal_document_correction_letters.fiscal_document_id", documentIds)
    .orderBy("fiscal_document_correction_letters.created_at", "desc");

  return fiscalDocuments.map((fiscalDocument) => ({
    ...fiscalDocument,
    correctionLetters: correctionLetters.filter(
      (correctionLetter) =>
        correctionLetter.fiscalDocumentId === fiscalDocument.id,
    ),
  }));
}
