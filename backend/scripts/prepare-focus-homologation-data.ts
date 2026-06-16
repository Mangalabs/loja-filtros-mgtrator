import { db } from "../src/database/knex.js";

const baseUrl = "http://127.0.0.1:3333";
const timestamp = new Date()
  .toISOString()
  .replace(/[-:TZ.]/g, "")
  .slice(0, 14);

let cookie = "";

type ApiOptions = RequestInit & {
  headers?: Record<string, string>;
};

async function api<T>(path: string, options: ApiOptions = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
      ...(options.headers ?? {}),
    },
  });
  const setCookie = response.headers.get("set-cookie");

  if (setCookie) {
    cookie = setCookie.split(";")[0] ?? "";
  }

  const payload = (await response.json().catch(() => null)) as T;

  if (!response.ok) {
    throw new Error(
      JSON.stringify({ path, status: response.status, payload }, null, 2),
    );
  }

  return payload;
}

type ApiResult<T> = {
  data: T;
};

type Entity = {
  id: string;
  name: string;
};

type PaymentMethod = Entity & {
  active: boolean;
};

type Sale = {
  id: string;
  totalAmount: string;
};

await api("/auth/login", {
  method: "POST",
  body: JSON.stringify({
    email: "admin@loja-filtros.local",
    password: "TesteLocal#2026",
  }),
});

const removedMockFiscalDocuments = await db("fiscal_documents")
  .where({ provider: "MOCK" })
  .del();

const clientUpdates = await db("clients")
  .where((builder) => {
    builder
      .whereNull("state_registration_indicator")
      .orWhereNull("address_street")
      .orWhereNull("address_number")
      .orWhereNull("address_district")
      .orWhereNull("address_city")
      .orWhereNull("address_state")
      .orWhereNull("address_zip_code")
      .orWhereRaw(
        "regexp_replace(coalesce(document, ''), '\\D', '', 'g') !~ '^([0-9]{11}|[0-9]{14})$'",
      );
  })
  .update({
    document: db.raw(
      "case when person_type = 'PJ' then '11222333000181' when person_type = 'ES' then document else '11144477735' end",
    ),
    state_registration_indicator: "9",
    address_street: "Avenida Bernardo Sayao",
    address_number: "965",
    address_complement: "Loja",
    address_district: "Vila Cearense",
    address_city: "Araguaina",
    address_state: "TO",
    address_zip_code: "77818340",
    updated_at: db.fn.now(),
  });

const productUpdates = await db("products")
  .where((builder) => {
    builder
      .whereNull("ncm")
      .orWhereNull("cfop")
      .orWhereNull("origin")
      .orWhereNull("icms_cst")
      .orWhereNull("pis_cst")
      .orWhereNull("cofins_cst")
      .orWhereRaw("coalesce(ncm, '') !~ '^[0-9]{8}$'")
      .orWhereRaw("coalesce(cfop, '') !~ '^[0-9]{4}$'")
      .orWhereRaw("coalesce(origin, '') !~ '^[0-8]$'")
      .orWhereRaw("coalesce(icms_cst, '') !~ '^[0-9]{2,3}$'")
      .orWhereRaw("coalesce(pis_cst, '') !~ '^[0-9]{2}$'")
      .orWhereRaw("coalesce(cofins_cst, '') !~ '^[0-9]{2}$'");
  })
  .update({
    ncm: "84219999",
    cfop: "5102",
    origin: "0",
    icms_cst: "102",
    pis_cst: "49",
    cofins_cst: "49",
    updated_at: db.fn.now(),
  });

const brand = (
  await api<ApiResult<Entity>>("/brands", {
    method: "POST",
    body: JSON.stringify({ name: `HOMOLOGACAO FOCUS ${timestamp}` }),
  })
).data;

const client = (
  await api<ApiResult<Entity>>("/clients", {
    method: "POST",
    body: JSON.stringify({
      personType: "PF",
      name: `HOMOLOGACAO FOCUS Cliente ${timestamp}`,
      document: "11144477735",
      email: "financeiro@mgtratorpecas.com.br",
      phone: "63999828455",
      stateRegistrationIndicator: "9",
      addressStreet: "Avenida Bernardo Sayao",
      addressNumber: "965",
      addressComplement: "Loja",
      addressDistrict: "Vila Cearense",
      addressCity: "Araguaina",
      addressState: "TO",
      addressZipCode: "77818340",
    }),
  })
).data;

const product = (
  await api<ApiResult<Entity>>("/products", {
    method: "POST",
    body: JSON.stringify({
      name: `HOMOLOGACAO FOCUS Filtro Completo ${timestamp}`,
      internalCode: `FOCUS-${timestamp}`,
      barcode: `789${timestamp.slice(2, 13)}`,
      brandId: brand.id,
      unit: "UN",
      location: "HOMOLOGACAO",
      costPrice: 80,
      salePrice: 150,
      minimumStock: 2,
      ncm: "84219999",
      cfop: "5102",
      origin: "0",
      icmsCst: "102",
      pisCst: "49",
      cofinsCst: "49",
      description: "Filtro completo para homologacao de NF-e",
    }),
  })
).data;

await api("/stock-adjustments", {
  method: "POST",
  body: JSON.stringify({
    productId: product.id,
    quantity: 20,
    reason: "Carga inicial para homologacao Focus NFe",
  }),
});

const paymentMethods = (await api<ApiResult<PaymentMethod[]>>(
  "/payment-methods",
)).data;
const paymentMethod =
  paymentMethods.find((method) => method.name === "Boleto" && method.active) ??
  paymentMethods.find((method) => method.active);

if (!paymentMethod) {
  throw new Error("Nenhuma forma de pagamento ativa encontrada.");
}

const sale = (
  await api<ApiResult<Sale>>("/sales", {
    method: "POST",
    body: JSON.stringify({
      paymentMethodId: paymentMethod.id,
      clientId: client.id,
      items: [{ productId: product.id, quantity: 1 }],
    }),
  })
).data;

const fiscalDocuments = await db("fiscal_documents")
  .select("provider", "status")
  .orderBy("created_at", "desc");

console.log(
  JSON.stringify(
    {
      removedMockFiscalDocuments,
      completedExistingClients: clientUpdates,
      completedExistingProducts: productUpdates,
      created: {
        brand,
        client,
        product,
        sale,
      },
      fiscalDocuments,
    },
    null,
    2,
  ),
);

await db.destroy();
