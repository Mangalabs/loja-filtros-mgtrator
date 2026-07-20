import {
  createBranch,
  listBranches,
  type BranchCreateInput,
} from "../../models/branches/branches.model.js";

export async function indexBranches() {
  return {
    code: 200,
    status: "success",
    data: await listBranches(),
  };
}

export async function storeBranch(input: BranchCreateInput) {
  const branch = await createBranch(input);

  return {
    code: 201,
    status: "success",
    data: branch,
  };
}
