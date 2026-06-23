import { Router, type Response } from "express";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import {
  authenticateUser,
  setupInitialUser,
  showSetupStatus,
} from "../../controllers/auth/auth.controller.js";
import { env } from "../../config/env.js";
import {
  authCookieName,
  requireAuthentication,
} from "../../shared/auth/authentication-middleware.js";
import { validateBody } from "../../shared/validation/validate-request.js";

export const authRoutes = Router();

const credentialsSchema = z
  .object({
    email: z
      .email()
      .max(160)
      .transform((email) => email.trim().toLowerCase()),
    password: z.string().min(12).max(128),
  })
  .strict();

const setupSchema = credentialsSchema
  .extend({
    name: z.string().trim().min(1).max(160),
    phone: optionalText(32),
  })
  .strict();

const authenticationRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: (_request, response) => {
    response.status(429).json({
      code: 429,
      status: "error",
      message: "Muitas tentativas de autenticacao. Tente novamente mais tarde.",
    });
  },
});

authRoutes.get("/auth/setup", async (_request, response) => {
  response.status(200).json(await showSetupStatus());
});

authRoutes.post(
  "/auth/setup",
  authenticationRateLimit,
  async (request, response) => {
    const body = validateBody(request, setupSchema);
    const result = await setupInitialUser(body);

    setAuthCookie(response, result.token);
    response.status(201).json({ ...result.response, code: 201 });
  },
);

authRoutes.post(
  "/auth/login",
  authenticationRateLimit,
  async (request, response) => {
    const body = validateBody(request, credentialsSchema);
    const result = await authenticateUser(body);

    setAuthCookie(response, result.token);
    response.status(200).json(result.response);
  },
);

authRoutes.get("/auth/session", requireAuthentication, (_request, response) => {
  response.status(200).json({
    code: 200,
    status: "success",
    data: response.locals.authenticatedUser,
  });
});

authRoutes.post("/auth/logout", (_request, response) => {
  response.clearCookie(authCookieName, cookieOptions());
  response.status(200).json({
    code: 200,
    status: "success",
    data: null,
  });
});

function setAuthCookie(response: Response, token: string) {
  response.cookie(authCookieName, token, {
    ...cookieOptions(),
    maxAge: 8 * 60 * 60 * 1000,
  });
}

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: env.authCookie.sameSite,
    secure: env.authCookie.secure,
    path: "/",
  };
}

function optionalText(max: number) {
  return z
    .union([z.string().trim().min(1).max(max), z.literal(""), z.null()])
    .transform((value) => value || null)
    .optional();
}
