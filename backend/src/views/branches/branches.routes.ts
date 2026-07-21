import { Router } from "express";
import { z } from "zod";
import {
  indexBranches,
  replaceBranch,
  storeBranch,
} from "../../controllers/branches/branches.controller.js";
import { requireAdmin } from "../../shared/auth/authorization-middleware.js";
import { validateBody } from "../../shared/validation/validate-request.js";

export const branchesRoutes = Router();

const createBranchSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    code: optionalText(40),
    legalName: optionalText(180),
    tradeName: optionalText(180),
    document: optionalText(32),
    stateRegistration: optionalText(40),
    addressStreet: optionalText(180),
    addressNumber: optionalText(30),
    addressComplement: optionalText(80),
    addressDistrict: optionalText(100),
    addressCity: optionalText(100),
    addressState: optionalText(2),
    addressZipCode: optionalText(20),
    phone: optionalText(40),
    email: optionalText(160),
  })
  .strict();

const branchParamsSchema = z.object({
  id: z.string().uuid(),
});

branchesRoutes.get("/branches", requireAdmin, async (_request, response) => {
  response.status(200).json(await indexBranches());
});

branchesRoutes.post("/branches", requireAdmin, async (request, response) => {
  const body = validateBody(request, createBranchSchema);
  const result = await storeBranch(body);

  response.status(201).json(result);
});

branchesRoutes.put("/branches/:id", requireAdmin, async (request, response) => {
  const { id } = branchParamsSchema.parse(request.params);
  const body = validateBody(request, createBranchSchema);
  const result = await replaceBranch(id, body);

  response.status(200).json(result);
});

function optionalText(max: number) {
  return z
    .union([z.string().trim().min(1).max(max), z.literal(""), z.null()])
    .transform((value) => value || null)
    .optional();
}
