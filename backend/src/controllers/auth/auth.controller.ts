import { db } from "../../database/knex.js";
import { createAuthEvent } from "../../models/auth-events/auth-events.model.js";
import {
  createUser,
  findActiveUserById,
  findUserByEmail,
  findUserWithPasswordById,
  hasUsers,
  updateUserPassword,
  type User,
} from "../../models/users/users.model.js";
import { hashPassword, verifyPassword } from "../../shared/auth/password.js";
import { issueAuthToken, verifyAuthToken } from "../../shared/auth/token.js";
import { AppError } from "../../shared/errors/app-error.js";

export type CredentialsInput = {
  email: string;
  password: string;
};

export type SetupInput = CredentialsInput & {
  name: string;
  phone?: string | null;
};

export type AuthRequestMetadata = {
  ipAddress?: string | null;
  userAgent?: string | null;
};

export type ChangePasswordInput = {
  currentPassword: string;
  newPassword: string;
};

const dummyPasswordHash = hashPassword(
  "timing-check-password-not-used-for-login",
);

export async function showSetupStatus() {
  return {
    code: 200,
    status: "success",
    data: {
      requiresSetup: !(await hasUsers()),
    },
  };
}

export async function setupInitialUser(
  input: SetupInput,
  metadata: AuthRequestMetadata = {},
) {
  const passwordHash = await hashPassword(input.password);

  const user = await db.transaction(async (transaction) => {
    await transaction.raw(
      "select pg_advisory_xact_lock(hashtext('users-bootstrap'))",
    );

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

  await createAuthEvent({
    userId: user.id,
    email: user.email,
    eventType: "SETUP_SUCCESS",
    ...metadata,
  });

  return authenticatedResult(user);
}

export async function authenticateUser(
  input: CredentialsInput,
  metadata: AuthRequestMetadata = {},
) {
  const user = await findUserByEmail(input.email);
  const passwordHash = user?.passwordHash ?? (await dummyPasswordHash);
  const passwordIsValid = await verifyPassword(input.password, passwordHash);

  if (!user || !user.active || !passwordIsValid) {
    await createAuthEvent({
      userId: user?.id,
      email: input.email,
      eventType: "LOGIN_FAILURE",
      reason: authenticationFailureReason(user, passwordIsValid),
      ...metadata,
    });

    throw new AppError("Email ou senha invalidos.", 401);
  }

  await createAuthEvent({
    userId: user.id,
    email: user.email,
    eventType: "LOGIN_SUCCESS",
    ...metadata,
  });

  return authenticatedResult(user);
}

export async function logoutUser(
  token: string | undefined,
  metadata: AuthRequestMetadata = {},
) {
  if (!token) {
    return;
  }

  const claims = await verifyAuthToken(token);

  if (!claims) {
    return;
  }

  const user = await findActiveUserById(claims.id);

  if (!user) {
    return;
  }

  await createAuthEvent({
    userId: user.id,
    email: user.email,
    eventType: "LOGOUT",
    ...metadata,
  });
}

export async function changeOwnPassword(
  userId: string,
  input: ChangePasswordInput,
  metadata: AuthRequestMetadata = {},
) {
  const user = await findUserWithPasswordById(userId);
  const passwordIsValid = user
    ? await verifyPassword(input.currentPassword, user.passwordHash)
    : false;

  if (!user || !user.active || !passwordIsValid) {
    throw new AppError("Senha atual invalida.", 401);
  }

  const updatedUser = await updateUserPassword(user.id, {
    passwordHash: await hashPassword(input.newPassword),
    mustChangePassword: false,
  });

  if (!updatedUser) {
    throw new AppError("Usuario nao encontrado.", 404);
  }

  await createAuthEvent({
    userId: updatedUser.id,
    email: updatedUser.email,
    eventType: "PASSWORD_CHANGED",
    ...metadata,
  });

  return authenticatedResult(updatedUser);
}

async function authenticatedResult(user: User) {
  const publicUser: User = {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    branchId: user.branchId,
    branchName: user.branchName,
    active: user.active,
    permissions: user.permissions,
    mustChangePassword: user.mustChangePassword,
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

function authenticationFailureReason(
  user: User | undefined,
  passwordIsValid: boolean,
) {
  if (!user) {
    return "USER_NOT_FOUND";
  }

  if (!user.active) {
    return "INACTIVE_USER";
  }

  return passwordIsValid ? "UNKNOWN" : "INVALID_PASSWORD";
}
