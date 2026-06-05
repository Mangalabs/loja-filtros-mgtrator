import type { Knex } from "knex";
import { db } from "../../database/knex.js";

export type User = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: "ADMIN";
  active: boolean;
};

export type UserWithPassword = User & {
  passwordHash: string;
};

export type UserCreateInput = {
  name: string;
  email: string;
  phone?: string | null;
  passwordHash: string;
};

type Database = Knex | Knex.Transaction;

const userColumns = ["id", "name", "email", "phone", "role", "active"];

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
      password_hash: input.passwordHash,
    })
    .returning(userColumns);

  return user;
}

export async function findUserByEmail(
  email: string,
): Promise<UserWithPassword | undefined> {
  return db("users")
    .select([...userColumns, "password_hash as passwordHash"])
    .where("email", email)
    .first();
}

export async function findActiveUserById(
  id: string,
): Promise<User | undefined> {
  return db("users").select(userColumns).where({ id, active: true }).first();
}
