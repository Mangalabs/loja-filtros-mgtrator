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

export async function storeClient(input: ClientInput) {
  const client = await createClient(input);

  return {
    code: 201,
    status: "success",
    data: client,
  };
}

export async function replaceClient(id: string, input: ClientInput) {
  const client = await updateClient(id, input);

  if (!client) {
    throw new AppError("Client not found", 404);
  }

  return {
    code: 200,
    status: "success",
    data: client,
  };
}

export async function changeClientStatus(id: string, active: boolean) {
  const client = await updateClientStatus(id, active);

  if (!client) {
    throw new AppError("Client not found", 404);
  }

  return {
    code: 200,
    status: "success",
    data: client,
  };
}
