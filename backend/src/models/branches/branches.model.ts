import { db } from "../../database/knex.js";

export type Branch = {
  id: string;
  name: string;
  code: string | null;
  active: boolean;
};

export type BranchCreateInput = {
  name: string;
  code?: string | null;
};

const branchColumns = ["id", "name", "code", "active"];

export async function listBranches(): Promise<Branch[]> {
  return db("branches").select(branchColumns).orderBy("name", "asc");
}

export async function findActiveBranchById(
  id: string,
): Promise<Branch | undefined> {
  return db("branches").select(branchColumns).where({ id, active: true }).first();
}

export async function createBranch(input: BranchCreateInput): Promise<Branch> {
  const [branch] = await db("branches")
    .insert({
      name: input.name,
      code: input.code,
    })
    .returning(branchColumns);

  return branch;
}
