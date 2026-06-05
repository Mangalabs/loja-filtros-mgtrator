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
  active: boolean;
};

export type ClientInput = {
  personType: Client["personType"];
  name: string;
  document?: string | null;
  email?: string | null;
  phone?: string | null;
};

const clientColumns = [
  "id",
  "person_type as personType",
  "name",
  "document",
  "email",
  "phone",
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
  };
}
