import type { Knex } from "knex";
import { db } from "../../database/knex.js";

export type QuoteFormDraft = {
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

export type QuoteFormDraftInput = {
  branchId: string;
  createdByUserId: string;
  title: string;
  payload: Record<string, unknown>;
};

const quoteFormDraftColumns = [
  "quote_form_drafts.id",
  "quote_form_drafts.branch_id as branchId",
  "quote_form_drafts.created_by_user_id as createdByUserId",
  "draft_owners.name as createdByUserName",
  "quote_form_drafts.shared_with_user_id as sharedWithUserId",
  "shared_users.name as sharedWithUserName",
  "shared_users.email as sharedWithUserEmail",
  "quote_form_drafts.title",
  "quote_form_drafts.payload",
  "quote_form_drafts.created_at as createdAt",
  "quote_form_drafts.updated_at as updatedAt",
];

export async function listQuoteFormDrafts(filters: {
  branchId: string;
  createdByUserId: string;
}): Promise<QuoteFormDraft[]> {
  return quoteFormDraftQuery(db)
    .where("quote_form_drafts.branch_id", filters.branchId)
    .where((query) =>
      query
        .where("quote_form_drafts.created_by_user_id", filters.createdByUserId)
        .orWhere("quote_form_drafts.shared_with_user_id", filters.createdByUserId),
    )
    .orderBy("quote_form_drafts.updated_at", "desc");
}

export async function insertQuoteFormDraft(
  input: QuoteFormDraftInput,
): Promise<QuoteFormDraft> {
  const [created] = await db("quote_form_drafts")
    .insert({
      branch_id: input.branchId,
      created_by_user_id: input.createdByUserId,
      title: input.title,
      payload: input.payload,
    })
    .returning("id");

  return getCreatedQuoteFormDraft(created.id);
}

export async function updateQuoteFormDraft(
  id: string,
  input: QuoteFormDraftInput,
): Promise<QuoteFormDraft | undefined> {
  const [updated] = await db("quote_form_drafts")
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

  return getCreatedQuoteFormDraft(updated.id);
}

export async function deleteQuoteFormDraft(filters: {
  id: string;
  branchId: string;
  createdByUserId: string;
}): Promise<boolean> {
  const deleted = await db("quote_form_drafts")
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

export async function shareQuoteFormDraft(filters: {
  id: string;
  branchId: string;
  createdByUserId: string;
  sharedWithUserId: string | null;
}): Promise<QuoteFormDraft | undefined> {
  const [updated] = await db("quote_form_drafts")
    .where("id", filters.id)
    .where("branch_id", filters.branchId)
    .where("created_by_user_id", filters.createdByUserId)
    .update({
      shared_with_user_id: filters.sharedWithUserId,
      updated_at: db.fn.now(),
    })
    .returning("id");

  return updated ? getCreatedQuoteFormDraft(updated.id) : undefined;
}

async function getCreatedQuoteFormDraft(id: string): Promise<QuoteFormDraft> {
  const draft = await quoteFormDraftQuery(db)
    .where("quote_form_drafts.id", id)
    .first();

  if (!draft) {
    throw new Error("Quote form draft was not found after save");
  }

  return draft;
}

function quoteFormDraftQuery(database: Knex | Knex.Transaction) {
  return database("quote_form_drafts")
    .join(
      "users as draft_owners",
      "draft_owners.id",
      "quote_form_drafts.created_by_user_id",
    )
    .leftJoin(
      "users as shared_users",
      "shared_users.id",
      "quote_form_drafts.shared_with_user_id",
    )
    .select<QuoteFormDraft[]>(quoteFormDraftColumns);
}
