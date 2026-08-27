import { SignJWT, jwtVerify } from "jose";
import { env } from "../../config/env.js";
import {
  employeePermissionValues,
  type EmployeePermission,
} from "./permissions.js";

const issuer = "loja-filtros-backend";
const audience = "loja-filtros-frontend";
const expirationTime = "8h";
const key = new TextEncoder().encode(env.jwtSecret);

export type AuthenticatedUser = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: "ADMIN" | "EMPLOYEE";
  branchId?: string | null;
  branchName?: string | null;
  branches?: Array<{ id: string; name: string }>;
  lastLoginAt?: string | null;
  permissions?: EmployeePermission[];
  mustChangePassword?: boolean;
};

export async function issueAuthToken(user: AuthenticatedUser): Promise<string> {
  return new SignJWT({
    name: user.name,
    email: user.email,
    phone: user.phone ?? null,
    role: user.role,
    branchId: user.branchId ?? null,
    branchName: user.branchName ?? null,
    branches: user.branches ?? [],
    lastLoginAt: user.lastLoginAt ?? null,
    permissions: user.permissions ?? [],
    mustChangePassword: user.mustChangePassword ?? false,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(issuer)
    .setAudience(audience)
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(expirationTime)
    .sign(key);
}

export async function verifyAuthToken(
  token: string,
): Promise<AuthenticatedUser | undefined> {
  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: ["HS256"],
      issuer,
      audience,
    });

    if (
      typeof payload.sub !== "string" ||
      typeof payload.name !== "string" ||
      typeof payload.email !== "string" ||
      (typeof payload.phone !== "string" &&
        payload.phone !== null &&
        typeof payload.phone !== "undefined") ||
      (typeof payload.permissions !== "undefined" &&
        !isValidPermissions(payload.permissions)) ||
      (typeof payload.lastLoginAt !== "undefined" &&
        payload.lastLoginAt !== null &&
        typeof payload.lastLoginAt !== "string") ||
      (typeof payload.branches !== "undefined" &&
        !isValidBranches(payload.branches)) ||
      (typeof payload.mustChangePassword !== "undefined" &&
        typeof payload.mustChangePassword !== "boolean") ||
      !["ADMIN", "EMPLOYEE"].includes(String(payload.role))
    ) {
      return undefined;
    }

    return {
      id: payload.sub,
      name: payload.name,
      email: payload.email,
      phone: typeof payload.phone === "string" ? payload.phone : null,
      role: payload.role as AuthenticatedUser["role"],
      branchId: typeof payload.branchId === "string" ? payload.branchId : null,
      branchName:
        typeof payload.branchName === "string" ? payload.branchName : null,
      branches: Array.isArray(payload.branches)
        ? (payload.branches as Array<{ id: string; name: string }>)
        : [],
      lastLoginAt:
        typeof payload.lastLoginAt === "string" ? payload.lastLoginAt : null,
      permissions: Array.isArray(payload.permissions)
        ? (payload.permissions as EmployeePermission[])
        : [],
      mustChangePassword:
        typeof payload.mustChangePassword === "boolean"
          ? payload.mustChangePassword
          : false,
    };
  } catch {
    return undefined;
  }
}

function isValidBranches(
  value: unknown,
): value is Array<{ id: string; name: string }> {
  return (
    Array.isArray(value) &&
    value.every(
      (branch) =>
        branch &&
        typeof branch === "object" &&
        "id" in branch &&
        "name" in branch &&
        typeof branch.id === "string" &&
        typeof branch.name === "string",
    )
  );
}

function isValidPermissions(value: unknown): value is EmployeePermission[] {
  return (
    Array.isArray(value) &&
    value.every((permission) =>
      employeePermissionValues.includes(permission as EmployeePermission),
    )
  );
}
