import { db } from "../../database/knex.js";

export type Branch = {
  id: string;
  name: string;
  code: string | null;
  legalName: string | null;
  tradeName: string | null;
  document: string | null;
  stateRegistration: string | null;
  addressStreet: string | null;
  addressNumber: string | null;
  addressComplement: string | null;
  addressDistrict: string | null;
  addressCity: string | null;
  addressState: string | null;
  addressZipCode: string | null;
  phone: string | null;
  email: string | null;
  active: boolean;
};

export type BranchCreateInput = {
  name: string;
  code?: string | null;
  legalName?: string | null;
  tradeName?: string | null;
  document?: string | null;
  stateRegistration?: string | null;
  addressStreet?: string | null;
  addressNumber?: string | null;
  addressComplement?: string | null;
  addressDistrict?: string | null;
  addressCity?: string | null;
  addressState?: string | null;
  addressZipCode?: string | null;
  phone?: string | null;
  email?: string | null;
};

export type BranchUpdateInput = BranchCreateInput;

const branchColumns = [
  "id",
  "name",
  "code",
  "legal_name as legalName",
  "trade_name as tradeName",
  "document",
  "state_registration as stateRegistration",
  "address_street as addressStreet",
  "address_number as addressNumber",
  "address_complement as addressComplement",
  "address_district as addressDistrict",
  "address_city as addressCity",
  "address_state as addressState",
  "address_zip_code as addressZipCode",
  "phone",
  "email",
  "active",
];

export async function listBranches(): Promise<Branch[]> {
  return db("branches").select(branchColumns).orderBy("name", "asc");
}

export async function findActiveBranchById(
  id: string,
): Promise<Branch | undefined> {
  return db("branches").select(branchColumns).where({ id, active: true }).first();
}

export async function findBranchById(id: string): Promise<Branch | undefined> {
  return db("branches").select(branchColumns).where({ id }).first();
}

export async function createBranch(input: BranchCreateInput): Promise<Branch> {
  const [branch] = await db("branches")
    .insert(toDatabaseInput(input))
    .returning(branchColumns);

  return branch;
}

export async function updateBranch(
  id: string,
  input: BranchUpdateInput,
): Promise<Branch | undefined> {
  const [branch] = await db("branches")
    .where({ id })
    .update({
      ...toDatabaseInput(input),
      updated_at: db.fn.now(),
    })
    .returning(branchColumns);

  return branch;
}

function toDatabaseInput(input: BranchCreateInput) {
  return {
    name: input.name,
    code: input.code,
    legal_name: input.legalName,
    trade_name: input.tradeName,
    document: input.document,
    state_registration: input.stateRegistration,
    address_street: input.addressStreet,
    address_number: input.addressNumber,
    address_complement: input.addressComplement,
    address_district: input.addressDistrict,
    address_city: input.addressCity,
    address_state: input.addressState,
    address_zip_code: input.addressZipCode,
    phone: input.phone,
    email: input.email,
  };
}
