import { db } from "../../database/knex.js";
import {
  createUser,
  findUserByEmail,
  hasUsers,
  type User,
} from "../../models/users/users.model.js";
import { hashPassword, verifyPassword } from "../../shared/auth/password.js";
import { issueAuthToken } from "../../shared/auth/token.js";
import { AppError } from "../../shared/errors/app-error.js";

export type CredentialsInput = {
  email: string;
  password: string;
};

export type SetupInput = CredentialsInput & {
  name: string;
  phone?: string | null;
};

const dummyPasswordHash = hashPassword("timing-check-password-not-used-for-login");

export async function showSetupStatus() {
  return {
    code: 200,
    status: "success",
    data: {
      requiresSetup: !(await hasUsers()),
    },
  };
}

export async function setupInitialUser(input: SetupInput) {
  const passwordHash = await hashPassword(input.password);

  const user = await db.transaction(async (transaction) => {
    await transaction.raw("select pg_advisory_xact_lock(hashtext('users-bootstrap'))");

    if (await hasUsers(transaction)) {
      throw new AppError("Configuracao inicial ja foi concluida.", 403);
    }

    return createUser(
      {
        name: input.name,
        email: input.email,
        phone: input.phone,
        passwordHash,
      },
      transaction,
    );
  });

  return authenticatedResult(user);
}

export async function authenticateUser(input: CredentialsInput) {
  const user = await findUserByEmail(input.email);
  const passwordHash = user?.passwordHash ?? (await dummyPasswordHash);
  const passwordIsValid = await verifyPassword(input.password, passwordHash);

  if (!user || !user.active || !passwordIsValid) {
    throw new AppError("Email ou senha invalidos.", 401);
  }

  return authenticatedResult(user);
}

async function authenticatedResult(user: User) {
  const publicUser: User = {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    active: user.active,
  };
  const token = await issueAuthToken(publicUser);

  return {
    token,
    response: {
      code: 200,
      status: "success",
      data: publicUser,
    },
  };
}
