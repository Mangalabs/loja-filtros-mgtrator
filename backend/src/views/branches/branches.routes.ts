import { Router } from "express";
import { z } from "zod";
import {
  indexBranches,
  storeBranch,
} from "../../controllers/branches/branches.controller.js";
import { requireAdmin } from "../../shared/auth/authorization-middleware.js";
import { validateBody } from "../../shared/validation/validate-request.js";

export const branchesRoutes = Router();

const createBranchSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    code: optionalText(40),
  })
  .strict();

branchesRoutes.get("/branches", requireAdmin, async (_request, response) => {
  response.status(200).json(await indexBranches());
});

branchesRoutes.post("/branches", requireAdmin, async (request, response) => {
  const body = validateBody(request, createBranchSchema);
  const result = await storeBranch(body);

  response.status(201).json(result);
});

function optionalText(max: number) {
  return z
    .union([z.string().trim().min(1).max(max), z.literal(""), z.null()])
    .transform((value) => value || null)
    .optional();
}
