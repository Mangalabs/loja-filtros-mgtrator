import type { Knex } from "knex";
import { db } from "../../database/knex.js";

export type ManualFiscalDocumentDraft = {
  id: string;
  branchId: string;
  createdByUserId: string;
  createdByUserName: string;
  sharedWithUserId: string | null;
  sharedWithUserName: string | null;
  sharedWithUserEmail: string | null;
  title: string;
  payload: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
};

export type ManualFiscalDocumentDraftInput = {
  branchId: string;
  createdByUserId: string;
  title: string;
  payload: Record<string, unknown>;
};

const manualFiscalDocumentDraftColumns = [
  "manual_fiscal_document_drafts.id",
  "manual_fiscal_document_drafts.branch_id as branchId",
  "manual_fiscal_document_drafts.created_by_user_id as createdByUserId",
  "draft_owners.name as createdByUserName",
  "manual_fiscal_document_drafts.shared_with_user_id as sharedWithUserId",
  "shared_users.name as sharedWithUserName",
  "shared_users.email as sharedWithUserEmail",
  "manual_fiscal_document_drafts.title",
  "manual_fiscal_document_drafts.payload",
  "manual_fiscal_document_drafts.created_at as createdAt",
  "manual_fiscal_document_drafts.updated_at as updatedAt",
];

export async function listManualFiscalDocumentDrafts(filters: {
  branchId: string;
  createdByUserId: string;
}): Promise<ManualFiscalDocumentDraft[]> {
  return manualFiscalDocumentDraftQuery(db)
    .where("manual_fiscal_document_drafts.branch_id", filters.branchId)
    .where((query) =>
      query
        .where(
          "manual_fiscal_document_drafts.created_by_user_id",
          filters.createdByUserId,
        )
        .orWhere(
          "manual_fiscal_document_drafts.shared_with_user_id",
          filters.createdByUserId,
        ),
    )
    .orderBy("manual_fiscal_document_drafts.updated_at", "desc");
}

export async function insertManualFiscalDocumentDraft(
  input: ManualFiscalDocumentDraftInput,
): Promise<ManualFiscalDocumentDraft> {
  const [created] = await db("manual_fiscal_document_drafts")
    .insert({
      branch_id: input.branchId,
      created_by_user_id: input.createdByUserId,
      title: input.title,
      payload: input.payload,
    })
    .returning("id");

  return getCreatedManualFiscalDocumentDraft(created.id);
}

export async function updateManualFiscalDocumentDraft(
  id: string,
  input: ManualFiscalDocumentDraftInput,
): Promise<ManualFiscalDocumentDraft | undefined> {
  const [updated] = await db("manual_fiscal_document_drafts")
    .where("id", id)
    .where("branch_id", input.branchId)
    .where((query) =>
      query
        .where("created_by_user_id", input.createdByUserId)
        .orWhere("shared_with_user_id", input.createdByUserId),
    )
    .update({
      title: input.title,
      payload: input.payload,
      updated_at: db.fn.now(),
    })
    .returning("id");

  if (!updated) {
    return undefined;
  }

  return getCreatedManualFiscalDocumentDraft(updated.id);
}

export async function deleteManualFiscalDocumentDraft(filters: {
  id: string;
  branchId: string;
  createdByUserId: string;
}): Promise<boolean> {
  const deleted = await db("manual_fiscal_document_drafts")
    .where("id", filters.id)
    .where("branch_id", filters.branchId)
    .where((query) =>
      query
        .where("created_by_user_id", filters.createdByUserId)
        .orWhere("shared_with_user_id", filters.createdByUserId),
    )
    .delete();

  return deleted > 0;
}

export async function shareManualFiscalDocumentDraft(filters: {
  id: string;
  branchId: string;
  createdByUserId: string;
  sharedWithUserId: string | null;
}): Promise<ManualFiscalDocumentDraft | undefined> {
  const [updated] = await db("manual_fiscal_document_drafts")
    .where("id", filters.id)
    .where("branch_id", filters.branchId)
    .where("created_by_user_id", filters.createdByUserId)
    .update({
      shared_with_user_id: filters.sharedWithUserId,
      updated_at: db.fn.now(),
    })
    .returning("id");

  return updated ? getCreatedManualFiscalDocumentDraft(updated.id) : undefined;
}

async function getCreatedManualFiscalDocumentDraft(
  id: string,
): Promise<ManualFiscalDocumentDraft> {
  const draft = await manualFiscalDocumentDraftQuery(db)
    .where("manual_fiscal_document_drafts.id", id)
    .first();

  if (!draft) {
    throw new Error("Manual fiscal document draft was not found after save");
  }

  return draft;
}

function manualFiscalDocumentDraftQuery(database: Knex | Knex.Transaction) {
  return database("manual_fiscal_document_drafts")
    .join(
      "users as draft_owners",
      "draft_owners.id",
      "manual_fiscal_document_drafts.created_by_user_id",
    )
    .leftJoin(
      "users as shared_users",
      "shared_users.id",
      "manual_fiscal_document_drafts.shared_with_user_id",
    )
    .select<ManualFiscalDocumentDraft[]>(manualFiscalDocumentDraftColumns);
}
