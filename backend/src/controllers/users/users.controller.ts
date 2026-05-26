import { createUser, type UserCreateInput } from "../../models/users/users.model.js";
import { hashPassword } from "../../shared/auth/password.js";

export type StoreUserInput = Omit<UserCreateInput, "passwordHash"> & {
  password: string;
};

export async function storeUser(input: StoreUserInput) {
  const user = await createUser({
    name: input.name,
    email: input.email,
    passwordHash: await hashPassword(input.password),
  });

  return {
    code: 201,
    status: "success",
    data: user,
  };
}
