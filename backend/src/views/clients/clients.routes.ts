import { Router } from "express";
import { z } from "zod";
import {
  changeClientStatus,
  indexClients,
  lookupClientCompany,
  replaceClient,
  storeClient,
} from "../../controllers/clients/clients.controller.js";
import {
  parseBooleanFilter,
  parseStringFilter,
} from "../../shared/http/query-params.js";
import { requireActiveBranchId } from "../../shared/auth/branch-context.js";
import { validateBody } from "../../shared/validation/validate-request.js";

export const clientsRoutes = Router();

const clientSchema = z
  .object({
    personType: z.enum(["PF", "PJ", "ES"]),
    name: z.string().trim().min(1).max(160),
    document: optionalText(32),
    email: z
      .union([z.email().max(160), z.literal(""), z.null()])
      .transform((value) => value || null)
      .optional(),
    phone: optionalText(32),
    stateRegistration: optionalText(32),
    stateRegistrationIndicator: z
      .union([z.enum(["1", "2", "9"]), z.literal(""), z.null()])
      .transform((value) => value || null)
      .optional(),
    addressStreet: optionalText(160),
    addressNumber: optionalText(32),
    addressComplement: optionalText(80),
    addressDistrict: optionalText(80),
    addressCity: optionalText(80),
    addressState: optionalText(2),
    addressZipCode: optionalText(16),
  })
  .strict();

const clientParamsSchema = z.object({
  id: z.uuid(),
});

const cnpjParamsSchema = z.object({
  cnpj: z.string().trim().min(1).max(32),
});

const updateClientStatusSchema = z.object({
  active: z.boolean(),
});

clientsRoutes.get("/clients", async (request, response) => {
  const result = await indexClients({
    branchId: requireActiveBranchId(response.locals),
    active: parseBooleanFilter(request.query.active),
    search: parseStringFilter(request.query.search),
  });

  response.status(200).json(result);
});

clientsRoutes.get("/clients/cnpj/:cnpj", async (request, response) => {
  const { cnpj } = cnpjParamsSchema.parse(request.params);

  response.status(200).json(await lookupClientCompany(cnpj));
});

clientsRoutes.post("/clients", async (request, response) => {
  const body = validateBody(request, clientSchema);
  const result = await storeClient(body, requireActiveBranchId(response.locals));

  response.status(201).json(result);
});

clientsRoutes.put("/clients/:id", async (request, response) => {
  const { id } = clientParamsSchema.parse(request.params);
  const body = validateBody(request, clientSchema);
  const result = await replaceClient(
    id,
    body,
    requireActiveBranchId(response.locals),
  );

  response.status(200).json(result);
});

clientsRoutes.patch("/clients/:id/status", async (request, response) => {
  const { id } = clientParamsSchema.parse(request.params);
  const body = validateBody(request, updateClientStatusSchema);
  const result = await changeClientStatus(
    id,
    requireActiveBranchId(response.locals),
    body.active,
  );

  response.status(200).json(result);
});

function optionalText(max: number) {
  return z
    .union([z.string().trim().min(1).max(max), z.literal(""), z.null()])
    .transform((value) => value || null)
    .optional();
}
