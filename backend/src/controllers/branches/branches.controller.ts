import {
  createBranch,
  listBranches,
  updateBranch,
  type BranchCreateInput,
  type BranchUpdateInput,
} from "../../models/branches/branches.model.js";
import { env } from "../../config/env.js";
import {
  getFiscalSettings,
  upsertFiscalSettings,
} from "../../models/fiscal-settings/fiscal-settings.model.js";
import { AppError } from "../../shared/errors/app-error.js";

export async function indexBranches() {
  return {
    code: 200,
    status: "success",
    data: await listBranches(),
  };
}

export async function storeBranch(input: BranchCreateInput) {
  ensureBranchDocument(input.document);
  const branch = await createBranch(input);
  await saveBranchFiscalBootstrap(branch.id, input.document);

  return {
    code: 201,
    status: "success",
    data: branch,
  };
}

export async function replaceBranch(id: string, input: BranchUpdateInput) {
  ensureBranchDocument(input.document);
  const branch = await updateBranch(id, input);

  if (!branch) {
    throw new AppError("Filial nao encontrada.", 404);
  }

  await saveBranchFiscalBootstrap(branch.id, input.document);

  return {
    code: 200,
    status: "success",
    data: branch,
  };
}

function ensureBranchDocument(document?: string | null) {
  const companyCnpj = document?.replace(/\D/g, "") || null;

  if (!companyCnpj || companyCnpj.length === 14) {
    return;
  }

  throw new AppError("CNPJ da filial deve ter 14 digitos.", 422);
}

async function saveBranchFiscalBootstrap(
  branchId: string,
  document?: string | null,
) {
  const companyCnpj = document?.replace(/\D/g, "") || null;

  if (!companyCnpj) {
    return;
  }

  const currentSettings = await getFiscalSettings({ branchId });

  await upsertFiscalSettings(branchId, {
    provider:
      currentSettings?.provider ??
      (env.fiscal.provider.toUpperCase() as "MOCK" | "FOCUS"),
    environment: currentSettings?.environment ?? env.fiscal.environment,
    companyCnpj,
    allowProduction: currentSettings?.allowProduction ?? false,
  });
}
