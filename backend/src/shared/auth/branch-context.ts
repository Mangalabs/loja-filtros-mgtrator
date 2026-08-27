import type { RequestHandler } from "express";
import { findActiveBranchById } from "../../models/branches/branches.model.js";
import { AppError } from "../errors/app-error.js";
import type { AuthenticatedUser } from "./token.js";

export const activeBranchHeader = "x-active-branch-id";

export type ActiveBranchContext = {
  branchId: string | null;
  branchName: string | null;
};

export function requireActiveBranchId(locals: {
  activeBranch?: ActiveBranchContext;
}) {
  const branchId = locals.activeBranch?.branchId;

  if (!branchId) {
    throw new AppError("Selecione uma filial ativa para operar.", 400);
  }

  return branchId;
}

export const resolveActiveBranchContext: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    response.locals.activeBranch = await activeBranchContext(
      response.locals.authenticatedUser,
      request.get(activeBranchHeader),
    );
    next();
  } catch (error) {
    next(error);
  }
};

async function activeBranchContext(
  user: AuthenticatedUser,
  requestedBranchId?: string,
): Promise<ActiveBranchContext> {
  if (user.role === "EMPLOYEE") {
    return employeeBranchContext(user, requestedBranchId);
  }

  const branchId = requestedBranchId?.trim();

  if (!branchId) {
    return { branchId: null, branchName: null };
  }

  const branch = await findActiveBranchById(branchId);

  if (!branch) {
    throw new AppError("Filial ativa nao encontrada.", 404);
  }

  return { branchId: branch.id, branchName: branch.name };
}

async function employeeBranchContext(
  user: AuthenticatedUser,
  requestedBranchId?: string,
): Promise<ActiveBranchContext> {
  if (!user.branchId) {
    throw new AppError("Usuario sem filial vinculada.", 403);
  }

  const branchId = requestedBranchId?.trim() || user.branchId;
  const allowedBranches = user.branches ?? [];
  const allowedBranch = allowedBranches.find((branch) => branch.id === branchId);

  if (!allowedBranch) {
    throw new AppError("Usuario sem acesso a filial selecionada.", 403);
  }

  const branch = await findActiveBranchById(branchId);

  if (!branch) {
    throw new AppError("Filial ativa nao encontrada.", 404);
  }

  return {
    branchId: branch.id,
    branchName: branch.name,
  };
}
