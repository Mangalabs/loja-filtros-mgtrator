import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { after, before, beforeEach, describe, it } from "node:test";
import { createApp } from "../app.js";
import { db } from "../database/knex.js";

type ApiResponse<T = unknown> = {
  code: number;
  status: "success" | "error";
  message?: string;
  data?: T;
  errors?: Array<{
    field?: string;
    message: string;
  }>;
};

type NamedEntity = {
  id: string;
  name: string;
  active: boolean;
};

type Product = {
  id: string;
  name: string;
  internalCode: string | null;
  barcode: string | null;
  brandId: string | null;
  brandName: string | null;
  groupName: string | null;
  unit: string;
  location: string | null;
  costPrice: string;
  salePrice: string;
  minimumStock: string;
  currentStock: string;
  ncm: string | null;
  cest: string | null;
  active: boolean;
};

type StockEntry = {
  id: string;
  productId: string;
  productName: string;
  supplierId: string;
  supplierName: string;
  quantity: string;
  unitCost: string;
  notes: string | null;
};

type StockAdjustment = {
  id: string;
  productId: string;
  productName: string;
  quantity: string;
  reason: string;
};

type StockMovement = {
  id: string;
  type: "ENTRY" | "ADJUSTMENT";
  productId: string;
  productName: string;
  supplierName: string | null;
  quantity: string;
  unitCost: string | null;
  notes: string | null;
};

type PaymentMethod = {
  id: string;
  code: string;
  name: string;
  active: boolean;
};

type Client = {
  id: string;
  personType: "PF" | "PJ" | "ES";
  name: string;
  document: string | null;
  email: string | null;
  phone: string | null;
  active: boolean;
};

type User = {
  id: string;
  name: string;
  email: string;
  role: "ADMIN";
  active: boolean;
};

type CashRegisterSession = {
  id: string;
  openedByUserId: string;
  openedByUserName: string;
  openingBalance: string;
  status: "OPEN";
  openedAt: string;
};

let server: Server;
let baseUrl: string;
let authCookie: string;

before(async () => {
  const database = await db.raw<{ rows: Array<{ name: string }> }>(
    "select current_database() as name",
  );
  const databaseName = database.rows[0]?.name;

  if (!databaseName?.endsWith("_test")) {
    throw new Error(
      `Integration tests require a database ending in _test; received ${databaseName ?? "unknown"}.`,
    );
  }

  await db.migrate.latest({
    directory: "./database/migrations",
    extension: "cjs",
  });
  await db("users").del();

  server = await new Promise<Server>((resolve) => {
    const appServer = createApp().listen(0, "127.0.0.1", () => {
      resolve(appServer);
    });
  });

  const address = server.address() as AddressInfo;
  baseUrl = `http://127.0.0.1:${address.port}`;

  const setup = await request<User>("/auth/setup", {
    method: "POST",
    authenticated: false,
    body: {
      name: "Administrador de teste",
      email: "admin@example.com",
      password: "senha-segura-123",
    },
  });

  assert.equal(setup.status, 201);
  assert.ok(setup.cookie);
  authCookie = setup.cookie!;
});

beforeEach(async () => {
  await db.raw(
    "truncate table cash_register_sessions, product_suppliers, products, product_groups, suppliers, brands, clients cascade",
  );
  await db("payment_methods").update({ active: true });
});

after(async () => {
  if (server) {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve();
      });
    });
  }

  await db.destroy();
});

describe("catalog routes", () => {
  it("returns API and health information", async () => {
    const root = await request("/");
    const health = await request("/health");
    const databaseHealth = await request("/health/database");

    assert.equal(root.status, 200);
    assert.equal(root.body.status, "success");
    assert.equal(health.status, 200);
    assert.equal(health.body.status, "ok");
    assert.equal(databaseHealth.status, 200);
    assert.equal(databaseHealth.body.status, "ok");
  });

  it("authenticates users and protects operational routes", async () => {
    const blocked = await request("/products", { authenticated: false });
    const session = await request<User>("/auth/session");
    const invalidLogin = await request("/auth/login", {
      method: "POST",
      authenticated: false,
      body: {
        email: "admin@example.com",
        password: "senha-incorreta",
      },
    });
    const login = await request<User>("/auth/login", {
      method: "POST",
      authenticated: false,
      body: {
        email: "admin@example.com",
        password: "senha-segura-123",
      },
    });
    const repeatedSetup = await request("/auth/setup", {
      method: "POST",
      authenticated: false,
      body: {
        name: "Outro administrador",
        email: "outro@example.com",
        password: "senha-segura-456",
      },
    });
    const created = await request<User>("/users", {
      method: "POST",
      body: {
        name: "Segundo usuario",
        email: "segundo@example.com",
        password: "senha-segura-789",
      },
    });
    const unauthenticatedCreate = await request("/users", {
      method: "POST",
      authenticated: false,
      body: {
        name: "Sem sessao",
        email: "sem-sessao@example.com",
        password: "senha-segura-000",
      },
    });
    const logout = await request("/auth/logout", { method: "POST" });
    const storedAdministrator = await db("users").where("email", "admin@example.com").first();
    const loginBody = login.body as ApiResponse<User> & {
      token?: string;
      data?: User & { passwordHash?: string };
    };

    assert.equal(blocked.status, 401);
    assert.equal(blocked.body.message, "Autenticacao necessaria.");
    assert.equal(session.status, 200);
    assert.equal(session.body.data?.email, "admin@example.com");
    assert.equal(invalidLogin.status, 401);
    assert.equal(invalidLogin.body.message, "Email ou senha invalidos.");
    assert.equal(login.status, 200);
    assert.ok(login.cookie?.startsWith("auth_token="));
    assert.match(login.rawCookie ?? "", /HttpOnly/);
    assert.match(login.rawCookie ?? "", /SameSite=Strict/);
    assert.equal(loginBody.token, undefined);
    assert.equal(loginBody.data?.passwordHash, undefined);
    assert.notEqual(storedAdministrator?.password_hash, "senha-segura-123");
    assert.match(storedAdministrator?.password_hash ?? "", /^scrypt\$/);
    assert.equal(repeatedSetup.status, 403);
    assert.equal(created.status, 201);
    assert.equal(created.body.data?.role, "ADMIN");
    assert.equal(unauthenticatedCreate.status, 401);
    assert.equal(logout.status, 200);
    assert.equal(logout.cookie, "auth_token=");
  });

  it("opens one cash register session for the authenticated user", async () => {
    const empty = await request<CashRegisterSession | null>("/cash-register/current");
    const opened = await request<CashRegisterSession>("/cash-register/open", {
      method: "POST",
      body: { openingBalance: 150.5 },
    });
    const current = await request<CashRegisterSession>("/cash-register/current");
    const duplicate = await request("/cash-register/open", {
      method: "POST",
      body: { openingBalance: 0 },
    });

    assert.equal(empty.status, 200);
    assert.equal(empty.body.data, null);
    assert.equal(opened.status, 201);
    assert.equal(opened.body.data?.openingBalance, "150.50");
    assert.equal(opened.body.data?.openedByUserName, "Administrador de teste");
    assert.equal(opened.body.data?.status, "OPEN");
    assert.equal(current.body.data?.id, opened.body.data?.id);
    assert.equal(duplicate.status, 409);
    assert.equal(duplicate.body.message, "Ja existe um caixa aberto.");
  });

  it("creates and lists brands", async () => {
    const created = await request<NamedEntity>("/brands", {
      method: "POST",
      body: { name: "Mann Filter" },
    });

    const listed = await request<NamedEntity[]>("/brands");

    assert.equal(created.status, 201);
    assert.equal(created.body.data?.name, "Mann Filter");
    assert.equal(listed.status, 200);
    assert.equal(listed.body.data?.length, 1);
    assert.equal(listed.body.data?.[0]?.name, "Mann Filter");
  });

  it("returns conflict when creating a duplicated brand", async () => {
    await request("/brands", {
      method: "POST",
      body: { name: "Tecfil" },
    });

    const duplicated = await request("/brands", {
      method: "POST",
      body: { name: "Tecfil" },
    });

    assert.equal(duplicated.status, 409);
    assert.equal(duplicated.body.message, "Ja existe um fabricante com esse nome.");
  });

  it("creates and lists product groups", async () => {
    const created = await request<NamedEntity>("/product-groups", {
      method: "POST",
      body: { name: "Filtros de oleo" },
    });

    const listed = await request<NamedEntity[]>("/product-groups");

    assert.equal(created.status, 201);
    assert.equal(created.body.data?.name, "Filtros de oleo");
    assert.equal(listed.status, 200);
    assert.equal(listed.body.data?.length, 1);
  });

  it("creates and lists suppliers", async () => {
    const created = await request<NamedEntity>("/suppliers", {
      method: "POST",
      body: {
        name: "Distribuidora Central",
        document: "12345678000190",
        email: "comercial@example.com",
        phone: "85999990000",
      },
    });

    const listed = await request<NamedEntity[]>("/suppliers?search=Central");

    assert.equal(created.status, 201);
    assert.equal(created.body.data?.name, "Distribuidora Central");
    assert.equal(listed.status, 200);
    assert.equal(listed.body.data?.length, 1);
  });

  it("returns validation details for invalid supplier payload", async () => {
    const response = await request("/suppliers", {
      method: "POST",
      body: { name: "", email: "email-invalido" },
    });

    assert.equal(response.status, 422);
    assert.equal(response.body.message, "Dados invalidos.");
    assert.ok(response.body.errors?.some((error) => error.field === "name"));
    assert.ok(response.body.errors?.some((error) => error.field === "email"));
  });

  it("lists and deactivates the initial payment methods", async () => {
    const listed = await request<PaymentMethod[]>("/payment-methods");
    const debit = listed.body.data?.find((paymentMethod) => paymentMethod.code === "DEBIT");

    const deactivated = await request<PaymentMethod>(`/payment-methods/${debit?.id}/status`, {
      method: "PATCH",
      body: { active: false },
    });
    const active = await request<PaymentMethod[]>("/payment-methods?active=true");

    assert.equal(listed.status, 200);
    assert.deepEqual(
      listed.body.data?.map((paymentMethod) => paymentMethod.code),
      ["PIX", "DEBIT", "BOLETO"],
    );
    assert.equal(deactivated.status, 200);
    assert.equal(deactivated.body.data?.active, false);
    assert.deepEqual(
      active.body.data?.map((paymentMethod) => paymentMethod.code),
      ["PIX", "BOLETO"],
    );
  });

  it("updates inactive clients without changing their status", async () => {
    const created = await request<Client>("/clients", {
      method: "POST",
      body: {
        personType: "PF",
        name: "Ana Cliente",
        document: "12345678900",
        email: "ana@example.com",
        phone: "85999990000",
      },
    });
    const listed = await request<Client[]>("/clients?search=12345678900");
    const deactivated = await request<Client>(`/clients/${created.body.data?.id}/status`, {
      method: "PATCH",
      body: { active: false },
    });
    const updated = await request<Client>(`/clients/${created.body.data?.id}`, {
      method: "PUT",
      body: {
        personType: "PJ",
        name: "Ana Filtros LTDA",
        document: "",
        email: "",
        phone: "8533330000",
      },
    });
    const active = await request<Client[]>("/clients?active=true");

    assert.equal(created.status, 201);
    assert.equal(created.body.data?.personType, "PF");
    assert.equal(listed.status, 200);
    assert.equal(listed.body.data?.length, 1);
    assert.equal(updated.status, 200);
    assert.equal(updated.body.data?.personType, "PJ");
    assert.equal(updated.body.data?.name, "Ana Filtros LTDA");
    assert.equal(updated.body.data?.document, null);
    assert.equal(updated.body.data?.email, null);
    assert.equal(deactivated.status, 200);
    assert.equal(deactivated.body.data?.active, false);
    assert.equal(updated.body.data?.active, false);
    assert.equal(active.body.data?.length, 0);
  });

  it("returns validation details for invalid client person type", async () => {
    const response = await request("/clients", {
      method: "POST",
      body: { personType: "INVALID", name: "Cliente" },
    });

    assert.equal(response.status, 422);
    assert.equal(response.body.message, "Dados invalidos.");
    assert.ok(response.body.errors?.some((error) => error.field === "personType"));
  });

  it("creates, lists, shows, updates, and deactivates products", async () => {
    const brand = await request<NamedEntity>("/brands", {
      method: "POST",
      body: { name: "Wega" },
    });
    const group = await request<NamedEntity>("/product-groups", {
      method: "POST",
      body: { name: "Filtro de ar" },
    });

    const created = await request<Product>("/products", {
      method: "POST",
      body: {
        name: "Filtro Wega FAP4040",
        internalCode: "FAP4040",
        barcode: "7890000000011",
        brandId: brand.body.data?.id,
        groupId: group.body.data?.id,
        unit: "KIT",
        location: "Corredor A - Prateleira 2",
        costPrice: 18.5,
        salePrice: 29.9,
        minimumStock: 3,
        ncm: "84212300",
        cest: "0100100",
      },
    });

    const listed = await request<Product[]>("/products?search=Wega");
    const shown = await request<Product>(`/products/${created.body.data?.id}`);
    const updated = await request<Product>(`/products/${created.body.data?.id}`, {
      method: "PUT",
      body: {
        name: "Filtro Wega FAP4040 Atualizado",
        salePrice: 31.9,
        location: "",
      },
    });
    const deactivated = await request<Product>(`/products/${created.body.data?.id}/status`, {
      method: "PATCH",
      body: { active: false },
    });

    assert.equal(created.status, 201);
    assert.equal(created.body.data?.brandId, brand.body.data?.id);
    assert.equal(created.body.data?.brandName, "Wega");
    assert.equal(created.body.data?.groupName, "Filtro de ar");
    assert.equal(created.body.data?.unit, "KIT");
    assert.equal(created.body.data?.location, "Corredor A - Prateleira 2");
    assert.equal(created.body.data?.currentStock, "0.000");
    assert.equal(created.body.data?.ncm, "84212300");
    assert.equal(created.body.data?.cest, "0100100");
    assert.equal(listed.status, 200);
    assert.equal(listed.body.data?.length, 1);
    assert.equal(shown.status, 200);
    assert.equal(shown.body.data?.internalCode, "FAP4040");
    assert.equal(updated.status, 200);
    assert.equal(updated.body.data?.name, "Filtro Wega FAP4040 Atualizado");
    assert.equal(updated.body.data?.location, null);
    assert.equal(deactivated.status, 200);
    assert.equal(deactivated.body.data?.active, false);
  });

  it("returns conflict when creating products with duplicated barcode", async () => {
    await request("/products", {
      method: "POST",
      body: {
        name: "Filtro A",
        barcode: "7890000000028",
      },
    });

    const duplicated = await request("/products", {
      method: "POST",
      body: {
        name: "Filtro B",
        barcode: "7890000000028",
      },
    });

    assert.equal(duplicated.status, 409);
    assert.equal(duplicated.body.message, "Ja existe um produto com esse codigo de barras.");
  });

  it("lists only active products that require stock replenishment", async () => {
    const supplier = await request<NamedEntity>("/suppliers", {
      method: "POST",
      body: { name: "Fornecedor para reposicao" },
    });
    const lowStock = await request<Product>("/products", {
      method: "POST",
      body: { name: "Filtro em falta", minimumStock: 5 },
    });
    const replenished = await request<Product>("/products", {
      method: "POST",
      body: { name: "Filtro reposto", minimumStock: 2 },
    });
    const notConfigured = await request<Product>("/products", {
      method: "POST",
      body: { name: "Filtro sem minimo" },
    });
    const inactive = await request<Product>("/products", {
      method: "POST",
      body: { name: "Filtro inativo em falta", minimumStock: 3 },
    });

    await request("/stock-entries", {
      method: "POST",
      body: {
        productId: replenished.body.data?.id,
        supplierId: supplier.body.data?.id,
        quantity: 4,
        unitCost: 10,
      },
    });
    await request(`/products/${inactive.body.data?.id}/status`, {
      method: "PATCH",
      body: { active: false },
    });

    const response = await request<Product[]>("/products/low-stock");

    assert.equal(response.status, 200);
    assert.equal(response.body.data?.length, 1);
    assert.equal(response.body.data?.[0]?.id, lowStock.body.data?.id);
    assert.equal(response.body.data?.[0]?.currentStock, "0.000");
    assert.equal(response.body.data?.[0]?.minimumStock, "5.000");
    assert.notEqual(response.body.data?.[0]?.id, notConfigured.body.data?.id);
  });

  it("records a stock entry and updates product balance and supplier cost", async () => {
    const supplier = await request<NamedEntity>("/suppliers", {
      method: "POST",
      body: { name: "Distribuidora de Filtros" },
    });
    const product = await request<Product>("/products", {
      method: "POST",
      body: {
        name: "Filtro para entrada",
        costPrice: 10,
      },
    });

    const created = await request<StockEntry>("/stock-entries", {
      method: "POST",
      body: {
        productId: product.body.data?.id,
        supplierId: supplier.body.data?.id,
        quantity: 12.5,
        unitCost: 14.9,
        notes: "Recebimento inicial",
      },
    });
    const listed = await request<StockEntry[]>("/stock-entries");
    const updatedProduct = await request<Product>(`/products/${product.body.data?.id}`);
    const productSupplier = await db("product_suppliers")
      .where({
        product_id: product.body.data?.id,
        supplier_id: supplier.body.data?.id,
      })
      .first();

    assert.equal(created.status, 201);
    assert.equal(created.body.data?.productName, "Filtro para entrada");
    assert.equal(created.body.data?.supplierName, "Distribuidora de Filtros");
    assert.equal(created.body.data?.quantity, "12.500");
    assert.equal(created.body.data?.unitCost, "14.90");
    assert.equal(created.body.data?.notes, "Recebimento inicial");
    assert.equal(listed.status, 200);
    assert.equal(listed.body.data?.length, 1);
    assert.equal(updatedProduct.body.data?.currentStock, "12.500");
    assert.equal(updatedProduct.body.data?.costPrice, "14.90");
    assert.equal(productSupplier?.last_cost_price, "14.90");
  });

  it("does not update product balance when a stock entry supplier is invalid", async () => {
    const product = await request<Product>("/products", {
      method: "POST",
      body: { name: "Filtro sem entrada valida" },
    });

    const response = await request("/stock-entries", {
      method: "POST",
      body: {
        productId: product.body.data?.id,
        supplierId: "00000000-0000-4000-8000-000000000001",
        quantity: 4,
        unitCost: 11.5,
      },
    });
    const unchangedProduct = await request<Product>(`/products/${product.body.data?.id}`);
    const entries = await request<StockEntry[]>("/stock-entries");

    assert.equal(response.status, 422);
    assert.equal(response.body.message, "Fornecedor informado nao encontrado.");
    assert.equal(unchangedProduct.body.data?.currentStock, "0.000");
    assert.equal(entries.body.data?.length, 0);
  });

  it("records a stock adjustment and changes current product balance", async () => {
    const supplier = await request<NamedEntity>("/suppliers", {
      method: "POST",
      body: { name: "Fornecedor do ajuste" },
    });
    const product = await request<Product>("/products", {
      method: "POST",
      body: { name: "Filtro para ajuste" },
    });

    await request("/stock-entries", {
      method: "POST",
      body: {
        productId: product.body.data?.id,
        supplierId: supplier.body.data?.id,
        quantity: 10,
        unitCost: 8,
      },
    });

    const created = await request<StockAdjustment>("/stock-adjustments", {
      method: "POST",
      body: {
        productId: product.body.data?.id,
        quantity: -3,
        reason: "Item avariado no estoque",
      },
    });
    const increased = await request<StockAdjustment>("/stock-adjustments", {
      method: "POST",
      body: {
        productId: product.body.data?.id,
        quantity: 2,
        reason: "Unidades localizadas na contagem",
      },
    });
    const listed = await request<StockAdjustment[]>("/stock-adjustments");
    const updatedProduct = await request<Product>(`/products/${product.body.data?.id}`);

    assert.equal(created.status, 201);
    assert.equal(created.body.data?.productName, "Filtro para ajuste");
    assert.equal(created.body.data?.quantity, "-3.000");
    assert.equal(created.body.data?.reason, "Item avariado no estoque");
    assert.equal(increased.status, 201);
    assert.equal(increased.body.data?.quantity, "2.000");
    assert.equal(listed.body.data?.length, 2);
    assert.equal(updatedProduct.body.data?.currentStock, "9.000");
  });

  it("lists entries and adjustments in the stock movement history", async () => {
    const supplier = await request<NamedEntity>("/suppliers", {
      method: "POST",
      body: { name: "Fornecedor do historico" },
    });
    const product = await request<Product>("/products", {
      method: "POST",
      body: { name: "Filtro com historico" },
    });

    await request("/stock-entries", {
      method: "POST",
      body: {
        productId: product.body.data?.id,
        supplierId: supplier.body.data?.id,
        quantity: 5,
        unitCost: 11.9,
        notes: "Compra inicial",
      },
    });
    await request("/stock-adjustments", {
      method: "POST",
      body: {
        productId: product.body.data?.id,
        quantity: -1,
        reason: "Avaria identificada",
      },
    });

    const response = await request<StockMovement[]>("/stock-movements");
    const entry = response.body.data?.find((movement) => movement.type === "ENTRY");
    const adjustment = response.body.data?.find((movement) => movement.type === "ADJUSTMENT");

    assert.equal(response.status, 200);
    assert.equal(response.body.data?.length, 2);
    assert.equal(entry?.productName, "Filtro com historico");
    assert.equal(entry?.supplierName, "Fornecedor do historico");
    assert.equal(entry?.quantity, "5.000");
    assert.equal(entry?.unitCost, "11.90");
    assert.equal(adjustment?.productName, "Filtro com historico");
    assert.equal(adjustment?.supplierName, null);
    assert.equal(adjustment?.quantity, "-1.000");
    assert.equal(adjustment?.notes, "Avaria identificada");
  });

  it("rejects a stock adjustment that would create negative balance", async () => {
    const product = await request<Product>("/products", {
      method: "POST",
      body: { name: "Filtro com saldo insuficiente" },
    });

    const response = await request("/stock-adjustments", {
      method: "POST",
      body: {
        productId: product.body.data?.id,
        quantity: -1,
        reason: "Contagem fisica",
      },
    });
    const unchangedProduct = await request<Product>(`/products/${product.body.data?.id}`);
    const adjustments = await request<StockAdjustment[]>("/stock-adjustments");

    assert.equal(response.status, 422);
    assert.equal(response.body.message, "Ajuste nao pode resultar em estoque negativo.");
    assert.equal(unchangedProduct.body.data?.currentStock, "0.000");
    assert.equal(adjustments.body.data?.length, 0);
  });
});

async function request<T = unknown>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    authenticated?: boolean;
  } = {},
) {
  const headers: Record<string, string> = {};

  if (options.body) {
    headers["content-type"] = "application/json";
  }

  if (options.authenticated !== false && authCookie) {
    headers.cookie = authCookie;
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const body = (await response.json()) as ApiResponse<T>;
  const rawCookie = response.headers.get("set-cookie");

  return {
    status: response.status,
    body,
    cookie: rawCookie?.split(";")[0],
    rawCookie,
  };
}
