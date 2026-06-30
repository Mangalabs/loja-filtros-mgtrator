import {
  createUser,
  type UserCreateInput,
} from "../../models/users/users.model.js";
import { findActiveBranchById } from "../../models/branches/branches.model.js";
import { hashPassword } from "../../shared/auth/password.js";
import { AppError } from "../../shared/errors/app-error.js";

export type StoreUserInput = Omit<UserCreateInput, "passwordHash"> & {
  password: string;
};

export async function storeUser(input: StoreUserInput) {
  await ensureUserBranch(input);

  const user = await createUser({
    name: input.name,
    email: input.email,
    phone: input.phone,
    role: input.role,
    branchId: input.branchId,
    passwordHash: await hashPassword(input.password),
  });

  return {
    code: 201,
    status: "success",
    data: user,
  };
}

async function ensureUserBranch(input: StoreUserInput) {
  if (input.role !== "EMPLOYEE") {
    return;
  }

  if (!input.branchId) {
    throw new AppError("Funcionario deve estar vinculado a uma filial.", 422);
  }

  const branch = await findActiveBranchById(input.branchId);

  if (!branch) {
    throw new AppError("Filial informada nao encontrada.", 404);
  }
}
