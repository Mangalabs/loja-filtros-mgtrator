import { db } from "../../database/knex.js";

export type ClientListFilters = {
  branchId: string;
  search?: string;
  active?: boolean;
};

export type Client = {
  id: string;
  branchId: string | null;
  branchName: string | null;
  personType: "PF" | "PJ" | "ES";
  name: string;
  document: string | null;
  email: string | null;
  phone: string | null;
  stateRegistration: string | null;
  stateRegistrationIndicator: "1" | "2" | "9" | null;
  addressStreet: string | null;
  addressNumber: string | null;
  addressComplement: string | null;
  addressDistrict: string | null;
  addressCity: string | null;
  addressState: string | null;
  addressZipCode: string | null;
  active: boolean;
};

export type ClientInput = {
  branchId: string;
  personType: Client["personType"];
  name: string;
  document?: string | null;
  email?: string | null;
  phone?: string | null;
  stateRegistration?: string | null;
  stateRegistrationIndicator?: Client["stateRegistrationIndicator"];
  addressStreet?: string | null;
  addressNumber?: string | null;
  addressComplement?: string | null;
  addressDistrict?: string | null;
  addressCity?: string | null;
  addressState?: string | null;
  addressZipCode?: string | null;
};

const clientColumns = [
  "clients.id",
  "clients.branch_id as branchId",
  "branches.name as branchName",
  "clients.person_type as personType",
  "clients.name",
  "clients.document",
  "clients.email",
  "clients.phone",
  "clients.state_registration as stateRegistration",
  "clients.state_registration_indicator as stateRegistrationIndicator",
  "clients.address_street as addressStreet",
  "clients.address_number as addressNumber",
  "clients.address_complement as addressComplement",
  "clients.address_district as addressDistrict",
  "clients.address_city as addressCity",
  "clients.address_state as addressState",
  "clients.address_zip_code as addressZipCode",
  "clients.active",
];

export async function listClients(
  filters: ClientListFilters,
): Promise<Client[]> {
  return clientsQuery()
    .where("clients.branch_id", filters.branchId)
    .modify((query) => {
      if (filters.search) {
        query.where((builder) => {
          builder
            .whereILike("clients.name", `%${filters.search}%`)
            .orWhereILike("clients.document", `%${filters.search}%`);
        });
      }

      if (typeof filters.active === "boolean") {
        query.where("clients.active", filters.active);
      }
    })
    .orderBy("clients.name", "asc");
}

export async function createClient(input: ClientInput): Promise<Client> {
  const [created] = await db("clients")
    .insert(toDatabaseInput(input))
    .returning("id");

  return findClientById(created.id);
}

export async function updateClient(
  id: string,
  branchId: string,
  input: ClientInput,
): Promise<Client | undefined> {
  const [updated] = await db("clients")
    .where({ id, branch_id: branchId })
    .update({
      ...toDatabaseInput(input),
      updated_at: db.fn.now(),
    })
    .returning("id");

  return updated ? findClientById(updated.id) : undefined;
}

export async function updateClientStatus(
  id: string,
  branchId: string,
  active: boolean,
): Promise<Client | undefined> {
  const [updated] = await db("clients")
    .where({ id, branch_id: branchId })
    .update({
      active,
      updated_at: db.fn.now(),
    })
    .returning("id");

  return updated ? findClientById(updated.id) : undefined;
}

function toDatabaseInput(input: ClientInput) {
  return {
    branch_id: input.branchId,
    person_type: input.personType,
    name: input.name,
    document: input.document,
    email: input.email,
    phone: input.phone,
    state_registration: input.stateRegistration,
    state_registration_indicator: input.stateRegistrationIndicator,
    address_street: input.addressStreet,
    address_number: input.addressNumber,
    address_complement: input.addressComplement,
    address_district: input.addressDistrict,
    address_city: input.addressCity,
    address_state: input.addressState,
    address_zip_code: input.addressZipCode,
  };
}

function clientsQuery() {
  return db("clients")
    .leftJoin("branches", "branches.id", "clients.branch_id")
    .select<Client[]>(clientColumns);
}

async function findClientById(id: string): Promise<Client> {
  const client = await clientsQuery().where("clients.id", id).first();

  if (!client) {
    throw new Error("Client was not found after persistence");
  }

  return client;
}
