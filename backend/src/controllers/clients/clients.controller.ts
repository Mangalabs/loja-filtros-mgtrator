import { lookupCompanyByCnpj } from "../../integrations/company-registry/brasilapi-cnpj.js";
import {
  createClient,
  listClients,
  updateClient,
  updateClientStatus,
  type ClientInput,
  type ClientListFilters,
} from "../../models/clients/clients.model.js";
import { AppError } from "../../shared/errors/app-error.js";

export async function indexClients(filters: ClientListFilters) {
  const clients = await listClients(filters);

  return {
    code: 200,
    status: "success",
    data: clients,
  };
}

export async function storeClient(
  input: Omit<ClientInput, "branchId">,
  branchId: string,
) {
  const client = await createClient({ ...input, branchId });

  return {
    code: 201,
    status: "success",
    data: client,
  };
}

export async function lookupClientCompany(cnpj: string) {
  return {
    code: 200,
    status: "success",
    data: await lookupCompanyByCnpj(cnpj),
  };
}

export async function replaceClient(
  id: string,
  input: Omit<ClientInput, "branchId">,
  branchId: string,
) {
  const client = await updateClient(id, branchId, { ...input, branchId });

  if (!client) {
    throw new AppError("Client not found", 404);
  }

  return {
    code: 200,
    status: "success",
    data: client,
  };
}

export async function changeClientStatus(
  id: string,
  branchId: string,
  active: boolean,
) {
  const client = await updateClientStatus(id, branchId, active);

  if (!client) {
    throw new AppError("Client not found", 404);
  }

  return {
    code: 200,
    status: "success",
    data: client,
  };
}
