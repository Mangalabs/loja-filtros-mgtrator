import type { Knex } from "knex";
import { db } from "../../database/knex.js";

export type User = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  branchId: string | null;
  branchName: string | null;
  active: boolean;
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
];

export async function hasUsers(database: Database = db): Promise<boolean> {
  const user = await database("users").select("id").first();

  return Boolean(user);
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
    })
    .returning("id");

  const created = await findActiveUserById(user.id, database);

  if (!created) {
    throw new Error("Created user not found");
  }

  return created;
}

export async function findUserByEmail(
  email: string,
): Promise<UserWithPassword | undefined> {
  return userQuery(db)
    .select([...userColumns, "password_hash as passwordHash"])
    .where("users.email", email)
    .first();
}

export async function findActiveUserById(
  id: string,
  database: Database = db,
): Promise<User | undefined> {
  return userQuery(database)
    .select(userColumns)
    .where({ "users.id": id, "users.active": true })
    .first();
}

function userQuery(database: Database) {
  return database("users").leftJoin(
    "branches",
    "branches.id",
    "users.branch_id",
  );
}
