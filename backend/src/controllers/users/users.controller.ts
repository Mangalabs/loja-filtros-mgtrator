import {
  createUser,
  findUserById,
  listUsers,
  type UserCreateInput,
  type UserUpdateInput,
  updateUser,
  updateUserStatus,
} from "../../models/users/users.model.js";
import { findActiveBranchById } from "../../models/branches/branches.model.js";
import { hashPassword } from "../../shared/auth/password.js";
import { AppError } from "../../shared/errors/app-error.js";

export type StoreUserInput = Omit<UserCreateInput, "passwordHash"> & {
  password: string;
};

export type ReplaceEmployeeInput = Omit<UserUpdateInput, "passwordHash"> & {
  password?: string;
};

export async function indexUsers() {
  return {
    code: 200,
    status: "success",
    data: await listUsers(),
  };
}

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

export async function replaceEmployee(
  id: string,
  input: ReplaceEmployeeInput,
) {
  await ensureEmployee(id);
  await ensureEmployeeBranch(input.branchId);

  const user = await updateUser(id, {
    name: input.name,
    email: input.email,
    phone: input.phone,
    branchId: input.branchId,
    passwordHash: input.password
      ? await hashPassword(input.password)
      : undefined,
  });

  return {
    code: 200,
    status: "success",
    data: user,
  };
}

export async function changeEmployeeStatus(id: string, active: boolean) {
  await ensureEmployee(id);
  const user = await updateUserStatus(id, active);

  return {
    code: 200,
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

  await ensureEmployeeBranch(input.branchId);
}

async function ensureEmployeeBranch(branchId: string) {
  const branch = await findActiveBranchById(branchId);

  if (!branch) {
    throw new AppError("Filial informada nao encontrada.", 404);
  }
}

async function ensureEmployee(id: string) {
  const user = await findUserById(id);

  if (!user || user.role !== "EMPLOYEE") {
    throw new AppError("Funcionario nao encontrado.", 404);
  }

  return user;
}
