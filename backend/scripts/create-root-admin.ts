import { randomBytes } from "node:crypto";
import { db } from "../src/database/knex.js";
import { hashPassword } from "../src/shared/auth/password.js";

type RootAdminOptions = {
  commit: boolean;
  email: string;
  name: string;
  password?: string;
};

const options = parseOptions(process.argv.slice(2));
const result = await createRootAdmin(options);

console.log(JSON.stringify(result, null, 2));
await db.destroy();

async function createRootAdmin(options: RootAdminOptions) {
  const existingUser = await db("users")
    .select(["id", "email", "role", "active"])
    .whereRaw("lower(email) = lower(?)", [options.email])
    .first();
  const temporaryPassword = options.password ?? generateTemporaryPassword();

  if (!options.commit) {
    return {
      mode: "dry-run",
      action: existingUser ? "update-existing-admin" : "create-root-admin",
      email: options.email,
      name: options.name,
      passwordGenerated: !options.password,
      mustChangePassword: true,
      message: "Nenhuma alteracao gravada. Use --commit para executar.",
    };
  }

  const passwordHash = await hashPassword(temporaryPassword);
  const user = await db.transaction(async (transaction) => {
    if (existingUser) {
      const [updatedUser] = await transaction("users")
        .where("id", existingUser.id)
        .update({
          name: options.name,
          email: options.email,
          role: "ADMIN",
          active: true,
          branch_id: null,
          password_hash: passwordHash,
          must_change_password: true,
          updated_at: transaction.fn.now(),
        })
        .returning(["id", "email", "name", "role", "active"]);

      return updatedUser;
    }

    const [createdUser] = await transaction("users")
      .insert({
        name: options.name,
        email: options.email,
        role: "ADMIN",
        active: true,
        branch_id: null,
        password_hash: passwordHash,
        must_change_password: true,
      })
      .returning(["id", "email", "name", "role", "active"]);

    return createdUser;
  });

  return {
    mode: "commit",
    action: existingUser ? "updated-existing-admin" : "created-root-admin",
    user,
    temporaryPassword,
    mustChangePassword: true,
  };
}

function parseOptions(args: string[]): RootAdminOptions {
  const values = args.reduce<Record<string, string | boolean>>(
    (parsed, argument, index) => {
      if (!argument.startsWith("--")) {
        return parsed;
      }

      const [key, inlineValue] = argument.slice(2).split("=");
      const nextValue = args[index + 1];
      const value =
        inlineValue ??
        (nextValue && !nextValue.startsWith("--") ? nextValue : true);

      return {
        ...parsed,
        [key]: value,
      };
    },
    {},
  );
  const email = stringOption(values.email)?.toLowerCase();

  if (!email) {
    throw new Error("Informe o email oficial com --email admin@empresa.com.");
  }

  if (!email.includes("@")) {
    throw new Error("Email informado em --email e invalido.");
  }

  return {
    commit: values.commit === true || values.commit === "true",
    email,
    name: stringOption(values.name) ?? "Administrador Raiz",
    password: stringOption(values.password),
  };
}

function stringOption(value: string | boolean | undefined) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function generateTemporaryPassword() {
  return `Root-${randomBytes(18).toString("base64url")}`;
}
