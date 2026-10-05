const localHosts = new Set(["127.0.0.1", "::1", "localhost"]);

exports.seed = async function seed(knex) {
  assertLocalDevelopment(knex);

  const branchQuery = knex("branches")
    .select([
      "id",
      "name",
      "code",
      "address_city as addressCity",
      "address_state as addressState",
    ])
    .where("active", true)
    .orderBy("created_at", "asc");
  const requestedBranchCode = process.env.LOCAL_TEST_BRANCH_CODE?.trim();

  if (requestedBranchCode) {
    branchQuery.andWhere("code", requestedBranchCode);
  }

  const branch = await branchQuery.first();

  if (!branch) {
    throw new Error(
      requestedBranchCode
        ? `No active local branch found with code ${requestedBranchCode}.`
        : "No active local branch found for Smart Match test data.",
    );
  }

  await knex.transaction(async (transaction) => {
    const brands = await ensureNamedRecords(transaction, "brands", [
      "Donaldson",
      "Fleetguard",
      "Tecfil",
      "Wega",
    ]);
    const groups = await ensureNamedRecords(transaction, "product_groups", [
      "Filtros de Ar",
      "Filtros de Combustível",
      "Filtros Hidráulicos",
      "Filtros Lubrificantes",
    ]);

    for (const client of testClients) {
      await upsertLocalClient(transaction, branch, client);
    }

    for (const product of testProducts) {
      await upsertLocalProduct(transaction, branch.id, product, brands, groups);
    }
  });

  const [{ count: clientCount }] = await knex("clients")
    .where("branch_id", branch.id)
    .whereLike("document", "TESTE-CLIENTE-%")
    .count("id");
  const [{ count: productCount }] = await knex("products")
    .where("branch_id", branch.id)
    .whereLike("internal_code", "SM-%")
    .count("id");

  console.log(
    `Local Smart Match data ready in branch ${branch.name} (${branch.code}): ${clientCount} clients and ${productCount} products.`,
  );
};

function assertLocalDevelopment(knex) {
  if (
    process.env.NODE_ENV !== "development" ||
    process.env.ALLOW_LOCAL_TEST_SEED !== "true"
  ) {
    throw new Error(
      "This seed requires NODE_ENV=development and ALLOW_LOCAL_TEST_SEED=true.",
    );
  }

  const connection = knex.client.config.connection;
  const host =
    typeof connection === "string"
      ? new URL(connection).hostname
      : connection?.host;

  if (!host || !localHosts.has(host)) {
    throw new Error(
      `Refusing to seed a non-local database host (${host ?? "unknown"}).`,
    );
  }
}

async function ensureNamedRecords(transaction, table, names) {
  const records = new Map();

  for (const name of names) {
    await transaction(table)
      .insert({ name, active: true })
      .onConflict("name")
      .ignore();
    const record = await transaction(table)
      .where({ name })
      .first(["id", "name"]);

    records.set(record.name, record.id);
  }

  return records;
}

async function upsertLocalClient(transaction, branch, client) {
  const existing = await transaction("clients")
    .where({ branch_id: branch.id, document: client.document })
    .first("id");
  const values = {
    branch_id: branch.id,
    person_type: client.personType,
    name: client.name,
    document: client.document,
    email: client.email,
    phone: client.phone,
    state_registration: null,
    state_registration_indicator: "9",
    address_city: branch.addressCity ?? branch.name,
    address_state: branch.addressState,
    active: true,
    updated_at: transaction.fn.now(),
  };

  if (existing) {
    await transaction("clients").where("id", existing.id).update(values);
    return;
  }

  await transaction("clients").insert(values);
}

async function upsertLocalProduct(
  transaction,
  branchId,
  product,
  brands,
  groups,
) {
  const existing = await transaction("products")
    .where({ branch_id: branchId, internal_code: product.internalCode })
    .first("id");
  const values = {
    branch_id: branchId,
    name: product.name,
    internal_code: product.internalCode,
    brand_id: brands.get(product.brand),
    group_id: groups.get(product.group),
    unit: "UN",
    location: product.location,
    cost_price: product.costPrice,
    sale_price: product.salePrice,
    minimum_stock: 2,
    current_stock: product.currentStock,
    description: product.description,
    active: true,
    deleted_at: null,
    updated_at: transaction.fn.now(),
  };

  if (existing) {
    await transaction("products").where("id", existing.id).update(values);
    return;
  }

  await transaction("products").insert(values);
}

const testClients = [
  {
    personType: "PF",
    name: "João Ferreira - Cliente Teste",
    document: "TESTE-CLIENTE-001",
    email: "joao.ferreira@example.test",
    phone: "(99) 90000-0101",
  },
  {
    personType: "PF",
    name: "João Fernandes - Cliente Teste",
    document: "TESTE-CLIENTE-002",
    email: "joao.fernandes@example.test",
    phone: "(99) 90000-0102",
  },
  {
    personType: "PF",
    name: "Maria Oliveira - Cliente Teste",
    document: "TESTE-CLIENTE-003",
    email: "maria.oliveira@example.test",
    phone: "(99) 90000-0103",
  },
  {
    personType: "PJ",
    name: "Oficina Central Tratores - Cliente Teste",
    document: "TESTE-CLIENTE-004",
    email: "oficina.central@example.test",
    phone: "(99) 90000-0104",
  },
  {
    personType: "PJ",
    name: "Fazenda Boa Esperança - Cliente Teste",
    document: "TESTE-CLIENTE-005",
    email: "fazenda.esperanca@example.test",
    phone: "(99) 90000-0105",
  },
  {
    personType: "PJ",
    name: "Agropecuária Maranhão - Cliente Teste",
    document: "TESTE-CLIENTE-006",
    email: "agro.maranhao@example.test",
    phone: "(99) 90000-0106",
  },
  {
    personType: "PF",
    name: "Carlos Mendes - Cliente Teste",
    document: "TESTE-CLIENTE-007",
    email: "carlos.mendes@example.test",
    phone: "(99) 90000-0107",
  },
  {
    personType: "PJ",
    name: "Transportadora Vale Verde - Cliente Teste",
    document: "TESTE-CLIENTE-008",
    email: "vale.verde@example.test",
    phone: "(99) 90000-0108",
  },
];

const testProducts = [
  testProduct("SM-JD6110-COMB-P", "Filtro combustível primário John Deere 6110 - Teste", "Wega", "Filtros de Combustível", "Filtro diesel primário para trator John Deere 6110", "A-01-01", 78, 129.9, 12),
  testProduct("SM-JD6110-COMB-S", "Filtro combustível secundário John Deere 6110 - Teste", "Fleetguard", "Filtros de Combustível", "Elemento secundário do combustível diesel JD 6110", "A-01-02", 69, 118.5, 8),
  testProduct("SM-JD6110-AR-E", "Filtro de ar externo John Deere 6110 - Teste", "Donaldson", "Filtros de Ar", "Filtro externo de ar do motor para trator 6110", "A-02-01", 145, 239.9, 5),
  testProduct("SM-JD6110-AR-I", "Filtro de ar interno John Deere 6110 - Teste", "Donaldson", "Filtros de Ar", "Elemento interno de segurança do filtro de ar JD 6110", "A-02-02", 82, 139.9, 7),
  testProduct("SM-JD6110-LUB", "Filtro lubrificante John Deere 6110 - Teste", "Tecfil", "Filtros Lubrificantes", "Filtro de óleo lubrificante do motor John Deere 6110", "A-03-01", 42, 74.9, 18),
  testProduct("SM-JD6110-HID", "Filtro hidráulico John Deere 6110 - Teste", "Wega", "Filtros Hidráulicos", "Filtro do sistema hidráulico e transmissão JD 6110", "A-04-01", 132, 219.9, 4),
  testProduct("SM-MF4292-COMB", "Filtro combustível Massey Ferguson 4292 - Teste", "Fleetguard", "Filtros de Combustível", "Filtro diesel para trator Massey Ferguson MF 4292", "B-01-01", 61, 109.9, 9),
  testProduct("SM-MF4292-AR", "Filtro de ar Massey Ferguson 4292 - Teste", "Donaldson", "Filtros de Ar", "Elemento de ar para Massey Ferguson MF 4292", "B-02-01", 136, 229.9, 3),
  testProduct("SM-VALTRA-BH180-COMB", "Filtro combustível Valtra BH180 - Teste", "Wega", "Filtros de Combustível", "Filtro separador de água diesel Valtra BH 180", "C-01-01", 74, 124.9, 10),
  testProduct("SM-VALTRA-BH180-HID", "Filtro hidráulico Valtra BH180 - Teste", "Fleetguard", "Filtros Hidráulicos", "Filtro hidráulico da transmissão Valtra BH 180", "C-04-01", 158, 259.9, 6),
  testProduct("SM-CASE-MX180-AR", "Filtro de ar Case MX180 - Teste", "Donaldson", "Filtros de Ar", "Filtro principal de ar para trator Case MX 180", "D-02-01", 149, 249.9, 5),
  testProduct("SM-CASE-MX180-LUB", "Filtro lubrificante Case MX180 - Teste", "Tecfil", "Filtros Lubrificantes", "Filtro de óleo do motor Case MX 180", "D-03-01", 48, 84.9, 14),
  testProduct("SM-VOLVO-EC210-HID", "Filtro hidráulico Volvo EC210 - Teste", "Donaldson", "Filtros Hidráulicos", "Filtro hidráulico para escavadeira Volvo EC 210", "E-04-01", 175, 289.9, 2),
  testProduct("SM-VOLVO-EC210-COMB", "Filtro combustível Volvo EC210 - Teste", "Fleetguard", "Filtros de Combustível", "Filtro diesel para escavadeira Volvo EC 210", "E-01-01", 89, 149.9, 11),
  testProduct("SM-GENERICO-10M", "Elemento filtrante hidráulico 10 mícrons - Teste", "Wega", "Filtros Hidráulicos", "Elemento de retorno hidráulico dez micra", "F-04-01", 97, 164.9, 15),
  testProduct("SM-GENERICO-AR", "Filtro de ar para máquinas agrícolas - Teste", "Tecfil", "Filtros de Ar", "Elemento de ar aplicação agrícola universal", "F-02-01", 55, 94.9, 20),
];

function testProduct(
  internalCode,
  name,
  brand,
  group,
  description,
  location,
  costPrice,
  salePrice,
  currentStock,
) {
  return {
    internalCode,
    name,
    brand,
    group,
    description,
    location,
    costPrice,
    salePrice,
    currentStock,
  };
}
