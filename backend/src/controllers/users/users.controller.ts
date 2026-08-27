import {
  createUser,
  findUserById,
  listUsers,
  type UserUpdateInput,
  updateUser,
  updateUserPassword,
  updateUserStatus,
} from "../../models/users/users.model.js";
import { createAuthEvent } from "../../models/auth-events/auth-events.model.js";
import { findActiveBranchById } from "../../models/branches/branches.model.js";
import { hashPassword } from "../../shared/auth/password.js";
import type { EmployeePermission } from "../../shared/auth/permissions.js";
import { AppError } from "../../shared/errors/app-error.js";

export type StoreUserInput = {
  name: string;
  email: string;
  phone?: string | null;
  branchId: string;
  branchIds?: string[];
  permissions?: EmployeePermission[];
  password: string;
};

export type ReplaceEmployeeInput = Omit<UserUpdateInput, "passwordHash"> & {
  password?: string;
};

export type ResetEmployeePasswordInput = {
  password: string;
};

export type AuthenticatedAdministratorInput = {
  id: string;
  email: string;
};

export async function indexUsers() {
  return {
    code: 200,
    status: "success",
    data: await listUsers(),
  };
}

export async function storeUser(
  input: StoreUserInput,
  administrator: AuthenticatedAdministratorInput,
) {
  await ensureEmployeeBranches(employeeBranchIds(input));

  const user = await createUser({
    name: input.name,
    email: input.email,
    phone: input.phone,
    role: "EMPLOYEE",
    branchId: input.branchId,
    branchIds: input.branchIds,
    permissions: input.permissions ?? [],
    mustChangePassword: true,
    passwordHash: await hashPassword(input.password),
  });

  await createAuthEvent({
    userId: user.id,
    email: user.email,
    eventType: "EMPLOYEE_CREATED",
    reason: `ADMIN:${administrator.email}`,
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
  administrator: AuthenticatedAdministratorInput,
) {
  await ensureEmployee(id);
  await ensureEmployeeBranches(employeeBranchIds(input));

  const user = await updateUser(id, {
    name: input.name,
    email: input.email,
    phone: input.phone,
    branchId: input.branchId,
    branchIds: input.branchIds,
    permissions: input.permissions ?? [],
    mustChangePassword: Boolean(input.password),
    passwordHash: input.password
      ? await hashPassword(input.password)
      : undefined,
  });

  if (input.password && user) {
    await createAuthEvent({
      userId: user.id,
      email: user.email,
      eventType: "PASSWORD_RESET",
      reason: `ADMIN:${administrator.email}`,
    });
  }

  if (user) {
    await createAuthEvent({
      userId: user.id,
      email: user.email,
      eventType: "EMPLOYEE_UPDATED",
      reason: `ADMIN:${administrator.email}`,
    });
  }

  return {
    code: 200,
    status: "success",
    data: user,
  };
}

export async function resetEmployeePassword(
  id: string,
  input: ResetEmployeePasswordInput,
  administrator: AuthenticatedAdministratorInput,
) {
  await ensureEmployee(id);

  const user = await updateUserPassword(id, {
    passwordHash: await hashPassword(input.password),
    mustChangePassword: true,
  });

  if (!user) {
    throw new AppError("Funcionario nao encontrado.", 404);
  }

  await createAuthEvent({
    userId: user.id,
    email: user.email,
    eventType: "PASSWORD_RESET",
    reason: `ADMIN:${administrator.email}`,
  });

  return {
    code: 200,
    status: "success",
    data: user,
  };
}

export async function changeEmployeeStatus(
  id: string,
  active: boolean,
  administrator: AuthenticatedAdministratorInput,
) {
  await ensureEmployee(id);
  const user = await updateUserStatus(id, active);

  if (user) {
    await createAuthEvent({
      userId: user.id,
      email: user.email,
      eventType: "EMPLOYEE_STATUS_CHANGED",
      reason: `${active ? "ACTIVE" : "INACTIVE"}|ADMIN:${administrator.email}`,
    });
  }

  return {
    code: 200,
    status: "success",
    data: user,
  };
}

async function ensureEmployeeBranch(branchId: string) {
  const branch = await findActiveBranchById(branchId);

  if (!branch) {
    throw new AppError("Filial informada nao encontrada.", 404);
  }
}

async function ensureEmployeeBranches(branchIds: string[]) {
  for (const branchId of branchIds) {
    await ensureEmployeeBranch(branchId);
  }
}

function employeeBranchIds(input: { branchId: string; branchIds?: string[] }) {
  return [...new Set([input.branchId, ...(input.branchIds ?? [])])];
}

async function ensureEmployee(id: string) {
  const user = await findUserById(id);

  if (!user || user.role !== "EMPLOYEE") {
    throw new AppError("Funcionario nao encontrado.", 404);
  }

  return user;
}
