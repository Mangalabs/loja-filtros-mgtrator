import { SignJWT, jwtVerify } from "jose";
import { env } from "../../config/env.js";

const issuer = "loja-filtros-backend";
const audience = "loja-filtros-frontend";
const expirationTime = "8h";
const key = new TextEncoder().encode(env.jwtSecret);

export type AuthenticatedUser = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role: "ADMIN";
};

export async function issueAuthToken(user: AuthenticatedUser): Promise<string> {
  return new SignJWT({
    name: user.name,
    email: user.email,
    phone: user.phone ?? null,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(issuer)
    .setAudience(audience)
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(expirationTime)
    .sign(key);
}

export async function verifyAuthToken(token: string): Promise<AuthenticatedUser | undefined> {
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
      (typeof payload.phone !== "string" && payload.phone !== null && typeof payload.phone !== "undefined") ||
      payload.role !== "ADMIN"
    ) {
      return undefined;
    }

    return {
      id: payload.sub,
      name: payload.name,
      email: payload.email,
      phone: typeof payload.phone === "string" ? payload.phone : null,
      role: payload.role,
    };
  } catch {
    return undefined;
  }
}
