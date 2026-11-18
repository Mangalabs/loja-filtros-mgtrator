import { db } from "../../database/knex.js";

export type FiscalService = {
  id: string;
  branchId: string;
  name: string;
  nationalTaxCode: string;
  municipalTaxCode: string | null;
  municipalActivityCode: string | null;
  nbsCode: string | null;
  description: string | null;
  issRate: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type FiscalServiceInput = {
  name: string;
  nationalTaxCode: string;
  municipalTaxCode?: string | null;
  municipalActivityCode?: string | null;
  nbsCode?: string | null;
  description: string | null;
  issRate: number;
  active?: boolean;
};

const fiscalServiceColumns = [
  "id",
  "branch_id as branchId",
  "name",
  "national_tax_code as nationalTaxCode",
  "municipal_tax_code as municipalTaxCode",
  "municipal_activity_code as municipalActivityCode",
  "nbs_code as nbsCode",
  "description",
  "iss_rate as issRate",
  "active",
  "created_at as createdAt",
  "updated_at as updatedAt",
];

export async function listFiscalServices(filters: {
  branchId: string;
  active?: boolean;
}): Promise<FiscalService[]> {
  return db("fiscal_services")
    .select<FiscalService[]>(fiscalServiceColumns)
    .where("branch_id", filters.branchId)
    .modify((query) => {
      if (typeof filters.active === "boolean") {
        query.where("active", filters.active);
      }
    })
    .orderBy("name", "asc");
}

export async function createFiscalService(
  branchId: string,
  input: FiscalServiceInput,
): Promise<FiscalService> {
  const [created] = await db("fiscal_services")
    .insert({
      branch_id: branchId,
      name: input.name,
      national_tax_code: input.nationalTaxCode,
      municipal_tax_code: input.municipalTaxCode ?? null,
      municipal_activity_code: input.municipalActivityCode ?? null,
      nbs_code: input.nbsCode ?? null,
      description: input.description,
      iss_rate: input.issRate,
      active: input.active ?? true,
    })
    .returning("id");

  return requireFiscalServiceById(created.id, branchId);
}

export async function updateFiscalService(
  id: string,
  branchId: string,
  input: FiscalServiceInput & { active: boolean },
): Promise<FiscalService | undefined> {
  const [updated] = await db("fiscal_services")
    .where({ id, branch_id: branchId })
    .update({
      name: input.name,
      national_tax_code: input.nationalTaxCode,
      ...(input.municipalTaxCode === undefined
        ? {}
        : { municipal_tax_code: input.municipalTaxCode }),
      ...(input.municipalActivityCode === undefined
        ? {}
        : { municipal_activity_code: input.municipalActivityCode }),
      ...(input.nbsCode === undefined ? {} : { nbs_code: input.nbsCode }),
      description: input.description,
      iss_rate: input.issRate,
      active: input.active,
      updated_at: db.fn.now(),
    })
    .returning("id");

  return updated ? requireFiscalServiceById(updated.id, branchId) : undefined;
}

export async function getFiscalServiceById(id: string, branchId: string) {
  return db("fiscal_services")
    .select<FiscalService[]>(fiscalServiceColumns)
    .where({ id, branch_id: branchId })
    .first();
}

async function requireFiscalServiceById(id: string, branchId: string) {
  const service = await getFiscalServiceById(id, branchId);

  if (!service) {
    throw new Error("Fiscal service was not found after save");
  }

  return service;
}
