import type { Knex } from "knex";
import { db } from "../../database/knex.js";
import type { ServiceFiscalDocumentInput } from "../../shared/fiscal/service-fiscal-document.js";

export type ServiceFiscalDocumentDraft = {
  id: string;
  branchId: string;
  createdByUserId: string;
  createdByUserName: string;
  sharedWithUserId: string | null;
  sharedWithUserName: string | null;
  sharedWithUserEmail: string | null;
  title: string;
  payload: ServiceFiscalDocumentInput;
  createdAt: Date;
  updatedAt: Date;
};

export type ServiceFiscalDocumentDraftInput = {
  branchId: string;
  createdByUserId: string;
  title: string;
  payload: ServiceFiscalDocumentInput;
};

const columns = [
  "service_fiscal_document_drafts.id",
  "service_fiscal_document_drafts.branch_id as branchId",
  "service_fiscal_document_drafts.created_by_user_id as createdByUserId",
  "draft_owners.name as createdByUserName",
  "service_fiscal_document_drafts.shared_with_user_id as sharedWithUserId",
  "shared_users.name as sharedWithUserName",
  "shared_users.email as sharedWithUserEmail",
  "service_fiscal_document_drafts.title",
  "service_fiscal_document_drafts.payload",
  "service_fiscal_document_drafts.created_at as createdAt",
  "service_fiscal_document_drafts.updated_at as updatedAt",
];

export async function listServiceFiscalDocumentDrafts(filters: {
  branchId: string;
  createdByUserId: string;
}): Promise<ServiceFiscalDocumentDraft[]> {
  return query(db)
    .where("service_fiscal_document_drafts.branch_id", filters.branchId)
    .where((builder) =>
      builder
        .where(
          "service_fiscal_document_drafts.created_by_user_id",
          filters.createdByUserId,
        )
        .orWhere(
          "service_fiscal_document_drafts.shared_with_user_id",
          filters.createdByUserId,
        ),
    )
    .orderBy("service_fiscal_document_drafts.updated_at", "desc");
}

export async function insertServiceFiscalDocumentDraft(
  input: ServiceFiscalDocumentDraftInput,
): Promise<ServiceFiscalDocumentDraft> {
  const [created] = await db("service_fiscal_document_drafts")
    .insert({
      branch_id: input.branchId,
      created_by_user_id: input.createdByUserId,
      title: input.title,
      payload: input.payload,
    })
    .returning("id");

  return findSavedDraft(created.id);
}

export async function updateServiceFiscalDocumentDraft(
  id: string,
  input: ServiceFiscalDocumentDraftInput,
): Promise<ServiceFiscalDocumentDraft | undefined> {
  const [updated] = await db("service_fiscal_document_drafts")
    .where("id", id)
    .where("branch_id", input.branchId)
    .where((builder) =>
      builder
        .where("created_by_user_id", input.createdByUserId)
        .orWhere("shared_with_user_id", input.createdByUserId),
    )
    .update({
      title: input.title,
      payload: input.payload,
      updated_at: db.fn.now(),
    })
    .returning("id");

  return updated ? findSavedDraft(updated.id) : undefined;
}

export async function deleteServiceFiscalDocumentDraft(filters: {
  id: string;
  branchId: string;
  createdByUserId: string;
}): Promise<boolean> {
  const deleted = await db("service_fiscal_document_drafts")
    .where("id", filters.id)
    .where("branch_id", filters.branchId)
    .where((builder) =>
      builder
        .where("created_by_user_id", filters.createdByUserId)
        .orWhere("shared_with_user_id", filters.createdByUserId),
    )
    .delete();

  return deleted > 0;
}

export async function shareServiceFiscalDocumentDraft(filters: {
  id: string;
  branchId: string;
  createdByUserId: string;
  sharedWithUserId: string | null;
}): Promise<ServiceFiscalDocumentDraft | undefined> {
  const [updated] = await db("service_fiscal_document_drafts")
    .where("id", filters.id)
    .where("branch_id", filters.branchId)
    .where("created_by_user_id", filters.createdByUserId)
    .update({
      shared_with_user_id: filters.sharedWithUserId,
      updated_at: db.fn.now(),
    })
    .returning("id");

  return updated ? findSavedDraft(updated.id) : undefined;
}

async function findSavedDraft(id: string): Promise<ServiceFiscalDocumentDraft> {
  const draft = await query(db)
    .where("service_fiscal_document_drafts.id", id)
    .first();

  if (!draft) {
    throw new Error("Service fiscal document draft was not found after save");
  }

  return draft;
}

function query(database: Knex | Knex.Transaction) {
  return database("service_fiscal_document_drafts")
    .join(
      "users as draft_owners",
      "draft_owners.id",
      "service_fiscal_document_drafts.created_by_user_id",
    )
    .leftJoin(
      "users as shared_users",
      "shared_users.id",
      "service_fiscal_document_drafts.shared_with_user_id",
    )
    .select<ServiceFiscalDocumentDraft[]>(columns);
}
