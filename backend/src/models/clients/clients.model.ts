import { db } from "../../database/knex.js";

export type ClientListFilters = {
  search?: string;
  active?: boolean;
};

export type Client = {
  id: string;
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
  "id",
  "person_type as personType",
  "name",
  "document",
  "email",
  "phone",
  "state_registration as stateRegistration",
  "state_registration_indicator as stateRegistrationIndicator",
  "address_street as addressStreet",
  "address_number as addressNumber",
  "address_complement as addressComplement",
  "address_district as addressDistrict",
  "address_city as addressCity",
  "address_state as addressState",
  "address_zip_code as addressZipCode",
  "active",
];

export async function listClients(
  filters: ClientListFilters,
): Promise<Client[]> {
  return db("clients")
    .select(clientColumns)
    .modify((query) => {
      if (filters.search) {
        query.where((builder) => {
          builder
            .whereILike("name", `%${filters.search}%`)
            .orWhereILike("document", `%${filters.search}%`);
        });
      }

      if (typeof filters.active === "boolean") {
        query.where("active", filters.active);
      }
    })
    .orderBy("name", "asc");
}

export async function createClient(input: ClientInput): Promise<Client> {
  const [client] = await db("clients")
    .insert(toDatabaseInput(input))
    .returning(clientColumns);

  return client;
}

export async function updateClient(
  id: string,
  input: ClientInput,
): Promise<Client | undefined> {
  const [client] = await db("clients")
    .where("id", id)
    .update({
      ...toDatabaseInput(input),
      updated_at: db.fn.now(),
    })
    .returning(clientColumns);

  return client;
}

export async function updateClientStatus(
  id: string,
  active: boolean,
): Promise<Client | undefined> {
  const [client] = await db("clients")
    .where("id", id)
    .update({
      active,
      updated_at: db.fn.now(),
    })
    .returning(clientColumns);

  return client;
}

function toDatabaseInput(input: ClientInput) {
  return {
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
