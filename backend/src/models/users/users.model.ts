import type { Knex } from "knex";
import { db } from "../../database/knex.js";
import type { EmployeePermission } from "../../shared/auth/permissions.js";

export type User = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  branchId: string | null;
  branchName: string | null;
  active: boolean;
  permissions: EmployeePermission[];
  lastLoginAt?: string | null;
  mustChangePassword: boolean;
};

export type UserRole = "ADMIN" | "EMPLOYEE";

export type UserWithPassword = User & {
  passwordHash: string;
};

export type UserCreateInput = {
  name: string;
  email: string;
  phone?: string | null;
  role?: UserRole;
  branchId?: string | null;
  passwordHash: string;
  permissions?: EmployeePermission[];
  mustChangePassword?: boolean;
};

export type UserUpdateInput = {
  name: string;
  email: string;
  phone?: string | null;
  branchId: string;
  passwordHash?: string;
  permissions?: EmployeePermission[];
  mustChangePassword?: boolean;
};

export type UserPasswordUpdateInput = {
  passwordHash: string;
  mustChangePassword: boolean;
};

type Database = Knex | Knex.Transaction;

const userColumns = [
  "users.id",
  "users.name",
  "users.email",
  "users.phone",
  "users.role",
  "users.branch_id as branchId",
  "branches.name as branchName",
  "users.active",
  "users.must_change_password as mustChangePassword",
];

export async function hasUsers(database: Database = db): Promise<boolean> {
  const user = await database("users").select("id").first();

  return Boolean(user);
}

export async function listUsers(database: Database = db): Promise<User[]> {
  const users = await userQuery(database)
    .select(userColumns)
    .orderBy("users.name", "asc");

  return attachUserDetails(database, users);
}

export async function createUser(
  input: UserCreateInput,
  database: Database = db,
): Promise<User> {
  const [user] = await database("users")
    .insert({
      name: input.name,
      email: input.email,
      phone: input.phone,
      role: input.role ?? "ADMIN",
      branch_id: input.branchId,
      password_hash: input.passwordHash,
      must_change_password: input.mustChangePassword ?? false,
    })
    .returning("id");

  await replaceUserPermissions(database, user.id, input.permissions ?? []);

  const created = await findActiveUserById(user.id, database);

  if (!created) {
    throw new Error("Created user not found");
  }

  return created;
}

export async function findUserByEmail(
  email: string,
): Promise<UserWithPassword | undefined> {
  const user = await userQuery(db)
    .select([...userColumns, "password_hash as passwordHash"])
    .where("users.email", email)
    .first();

  return user ? (await attachUserDetails(db, [user]))[0] : undefined;
}

export async function findUserWithPasswordById(
  id: string,
  database: Database = db,
): Promise<UserWithPassword | undefined> {
  const user = await userQuery(database)
    .select([...userColumns, "password_hash as passwordHash"])
    .where("users.id", id)
    .first();

  return user ? (await attachUserDetails(database, [user]))[0] : undefined;
}

export async function findActiveUserById(
  id: string,
  database: Database = db,
): Promise<User | undefined> {
  const user = await userQuery(database)
    .select(userColumns)
    .where({ "users.id": id, "users.active": true })
    .first();

  return user ? (await attachUserDetails(database, [user]))[0] : undefined;
}

export async function findUserById(
  id: string,
  database: Database = db,
): Promise<User | undefined> {
  const user = await userQuery(database)
    .select(userColumns)
    .where("users.id", id)
    .first();

  return user ? (await attachUserDetails(database, [user]))[0] : undefined;
}

export async function updateUser(
  id: string,
  input: UserUpdateInput,
  database: Database = db,
): Promise<User | undefined> {
  const updated = await database("users")
    .where("id", id)
    .update({
      name: input.name,
      email: input.email,
      phone: input.phone,
      branch_id: input.branchId,
      ...(input.passwordHash
        ? {
            password_hash: input.passwordHash,
            must_change_password: input.mustChangePassword ?? false,
          }
        : {}),
      updated_at: database.fn.now(),
    });

  if (!updated) {
    return undefined;
  }

  if (input.permissions) {
    await replaceUserPermissions(database, id, input.permissions);
  }

  return findUserById(id, database);
}

export async function updateUserStatus(
  id: string,
  active: boolean,
  database: Database = db,
): Promise<User | undefined> {
  const updated = await database("users")
    .where("id", id)
    .update({
      active,
      updated_at: database.fn.now(),
    });

  return updated ? findUserById(id, database) : undefined;
}

export async function updateUserPassword(
  id: string,
  input: UserPasswordUpdateInput,
  database: Database = db,
): Promise<User | undefined> {
  const updated = await database("users").where("id", id).update({
    password_hash: input.passwordHash,
    must_change_password: input.mustChangePassword,
    updated_at: database.fn.now(),
  });

  return updated ? findUserById(id, database) : undefined;
}

function userQuery(database: Database) {
  return database("users").leftJoin(
    "branches",
    "branches.id",
    "users.branch_id",
  );
}

async function attachUserDetails<T extends User>(
  database: Database,
  users: T[],
) {
  return attachLastLogin(database, await attachPermissions(database, users));
}

async function attachPermissions<T extends User>(
  database: Database,
  users: T[],
): Promise<T[]> {
  const userIds = users.map((user) => user.id);

  if (userIds.length === 0) {
    return users;
  }

  const rows = await database("user_permissions")
    .whereIn("user_id", userIds)
    .select<Array<{ userId: string; permission: EmployeePermission }>>([
      "user_id as userId",
      "permission",
    ]);
  const permissionsByUser = rows.reduce<
    Record<string, EmployeePermission[]>
  >((permissions, row) => {
    return {
      ...permissions,
      [row.userId]: [...(permissions[row.userId] ?? []), row.permission],
    };
  }, {});

  return users.map((user) => ({
    ...user,
    permissions: permissionsByUser[user.id] ?? [],
  }));
}

async function attachLastLogin<T extends User>(
  database: Database,
  users: T[],
): Promise<T[]> {
  const userIds = users.map((user) => user.id);

  if (userIds.length === 0) {
    return users;
  }

  const rows = await database("auth_events")
    .whereIn("user_id", userIds)
    .where("event_type", "LOGIN_SUCCESS")
    .groupBy("user_id")
    .select<Array<{ userId: string; lastLoginAt: string }>>([
      "user_id as userId",
      database.raw("max(created_at) as ??", ["lastLoginAt"]),
    ]);
  const lastLoginByUser = rows.reduce<Record<string, string>>(
    (lastLogins, row) => ({
      ...lastLogins,
      [row.userId]: row.lastLoginAt,
    }),
    {},
  );

  return users.map((user) => ({
    ...user,
    lastLoginAt: lastLoginByUser[user.id] ?? null,
  }));
}

async function replaceUserPermissions(
  database: Database,
  userId: string,
  permissions: EmployeePermission[],
) {
  await database("user_permissions").where("user_id", userId).del();

  if (permissions.length === 0) {
    return;
  }

  await database("user_permissions").insert(
    [...new Set(permissions)].map((permission) => ({
      user_id: userId,
      permission,
    })),
  );
}
