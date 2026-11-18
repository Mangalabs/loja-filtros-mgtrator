import type { Knex } from "knex";
import { db } from "../../database/knex.js";
import type {
  FiscalEnvironment,
  FiscalProviderName,
  FiscalProviderStatus,
} from "../../shared/fiscal/fiscal-types.js";

export type ServiceFiscalDocument = {
  id: string;
  branchId: string;
  fiscalServiceId: string;
  fiscalServiceName: string;
  provider: FiscalProviderName;
  environment: FiscalEnvironment;
  status: FiscalProviderStatus;
  providerReference: string;
  protocol: string | null;
  accessKey: string | null;
  dpsSeries: number;
  dpsNumber: string;
  nfseNumber: string | null;
  xmlUrl: string | null;
  pdfUrl: string | null;
  rejectionReason: string | null;
  requestPayload: Record<string, unknown>;
  responsePayload: Record<string, unknown>;
  issuedByUserId: string;
  issuedByUserName: string;
  issuedAt: Date;
  authorizedAt: Date | null;
  cancellationReason: string | null;
  cancelledAt: Date | null;
  cancelledByUserId: string | null;
  cancelledByUserName: string | null;
  cancellationResponsePayload: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ServiceFiscalDocumentInput = {
  branchId: string;
  fiscalServiceId: string;
  provider: FiscalProviderName;
  environment: FiscalEnvironment;
  status: FiscalProviderStatus;
  providerReference: string;
  protocol: string | null;
  accessKey: string | null;
  dpsSeries: number;
  dpsNumber: number;
  nfseNumber: string | null;
  xmlUrl: string | null;
  pdfUrl: string | null;
  rejectionReason: string | null;
  requestPayload: Record<string, unknown>;
  responsePayload: Record<string, unknown>;
  issuedByUserId: string;
};

export type ServiceFiscalDocumentStatusInput = Pick<
  ServiceFiscalDocumentInput,
  | "status"
  | "providerReference"
  | "protocol"
  | "accessKey"
  | "nfseNumber"
  | "xmlUrl"
  | "pdfUrl"
  | "rejectionReason"
  | "responsePayload"
>;

const columns = [
  "service_fiscal_documents.id",
  "service_fiscal_documents.branch_id as branchId",
  "service_fiscal_documents.fiscal_service_id as fiscalServiceId",
  "fiscal_services.name as fiscalServiceName",
  "service_fiscal_documents.provider",
  "service_fiscal_documents.environment",
  "service_fiscal_documents.status",
  "service_fiscal_documents.provider_reference as providerReference",
  "service_fiscal_documents.protocol",
  "service_fiscal_documents.access_key as accessKey",
  "service_fiscal_documents.dps_series as dpsSeries",
  "service_fiscal_documents.dps_number as dpsNumber",
  "service_fiscal_documents.nfse_number as nfseNumber",
  "service_fiscal_documents.xml_url as xmlUrl",
  "service_fiscal_documents.pdf_url as pdfUrl",
  "service_fiscal_documents.rejection_reason as rejectionReason",
  "service_fiscal_documents.request_payload as requestPayload",
  "service_fiscal_documents.response_payload as responsePayload",
  "service_fiscal_documents.issued_by_user_id as issuedByUserId",
  "users.name as issuedByUserName",
  "service_fiscal_documents.issued_at as issuedAt",
  "service_fiscal_documents.authorized_at as authorizedAt",
  "service_fiscal_documents.cancellation_reason as cancellationReason",
  "service_fiscal_documents.cancelled_at as cancelledAt",
  "service_fiscal_documents.cancelled_by_user_id as cancelledByUserId",
  "cancellation_user.name as cancelledByUserName",
  "service_fiscal_documents.cancellation_response_payload as cancellationResponsePayload",
  "service_fiscal_documents.created_at as createdAt",
  "service_fiscal_documents.updated_at as updatedAt",
];

export async function nextServiceFiscalDpsNumber(): Promise<number> {
  const result = await db.raw<{ rows: Array<{ value: string }> }>(
    "select nextval('service_fiscal_dps_number_seq') as value",
  );
  const value = Number(result.rows[0]?.value);

  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error("Could not reserve a valid DPS number");
  }

  return value;
}

export async function insertServiceFiscalDocument(
  input: ServiceFiscalDocumentInput,
): Promise<ServiceFiscalDocument> {
  const [created] = await db("service_fiscal_documents")
    .insert({
      branch_id: input.branchId,
      fiscal_service_id: input.fiscalServiceId,
      provider: input.provider,
      environment: input.environment,
      status: input.status,
      provider_reference: input.providerReference,
      protocol: input.protocol,
      access_key: input.accessKey,
      dps_series: input.dpsSeries,
      dps_number: input.dpsNumber,
      nfse_number: input.nfseNumber,
      xml_url: input.xmlUrl,
      pdf_url: input.pdfUrl,
      rejection_reason: input.rejectionReason,
      request_payload: input.requestPayload,
      response_payload: input.responsePayload,
      issued_by_user_id: input.issuedByUserId,
      issued_at: db.fn.now(),
      authorized_at: input.status === "AUTHORIZED" ? db.fn.now() : null,
    })
    .returning("id");

  return requireServiceFiscalDocumentById(created.id, input.branchId);
}

export async function getServiceFiscalDocumentById(
  id: string,
  branchId: string,
): Promise<ServiceFiscalDocument | null> {
  return (
    (await query(db)
      .where("service_fiscal_documents.id", id)
      .where("service_fiscal_documents.branch_id", branchId)
      .first()) ?? null
  );
}

export async function listServiceFiscalDocuments(filters: {
  branchId: string;
  limit: number;
  offset: number;
  status?: FiscalProviderStatus;
}): Promise<{ data: ServiceFiscalDocument[]; total: number }> {
  const baseFilters = (builder: Knex.QueryBuilder) => {
    builder.where("service_fiscal_documents.branch_id", filters.branchId);

    if (filters.status) {
      builder.where("service_fiscal_documents.status", filters.status);
    }
  };
  const [data, countRow] = await Promise.all([
    query(db)
      .modify(baseFilters)
      .orderBy("service_fiscal_documents.created_at", "desc")
      .limit(filters.limit)
      .offset(filters.offset),
    db("service_fiscal_documents")
      .where("branch_id", filters.branchId)
      .modify((builder) => {
        if (filters.status) {
          builder.where("status", filters.status);
        }
      })
      .count<{ count: string }>("id as count")
      .first(),
  ]);

  return { data, total: Number(countRow?.count ?? 0) };
}

export async function updateServiceFiscalDocumentStatus(
  id: string,
  branchId: string,
  input: ServiceFiscalDocumentStatusInput,
): Promise<ServiceFiscalDocument | null> {
  const updated = await db("service_fiscal_documents")
    .where({ id, branch_id: branchId })
    .update({
      status: input.status,
      provider_reference: input.providerReference,
      protocol: input.protocol,
      access_key: input.accessKey,
      nfse_number: input.nfseNumber,
      xml_url: input.xmlUrl,
      pdf_url: input.pdfUrl,
      rejection_reason: input.rejectionReason,
      response_payload: input.responsePayload,
      ...(input.status === "AUTHORIZED"
        ? { authorized_at: db.fn.now() }
        : {}),
      updated_at: db.fn.now(),
    });

  if (!updated) {
    return null;
  }

  return getServiceFiscalDocumentById(id, branchId);
}

export async function markServiceFiscalDocumentCancelled(
  id: string,
  branchId: string,
  input: {
    cancelledByUserId: string;
    cancellationReason: string;
    responsePayload: Record<string, unknown>;
  },
): Promise<ServiceFiscalDocument | null> {
  const updated = await db("service_fiscal_documents")
    .where({ id, branch_id: branchId, status: "AUTHORIZED" })
    .update({
      status: "CANCELLED",
      cancellation_reason: input.cancellationReason,
      cancelled_at: db.fn.now(),
      cancelled_by_user_id: input.cancelledByUserId,
      cancellation_response_payload: input.responsePayload,
      response_payload: input.responsePayload,
      updated_at: db.fn.now(),
    });

  return updated ? getServiceFiscalDocumentById(id, branchId) : null;
}

async function requireServiceFiscalDocumentById(
  id: string,
  branchId: string,
): Promise<ServiceFiscalDocument> {
  const document = await query(db)
    .where("service_fiscal_documents.id", id)
    .where("service_fiscal_documents.branch_id", branchId)
    .first();

  if (!document) {
    throw new Error("Service fiscal document was not found after creation");
  }

  return document;
}

function query(database: Knex | Knex.Transaction) {
  return database("service_fiscal_documents")
    .join(
      "fiscal_services",
      "fiscal_services.id",
      "service_fiscal_documents.fiscal_service_id",
    )
    .join("users", "users.id", "service_fiscal_documents.issued_by_user_id")
    .leftJoin(
      { cancellation_user: "users" },
      "cancellation_user.id",
      "service_fiscal_documents.cancelled_by_user_id",
    )
    .select<ServiceFiscalDocument[]>(columns);
}
