import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { after, before, beforeEach, describe, it } from "node:test";
import { createApp } from "../app.js";
import { env } from "../config/env.js";
import {
  cancelFiscalDocument,
  syncFiscalDocument,
} from "../controllers/fiscal-documents/fiscal-documents.controller.js";
import { db } from "../database/knex.js";
import type { FiscalIssueRequest } from "../integrations/fiscal/fiscal-provider.js";
import { FocusFiscalProvider } from "../integrations/fiscal/providers/focus-fiscal-provider.js";

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
  reservedStock: string;
  availableStock: string;
  ncm: string | null;
  cest: string | null;
  cfop: string | null;
  icmsCst: string | null;
  pisCst: string | null;
  cofinsCst: string | null;
  origin: string | null;
  description: string | null;
  active: boolean;
};

type StockEntry = {
  id: string;
  productId: string;
  productName: string;
  supplierId: string;
  supplierName: string;
  createdByUserName: string | null;
  quantity: string;
  unitCost: string;
  notes: string | null;
};

type StockAdjustment = {
  id: string;
  productId: string;
  productName: string;
  createdByUserName: string | null;
  quantity: string;
  reason: string;
};

type StockMovement = {
  id: string;
  type: "ENTRY" | "ADJUSTMENT" | "SALE" | "SALE_CANCEL" | "SALE_RETURN";
  productId: string;
  productName: string;
  supplierName: string | null;
  createdByUserId: string | null;
  createdByUserName: string | null;
  quantity: string;
  unitCost: string | null;
  notes: string | null;
};

type Sale = {
  id: string;
  productId: string;
  productName: string;
  quantity: string;
  unitPrice: string;
  subtotalAmount: string;
  discountAmount: string;
  totalAmount: string;
  items: Array<{
    id: string;
    productId: string;
    productName: string;
    quantity: string;
    unitPrice: string;
    totalAmount: string;
    position: number;
  }>;
  clientName: string | null;
  paymentMethodName: string;
  createdByUserName: string;
  cancelledByUserName: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  status: "COMPLETED" | "CANCELLED";
};

type ShippingOrder = {
  id: string;
  quoteId: string | null;
  clientName: string;
  clientPhone: string | null;
  productName: string;
  quantity: string;
  unitPrice: string;
  totalAmount: string;
  items: Array<{
    id: string;
    productId: string;
    productName: string;
    description: string | null;
    quantity: string;
    unitPrice: string;
    totalAmount: string;
    position: number;
  }>;
  approvedByUserName: string | null;
  separatedAt: string | null;
  separatedByUserName: string | null;
  saleId: string | null;
  completedByUserName: string | null;
  completedAt: string | null;
  cancelledByUserName: string | null;
  cancellationReason: string | null;
  status: "QUOTED" | "APPROVED" | "SEPARATED" | "CANCELLED" | "COMPLETED";
};

type PickupReservation = {
  id: string;
  clientName: string;
  clientPhone: string | null;
  productName: string;
  quantity: string;
  unitPrice: string;
  totalAmount: string;
  items: Array<{
    id: string;
    productId: string;
    productName: string;
    quantity: string;
    unitPrice: string;
    totalAmount: string;
    position: number;
  }>;
  saleId: string | null;
  completedByUserName: string | null;
  completedAt: string | null;
  cancelledByUserName: string | null;
  cancellationReason: string | null;
  status: "RESERVED" | "CANCELLED" | "COMPLETED";
};

type Quote = {
  id: string;
  clientName: string;
  clientPhone: string | null;
  status: "DRAFT" | "CANCELLED";
  showBrand: boolean;
  subtotalAmount: string;
  discountAmount: string;
  totalAmount: string;
  validUntil: string | null;
  notes: string | null;
  cancelledByUserName: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  shippingOrderId: string | null;
  shippingOrderStatus:
    | "QUOTED"
    | "APPROVED"
    | "SEPARATED"
    | "CANCELLED"
    | "COMPLETED"
    | null;
  createdByUserName: string;
  items: Array<{
    id: string;
    productId: string;
    productName: string;
    description: string;
    quantity: string;
    unitPrice: string;
    discountAmount: string;
    totalAmount: string;
    position: number;
  }>;
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

type User = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: "ADMIN";
  active: boolean;
};

type CashRegisterSession = {
  id: string;
  openedByUserId: string;
  openedByUserName: string;
  openingBalance: string;
  closingBalance: string | null;
  closedByUserId: string | null;
  closedByUserName: string | null;
  status: "OPEN" | "CLOSED";
  openedAt: string;
  closedAt: string | null;
  salesTotal: string;
  supplyTotal: string;
  withdrawalTotal: string;
  expectedClosingBalance: string;
  difference: string | null;
  movements: Array<{
    id: string;
    type: "SUPPLY" | "WITHDRAWAL";
    amount: string;
    reason: string;
    createdByUserName: string;
  }>;
  paymentSummary: Array<{
    paymentMethodId: string;
    paymentMethodName: string;
    paymentMethodCode: string;
    amount: string;
  }>;
  closingPaymentSummary: Array<{
    paymentMethodId: string;
    paymentMethodName: string;
    paymentMethodCode: string;
    amount: string;
    expectedAmount: string;
    difference: string;
  }>;
};

type ReportsOverview = {
  salesCount: number;
  salesTotalAmount: string;
  lowStockProductsCount: number;
  openShippingOrdersCount: number;
  openPickupReservationsCount: number;
  openCashRegister: {
    id: string;
    openedByUserName: string;
    openedAt: string;
  } | null;
};

type FiscalDocument = {
  id: string;
  sourceType: "SALE" | "SHIPPING_ORDER" | "PICKUP_RESERVATION";
  sourceId: string;
  documentType: "NFE" | "NFCE";
  provider: "MOCK" | "FOCUS";
  environment: "HOMOLOGATION" | "PRODUCTION";
  status: "PENDING" | "PROCESSING" | "AUTHORIZED" | "REJECTED" | "CANCELLED";
  accessKey: string | null;
  providerReference: string | null;
  number: number | null;
  series: number | null;
  xmlUrl: string | null;
  pdfUrl: string | null;
  rejectionReason: string | null;
  issuedByUserName: string;
  cancelledByUserName: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
};

type FiscalSettings = {
  id: string;
  provider: "MOCK" | "FOCUS";
  environment: "HOMOLOGATION" | "PRODUCTION";
  companyCnpj: string | null;
  allowProduction: boolean;
  createdAt: string;
  updatedAt: string;
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
  env.fiscal.provider = "mock";

  await db.raw(
    "truncate table fiscal_settings, fiscal_documents, cash_register_sessions, product_suppliers, products, product_groups, suppliers, brands, clients cascade",
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
        phone: "85911110000",
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
    const storedAdministrator = await db("users")
      .where("email", "admin@example.com")
      .first();
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
    assert.equal(created.body.data?.phone, "85911110000");
    assert.equal(unauthenticatedCreate.status, 401);
    assert.equal(logout.status, 200);
    assert.equal(logout.cookie, "auth_token=");
  });

  it("shows and updates fiscal settings with production guard", async () => {
    const blocked = await request("/fiscal-settings", {
      authenticated: false,
    });
    const current = await request<FiscalSettings>("/fiscal-settings");
    const updated = await request<FiscalSettings>("/fiscal-settings", {
      method: "PUT",
      body: {
        provider: "FOCUS",
        environment: "HOMOLOGATION",
        companyCnpj: "12.345.678/0001-90",
        allowProduction: false,
      },
    });
    const listedAfterUpdate =
      await request<FiscalSettings>("/fiscal-settings");
    const blockedProduction = await request("/fiscal-settings", {
      method: "PUT",
      body: {
        provider: "FOCUS",
        environment: "PRODUCTION",
        companyCnpj: "12.345.678/0001-90",
        allowProduction: false,
      },
    });
    const invalidCompanyCnpj = await request("/fiscal-settings", {
      method: "PUT",
      body: {
        provider: "FOCUS",
        environment: "HOMOLOGATION",
        companyCnpj: "123",
        allowProduction: false,
      },
    });
    const missingProductionConfirmation = await request("/fiscal-settings", {
      method: "PUT",
      body: {
        provider: "FOCUS",
        environment: "PRODUCTION",
        companyCnpj: "12.345.678/0001-90",
        allowProduction: true,
      },
    });
    const homologationProductionFlag = await request<FiscalSettings>(
      "/fiscal-settings",
      {
        method: "PUT",
        body: {
          provider: "MOCK",
          environment: "HOMOLOGATION",
          companyCnpj: null,
          allowProduction: true,
        },
      },
    );
    const production = await request<FiscalSettings>("/fiscal-settings", {
      method: "PUT",
      body: {
        provider: "FOCUS",
        environment: "PRODUCTION",
        companyCnpj: "12.345.678/0001-90",
        allowProduction: true,
        productionConfirmation: "EMITIR EM PRODUCAO",
      },
    });

    assert.equal(blocked.status, 401);
    assert.equal(current.status, 200);
    assert.equal(current.body.data?.provider, "MOCK");
    assert.equal(current.body.data?.environment, "HOMOLOGATION");
    assert.equal(current.body.data?.allowProduction, false);
    assert.equal(updated.status, 200);
    assert.equal(updated.body.data?.provider, "FOCUS");
    assert.equal(updated.body.data?.environment, "HOMOLOGATION");
    assert.equal(updated.body.data?.companyCnpj, "12345678000190");
    assert.equal(updated.body.data?.allowProduction, false);
    assert.equal(listedAfterUpdate.body.data?.id, updated.body.data?.id);
    assert.equal(listedAfterUpdate.body.data?.companyCnpj, "12345678000190");
    assert.equal(blockedProduction.status, 422);
    assert.equal(
      blockedProduction.body.message,
      "Ambiente de producao exige confirmacao explicita.",
    );
    assert.equal(invalidCompanyCnpj.status, 422);
    assert.equal(
      invalidCompanyCnpj.body.message,
      "CNPJ fiscal da loja deve ter 14 digitos para usar Focus NFe.",
    );
    assert.equal(missingProductionConfirmation.status, 422);
    assert.equal(
      missingProductionConfirmation.body.message,
      "Digite EMITIR EM PRODUCAO para habilitar emissao em producao.",
    );
    assert.equal(homologationProductionFlag.status, 200);
    assert.equal(
      homologationProductionFlag.body.data?.environment,
      "HOMOLOGATION",
    );
    assert.equal(homologationProductionFlag.body.data?.allowProduction, false);
    assert.equal(production.status, 200);
    assert.equal(production.body.data?.environment, "PRODUCTION");
    assert.equal(production.body.data?.allowProduction, true);
  });

  it("opens one cash register session for the authenticated user", async () => {
    const empty = await request<CashRegisterSession | null>(
      "/cash-register/current",
    );
    const opened = await request<CashRegisterSession>("/cash-register/open", {
      method: "POST",
      body: { openingBalance: 150.5 },
    });
    const current = await request<CashRegisterSession>(
      "/cash-register/current",
    );
    const duplicate = await request("/cash-register/open", {
      method: "POST",
      body: { openingBalance: 0 },
    });

    assert.equal(empty.status, 200);
    assert.equal(empty.body.data, null);
    assert.equal(opened.status, 201);
    assert.equal(opened.body.data?.openingBalance, "150.50");
    assert.equal(opened.body.data?.salesTotal, "0.00");
    assert.equal(opened.body.data?.expectedClosingBalance, "150.50");
    assert.equal(opened.body.data?.openedByUserName, "Administrador de teste");
    assert.equal(opened.body.data?.status, "OPEN");
    assert.equal(current.body.data?.id, opened.body.data?.id);
    assert.equal(duplicate.status, 409);
    assert.equal(duplicate.body.message, "Ja existe um caixa aberto.");
  });

  it("records cash register supply and withdrawal movements", async () => {
    const movementWithoutCash = await request("/cash-register/movements", {
      method: "POST",
      body: {
        type: "SUPPLY",
        amount: 50,
        reason: "Troco inicial complementar",
      },
    });

    await request("/cash-register/open", {
      method: "POST",
      body: { openingBalance: 100 },
    });

    const supply = await request<CashRegisterSession>(
      "/cash-register/movements",
      {
        method: "POST",
        body: {
          type: "SUPPLY",
          amount: 50,
          reason: "Troco inicial complementar",
        },
      },
    );
    const withdrawal = await request<CashRegisterSession>(
      "/cash-register/movements",
      {
        method: "POST",
        body: {
          type: "WITHDRAWAL",
          amount: 20,
          reason: "Sangria para cofre",
        },
      },
    );
    const closed = await request<CashRegisterSession>("/cash-register/close", {
      method: "PATCH",
      body: { closingBalance: 125 },
    });

    assert.equal(movementWithoutCash.status, 422);
    assert.equal(
      movementWithoutCash.body.message,
      "Abra o caixa antes de registrar movimentacoes.",
    );
    assert.equal(supply.status, 201);
    assert.equal(supply.body.data?.supplyTotal, "50.00");
    assert.equal(supply.body.data?.withdrawalTotal, "0.00");
    assert.equal(supply.body.data?.expectedClosingBalance, "150.00");
    assert.equal(withdrawal.status, 201);
    assert.equal(withdrawal.body.data?.supplyTotal, "50.00");
    assert.equal(withdrawal.body.data?.withdrawalTotal, "20.00");
    assert.equal(withdrawal.body.data?.expectedClosingBalance, "130.00");
    assert.equal(withdrawal.body.data?.movements.length, 2);
    assert.equal(withdrawal.body.data?.movements[0]?.type, "WITHDRAWAL");
    assert.equal(
      withdrawal.body.data?.movements[0]?.createdByUserName,
      "Administrador de teste",
    );
    assert.equal(closed.body.data?.expectedClosingBalance, "130.00");
    assert.equal(closed.body.data?.difference, "-5.00");
  });

  it("closes the current cash register with a payment summary", async () => {
    const closeWithoutCash = await request("/cash-register/close", {
      method: "PATCH",
      body: { closingBalance: 0 },
    });
    const product = await request<Product>("/products", {
      method: "POST",
      body: { name: "Filtro para fechamento", salePrice: 29.9 },
    });
    const paymentMethods = await request<PaymentMethod[]>(
      "/payment-methods?active=true",
    );
    const pix = paymentMethods.body.data?.find(
      (paymentMethod) => paymentMethod.code === "PIX",
    );

    await request("/stock-adjustments", {
      method: "POST",
      body: {
        productId: product.body.data?.id,
        quantity: 3,
        reason: "Saldo para fechamento",
      },
    });
    await request("/cash-register/open", {
      method: "POST",
      body: { openingBalance: 100 },
    });
    await request("/sales", {
      method: "POST",
      body: {
        productId: product.body.data?.id,
        paymentMethodId: pix?.id,
        quantity: 2,
      },
    });

    const current = await request<CashRegisterSession | null>(
      "/cash-register/current",
    );
    const closed = await request<CashRegisterSession>("/cash-register/close", {
      method: "PATCH",
      body: {
        closingBalance: 160,
        closingPayments: [{ paymentMethodId: pix?.id, amount: 60 }],
      },
    });
    const currentAfterClose = await request<CashRegisterSession | null>(
      "/cash-register/current",
    );
    const saleAfterClose = await request("/sales", {
      method: "POST",
      body: {
        productId: product.body.data?.id,
        paymentMethodId: pix?.id,
        quantity: 1,
      },
    });
    const reopened = await request<CashRegisterSession>("/cash-register/open", {
      method: "POST",
      body: { openingBalance: 0 },
    });

    assert.equal(closeWithoutCash.status, 422);
    assert.equal(
      closeWithoutCash.body.message,
      "Nao existe caixa aberto para fechamento.",
    );
    assert.equal(current.body.data?.salesTotal, "59.80");
    assert.equal(current.body.data?.expectedClosingBalance, "159.80");
    assert.equal(
      current.body.data?.paymentSummary[0]?.paymentMethodCode,
      "PIX",
    );
    assert.equal(current.body.data?.paymentSummary[0]?.amount, "59.80");
    assert.equal(closed.status, 200);
    assert.equal(closed.body.data?.status, "CLOSED");
    assert.equal(closed.body.data?.closingBalance, "160.00");
    assert.equal(closed.body.data?.closedByUserName, "Administrador de teste");
    assert.equal(closed.body.data?.salesTotal, "59.80");
    assert.equal(closed.body.data?.expectedClosingBalance, "159.80");
    assert.equal(closed.body.data?.difference, "0.20");
    assert.equal(
      closed.body.data?.closingPaymentSummary[0]?.paymentMethodCode,
      "PIX",
    );
    assert.equal(closed.body.data?.closingPaymentSummary[0]?.amount, "60.00");
    assert.equal(
      closed.body.data?.closingPaymentSummary[0]?.expectedAmount,
      "59.80",
    );
    assert.equal(
      closed.body.data?.closingPaymentSummary[0]?.difference,
      "0.20",
    );
    assert.equal(currentAfterClose.body.data, null);
    assert.equal(saleAfterClose.status, 422);
    assert.equal(
      saleAfterClose.body.message,
      "Abra o caixa antes de registrar uma venda.",
    );
    assert.equal(reopened.status, 201);
  });

  it("records a counter sale with discount", async () => {
    const product = await request<Product>("/products", {
      method: "POST",
      body: { name: "Filtro com desconto", salePrice: 40 },
    });
    const paymentMethods = await request<PaymentMethod[]>(
      "/payment-methods?active=true",
    );
    const pix = paymentMethods.body.data?.find(
      (paymentMethod) => paymentMethod.code === "PIX",
    );

    await request("/stock-adjustments", {
      method: "POST",
      body: {
        productId: product.body.data?.id,
        quantity: 3,
        reason: "Saldo inicial para venda com desconto",
      },
    });
    await request("/cash-register/open", {
      method: "POST",
      body: { openingBalance: 0 },
    });

    const excessiveDiscount = await request("/sales", {
      method: "POST",
      body: {
        productId: product.body.data?.id,
        paymentMethodId: pix?.id,
        quantity: 2,
        discountAmount: 90,
      },
    });
    const created = await request<Sale>("/sales", {
      method: "POST",
      body: {
        productId: product.body.data?.id,
        paymentMethodId: pix?.id,
        quantity: 2,
        discountAmount: 15,
      },
    });
    const cash = await request<CashRegisterSession | null>(
      "/cash-register/current",
    );

    assert.equal(excessiveDiscount.status, 422);
    assert.equal(
      excessiveDiscount.body.message,
      "Desconto nao pode ser maior que o subtotal da venda.",
    );
    assert.equal(created.status, 201);
    assert.equal(created.body.data?.subtotalAmount, "80.00");
    assert.equal(created.body.data?.discountAmount, "15.00");
    assert.equal(created.body.data?.totalAmount, "65.00");
    assert.equal(cash.body.data?.salesTotal, "65.00");
    assert.equal(cash.body.data?.paymentSummary[0]?.amount, "65.00");
  });

  it("records a one-item counter sale and decreases product stock", async () => {
    const product = await request<Product>("/products", {
      method: "POST",
      body: { name: "Filtro para venda", salePrice: 29.9 },
    });
    const client = await request<Client>("/clients", {
      method: "POST",
      body: { personType: "PF", name: "Cliente da venda" },
    });
    const paymentMethods = await request<PaymentMethod[]>(
      "/payment-methods?active=true",
    );
    const pix = paymentMethods.body.data?.find(
      (paymentMethod) => paymentMethod.code === "PIX",
    );

    await request("/stock-adjustments", {
      method: "POST",
      body: {
        productId: product.body.data?.id,
        quantity: 5,
        reason: "Saldo inicial para teste de venda",
      },
    });

    const withoutCash = await request("/sales", {
      method: "POST",
      body: {
        productId: product.body.data?.id,
        clientId: client.body.data?.id,
        paymentMethodId: pix?.id,
        quantity: 2,
      },
    });

    await request("/cash-register/open", {
      method: "POST",
      body: { openingBalance: 0 },
    });

    const created = await request<Sale>("/sales", {
      method: "POST",
      body: {
        productId: product.body.data?.id,
        clientId: client.body.data?.id,
        paymentMethodId: pix?.id,
        quantity: 2,
      },
    });
    const insufficient = await request("/sales", {
      method: "POST",
      body: {
        productId: product.body.data?.id,
        paymentMethodId: pix?.id,
        quantity: 4,
      },
    });
    const listed = await request<Sale[]>("/sales");
    const updatedProduct = await request<Product>(
      `/products/${product.body.data?.id}`,
    );
    const movements = await request<StockMovement[]>("/stock-movements");
    const saleMovement = movements.body.data?.find(
      (movement) => movement.type === "SALE",
    );
    const cashBeforeCancellation =
      await request<CashRegisterSession | null>("/cash-register/current");
    const cancelled = await request<Sale>(
      `/sales/${created.body.data?.id}/cancel`,
      {
        method: "PATCH",
        body: { reason: "Cliente desistiu da compra de balcao" },
      },
    );
    const fiscalDocumentForCancelledSale = await request(
      `/sales/${created.body.data?.id}/fiscal-documents`,
      {
        method: "POST",
        body: { documentType: "NFE" },
      },
    );
    const repeatedCancellation = await request(
      `/sales/${created.body.data?.id}/cancel`,
      {
        method: "PATCH",
        body: { reason: "Tentativa repetida" },
      },
    );
    const productAfterCancellation = await request<Product>(
      `/products/${product.body.data?.id}`,
    );
    const cashAfterCancellation =
      await request<CashRegisterSession | null>("/cash-register/current");
    const reportsAfterCancellation =
      await request<ReportsOverview>("/reports/overview");
    const movementsAfterCancellation =
      await request<StockMovement[]>("/stock-movements");
    const reversalMovement = movementsAfterCancellation.body.data?.find(
      (movement) => movement.type === "SALE_CANCEL",
    );

    assert.equal(withoutCash.status, 422);
    assert.equal(
      withoutCash.body.message,
      "Abra o caixa antes de registrar uma venda.",
    );
    assert.equal(created.status, 201);
    assert.equal(created.body.data?.productName, "Filtro para venda");
    assert.equal(created.body.data?.clientName, "Cliente da venda");
    assert.equal(created.body.data?.paymentMethodName, "PIX");
    assert.equal(created.body.data?.quantity, "2.000");
    assert.equal(created.body.data?.unitPrice, "29.90");
    assert.equal(created.body.data?.totalAmount, "59.80");
    assert.equal(
      created.body.data?.createdByUserName,
      "Administrador de teste",
    );
    assert.equal(insufficient.status, 422);
    assert.equal(
      insufficient.body.message,
      "Estoque insuficiente para concluir a venda.",
    );
    assert.equal(listed.body.data?.length, 1);
    assert.equal(updatedProduct.body.data?.currentStock, "3.000");
    assert.equal(saleMovement?.quantity, "-2.000");
    assert.equal(cashBeforeCancellation.body.data?.salesTotal, "59.80");
    assert.equal(cancelled.status, 200);
    assert.equal(cancelled.body.data?.status, "CANCELLED");
    assert.equal(
      cancelled.body.data?.cancelledByUserName,
      "Administrador de teste",
    );
    assert.equal(
      cancelled.body.data?.cancellationReason,
      "Cliente desistiu da compra de balcao",
    );
    assert.ok(cancelled.body.data?.cancelledAt);
    assert.equal(fiscalDocumentForCancelledSale.status, 422);
    assert.equal(
      fiscalDocumentForCancelledSale.body.message,
      "Venda cancelada nao pode emitir NF-e.",
    );
    assert.equal(repeatedCancellation.status, 409);
    assert.equal(
      repeatedCancellation.body.message,
      "Esta venda ja foi cancelada.",
    );
    assert.equal(productAfterCancellation.body.data?.currentStock, "5.000");
    assert.equal(cashAfterCancellation.body.data?.salesTotal, "0.00");
    assert.equal(reportsAfterCancellation.body.data?.salesCount, 0);
    assert.equal(reversalMovement?.quantity, "2.000");
  });

  it("returns a counter sale item to stock", async () => {
    const product = await request<Product>("/products", {
      method: "POST",
      body: { name: "Filtro para devolucao", salePrice: 50 },
    });
    const paymentMethods = await request<PaymentMethod[]>(
      "/payment-methods?active=true",
    );
    const pix = paymentMethods.body.data?.find(
      (paymentMethod) => paymentMethod.code === "PIX",
    );

    await request("/stock-adjustments", {
      method: "POST",
      body: {
        productId: product.body.data?.id,
        quantity: 5,
        reason: "Saldo inicial para devolucao",
      },
    });
    await request("/cash-register/open", {
      method: "POST",
      body: { openingBalance: 0 },
    });

    const created = await request<Sale>("/sales", {
      method: "POST",
      body: {
        productId: product.body.data?.id,
        paymentMethodId: pix?.id,
        quantity: 3,
      },
    });
    const returned = await request<Sale>(
      `/sales/${created.body.data?.id}/returns`,
      {
        method: "POST",
        body: {
          saleItemId: created.body.data?.items[0]?.id,
          quantity: 1,
          reason: "Cliente devolveu uma unidade",
        },
      },
    );
    const excessiveReturn = await request(
      `/sales/${created.body.data?.id}/returns`,
      {
        method: "POST",
        body: {
          saleItemId: created.body.data?.items[0]?.id,
          quantity: 3,
          reason: "Tentativa acima do saldo vendido",
        },
      },
    );
    const updatedProduct = await request<Product>(
      `/products/${product.body.data?.id}`,
    );
    const movements = await request<StockMovement[]>("/stock-movements");
    const returnMovement = movements.body.data?.find(
      (movement) => movement.type === "SALE_RETURN",
    );

    assert.equal(returned.status, 200);
    assert.equal(returned.body.data?.status, "COMPLETED");
    assert.equal(excessiveReturn.status, 422);
    assert.equal(
      excessiveReturn.body.message,
      "Quantidade de devolucao maior que quantidade disponivel do item.",
    );
    assert.equal(updatedProduct.body.data?.currentStock, "3.000");
    assert.equal(returnMovement?.quantity, "1.000");
    assert.equal(returnMovement?.notes, "Cliente devolveu uma unidade");
    assert.equal(returnMovement?.createdByUserName, "Administrador de teste");
  });

  it("issues a mock fiscal document for a completed sale", async () => {
    const product = await request<Product>("/products", {
      method: "POST",
      body: { name: "Filtro com nota", salePrice: 35 },
    });
    const client = await request<Client>("/clients", {
      method: "POST",
      body: {
        personType: "PF",
        name: "Cliente fiscal",
        document: "12345678901",
      },
    });
    const paymentMethods = await request<PaymentMethod[]>(
      "/payment-methods?active=true",
    );
    const pix = paymentMethods.body.data?.find(
      (paymentMethod) => paymentMethod.code === "PIX",
    );

    await request("/stock-adjustments", {
      method: "POST",
      body: {
        productId: product.body.data?.id,
        quantity: 2,
        reason: "Saldo para nota fiscal",
      },
    });
    await request("/cash-register/open", {
      method: "POST",
      body: { openingBalance: 0 },
    });

    const sale = await request<Sale>("/sales", {
      method: "POST",
      body: {
        productId: product.body.data?.id,
        clientId: client.body.data?.id,
        paymentMethodId: pix?.id,
        quantity: 1,
      },
    });
    const issued = await request<FiscalDocument>(
      `/sales/${sale.body.data?.id}/fiscal-documents`,
      {
        method: "POST",
        body: { documentType: "NFE" },
      },
    );
    const duplicated = await request(
      `/sales/${sale.body.data?.id}/fiscal-documents`,
      {
        method: "POST",
        body: { documentType: "NFE" },
      },
    );
    const unsupportedDocumentType = await request(
      `/sales/${sale.body.data?.id}/fiscal-documents`,
      {
        method: "POST",
        body: { documentType: "NFCE" },
      },
    );
    const listed = await request<FiscalDocument[]>("/fiscal-documents");
    const shown = await request<FiscalDocument>(
      `/fiscal-documents/${issued.body.data?.id}`,
    );
    const synced = await request<FiscalDocument>(
      `/fiscal-documents/${issued.body.data?.id}/sync`,
      {
        method: "PATCH",
        body: {},
      },
    );
    const mockXml = await fetch(
      `${baseUrl}/mock/fiscal-documents/${issued.body.data?.providerReference}.xml`,
      {
        headers: { cookie: authCookie },
      },
    );
    const mockPdf = await fetch(
      `${baseUrl}/mock/fiscal-documents/${issued.body.data?.providerReference}.pdf`,
      {
        headers: { cookie: authCookie },
      },
    );
    const saleCancellationWithFiscalDocument = await request(
      `/sales/${sale.body.data?.id}/cancel`,
      {
        method: "PATCH",
        body: { reason: "Tentativa com NF-e ativa" },
      },
    );
    const invalidCancellationReason = await request(
      `/fiscal-documents/${issued.body.data?.id}/cancel`,
      {
        method: "PATCH",
        body: {
          reason: "Curto",
        },
      },
    );
    const cancelled = await request<FiscalDocument>(
      `/fiscal-documents/${issued.body.data?.id}/cancel`,
      {
        method: "PATCH",
        body: {
          reason: "Cancelamento de teste da nota fiscal",
        },
      },
    );
    const syncedAfterCancellation = await request<FiscalDocument>(
      `/fiscal-documents/${issued.body.data?.id}/sync`,
      {
        method: "PATCH",
        body: {},
      },
    );

    assert.equal(issued.status, 201);
    assert.equal(issued.body.data?.sourceType, "SALE");
    assert.equal(issued.body.data?.sourceId, sale.body.data?.id);
    assert.equal(issued.body.data?.documentType, "NFE");
    assert.equal(issued.body.data?.provider, "MOCK");
    assert.equal(issued.body.data?.environment, "HOMOLOGATION");
    assert.equal(issued.body.data?.status, "AUTHORIZED");
    assert.equal(
      issued.body.data?.providerReference,
      `SALE${sale.body.data?.id?.replace(/-/g, "")}`,
    );
    assert.equal(issued.body.data?.issuedByUserName, "Administrador de teste");
    assert.equal(duplicated.status, 409);
    assert.equal(
      duplicated.body.message,
      "Documento fiscal ja emitido para esta venda.",
    );
    assert.equal(unsupportedDocumentType.status, 422);
    assert.equal(listed.body.data?.length, 1);
    assert.equal(shown.body.data?.id, issued.body.data?.id);
    assert.equal(synced.status, 200);
    assert.equal(synced.body.data?.status, "AUTHORIZED");
    assert.equal(synced.body.data?.pdfUrl, issued.body.data?.pdfUrl);
    assert.equal(mockXml.status, 200);
    assert.equal(
      mockXml.headers.get("content-type"),
      "application/xml; charset=utf-8",
    );
    assert.equal(
      mockXml.headers.get("content-disposition"),
      `attachment; filename="${issued.body.data?.providerReference}.xml"`,
    );
    assert.match(await mockXml.text(), /<nfeMock>/);
    assert.equal(mockPdf.status, 200);
    assert.equal(mockPdf.headers.get("content-type"), "application/pdf");
    assert.equal(
      mockPdf.headers.get("content-disposition"),
      `attachment; filename="${issued.body.data?.providerReference}.pdf"`,
    );
    assert.equal(saleCancellationWithFiscalDocument.status, 409);
    assert.equal(
      saleCancellationWithFiscalDocument.body.message,
      "Cancele a NF-e antes de cancelar esta venda.",
    );
    assert.equal(invalidCancellationReason.status, 422);
    assert.equal(invalidCancellationReason.body.message, "Dados invalidos.");
    assert.ok(
      invalidCancellationReason.body.errors?.some(
        (error) => error.field === "reason",
      ),
    );
    assert.equal(cancelled.status, 200);
    assert.equal(cancelled.body.data?.status, "CANCELLED");
    assert.equal(
      cancelled.body.data?.cancelledByUserName,
      "Administrador de teste",
    );
    assert.equal(
      cancelled.body.data?.cancellationReason,
      "Cancelamento de teste da nota fiscal",
    );
    assert.ok(cancelled.body.data?.cancelledAt);
    assert.equal(syncedAfterCancellation.status, 200);
    assert.equal(syncedAfterCancellation.body.data?.status, "CANCELLED");
  });

  it("blocks fiscal issue when production is not explicitly allowed", async () => {
    const product = await request<Product>("/products", {
      method: "POST",
      body: { name: "Filtro producao bloqueada", salePrice: 42 },
    });
    const client = await request<Client>("/clients", {
      method: "POST",
      body: {
        personType: "PF",
        name: "Cliente producao bloqueada",
        document: "12345678901",
      },
    });
    const paymentMethods = await request<PaymentMethod[]>(
      "/payment-methods?active=true",
    );
    const pix = paymentMethods.body.data?.find(
      (paymentMethod) => paymentMethod.code === "PIX",
    );

    await request("/stock-adjustments", {
      method: "POST",
      body: {
        productId: product.body.data?.id,
        quantity: 1,
        reason: "Saldo para testar trava de producao fiscal",
      },
    });
    await request("/cash-register/open", {
      method: "POST",
      body: { openingBalance: 0 },
    });

    const sale = await request<Sale>("/sales", {
      method: "POST",
      body: {
        productId: product.body.data?.id,
        clientId: client.body.data?.id,
        paymentMethodId: pix?.id,
        quantity: 1,
      },
    });

    await db("fiscal_settings").insert({
      provider: "MOCK",
      environment: "PRODUCTION",
      allow_production: false,
    });

    const blocked = await request(
      `/sales/${sale.body.data?.id}/fiscal-documents`,
      {
        method: "POST",
        body: { documentType: "NFE" },
      },
    );
    const listed = await request<FiscalDocument[]>("/fiscal-documents");

    assert.equal(blocked.status, 422);
    assert.equal(
      blocked.body.message,
      "Emissao em producao bloqueada pela configuracao fiscal.",
    );
    assert.deepEqual(listed.body.data, []);
  });

  it("preserves fiscal cancellation audit while Focus cancellation is processing", async () => {
    const originalFiscalProvider = env.fiscal.provider;
    const originalFocusToken = env.fiscal.focus.token;
    const originalFocusCompanyCnpj = env.fiscal.focus.companyCnpj;
    const originalFetch = globalThis.fetch;
    const administrator = await db("users")
      .select("id")
      .where("email", "admin@example.com")
      .first();
    const sourceId = randomUUID();
    const [inserted] = await db("fiscal_documents")
      .insert({
        source_type: "SALE",
        source_id: sourceId,
        document_type: "NFE",
        provider: "FOCUS",
        environment: "HOMOLOGATION",
        status: "AUTHORIZED",
        provider_reference: `SALE${sourceId.replace(/-/g, "")}`,
        response_payload: {},
        issued_by_user_id: administrator.id,
        issued_at: db.fn.now(),
      })
      .returning("id");

    env.fiscal.provider = "focus";
    env.fiscal.focus.token = "token-focus-teste";
    env.fiscal.focus.companyCnpj = "12345678000199";
    globalThis.fetch = (async (_input, init) => {
      const responseByMethod: Record<string, Record<string, unknown>> = {
        DELETE: { status: "processando_cancelamento" },
        GET: { status: "cancelado" },
      };
      const method = init?.method ?? "GET";

      return new Response(JSON.stringify(responseByMethod[method]), {
        status: 200,
      });
    }) as typeof fetch;

    try {
      const processing = await cancelFiscalDocument(
        inserted.id,
        "Cancelamento em processamento para auditoria fiscal",
        administrator.id,
      );
      const synced = await syncFiscalDocument(inserted.id);

      assert.equal(processing.code, 200);
      assert.equal(processing.data.status, "PROCESSING");
      assert.equal(
        processing.data.cancelledByUserName,
        "Administrador de teste",
      );
      assert.equal(
        processing.data.cancellationReason,
        "Cancelamento em processamento para auditoria fiscal",
      );
      assert.equal(processing.data.cancelledAt, null);
      assert.equal(synced.code, 200);
      assert.equal(synced.data.status, "CANCELLED");
      assert.equal(
        synced.data.cancelledByUserName,
        "Administrador de teste",
      );
      assert.equal(
        synced.data.cancellationReason,
        "Cancelamento em processamento para auditoria fiscal",
      );
      assert.ok(synced.data.cancelledAt);
    } finally {
      env.fiscal.provider = originalFiscalProvider;
      env.fiscal.focus.token = originalFocusToken;
      env.fiscal.focus.companyCnpj = originalFocusCompanyCnpj;
      globalThis.fetch = originalFetch;
    }
  });

  it("keeps authorized fiscal document when Focus rejects cancellation", async () => {
    const originalFiscalProvider = env.fiscal.provider;
    const originalFocusToken = env.fiscal.focus.token;
    const originalFocusCompanyCnpj = env.fiscal.focus.companyCnpj;
    const originalFetch = globalThis.fetch;
    const administrator = await db("users")
      .select("id")
      .where("email", "admin@example.com")
      .first();
    const sourceId = randomUUID();
    const [inserted] = await db("fiscal_documents")
      .insert({
        source_type: "SALE",
        source_id: sourceId,
        document_type: "NFE",
        provider: "FOCUS",
        environment: "HOMOLOGATION",
        status: "AUTHORIZED",
        provider_reference: `SALE${sourceId.replace(/-/g, "")}`,
        response_payload: {},
        issued_by_user_id: administrator.id,
        issued_at: db.fn.now(),
      })
      .returning("id");

    const responses = [
      {
        status: "erro_cancelamento",
        mensagem_sefaz: "Cancelamento fora do prazo permitido",
      },
      { status: "autorizado" },
    ];

    env.fiscal.provider = "focus";
    env.fiscal.focus.token = "token-focus-teste";
    env.fiscal.focus.companyCnpj = "12345678000199";
    globalThis.fetch = (async () =>
      new Response(JSON.stringify(responses.shift()), {
        status: 200,
      })) as typeof fetch;

    try {
      const result = await cancelFiscalDocument(
        inserted.id,
        "Cancelamento rejeitado pela Focus",
        administrator.id,
      );
      const synced = await syncFiscalDocument(inserted.id);

      assert.equal(result.code, 200);
      assert.equal(result.data.status, "AUTHORIZED");
      assert.equal(result.data.cancelledByUserName, null);
      assert.equal(result.data.cancelledAt, null);
      assert.equal(result.data.cancellationReason, null);
      assert.equal(
        result.data.rejectionReason,
        "Cancelamento fora do prazo permitido",
      );
      assert.equal(synced.code, 200);
      assert.equal(synced.data.status, "AUTHORIZED");
      assert.equal(
        synced.data.rejectionReason,
        "Cancelamento fora do prazo permitido",
      );
    } finally {
      env.fiscal.provider = originalFiscalProvider;
      env.fiscal.focus.token = originalFocusToken;
      env.fiscal.focus.companyCnpj = originalFocusCompanyCnpj;
      globalThis.fetch = originalFetch;
    }
  });

  it("clears rejected cancellation reason when Focus accepts a new cancellation", async () => {
    const originalFiscalProvider = env.fiscal.provider;
    const originalFocusToken = env.fiscal.focus.token;
    const originalFocusCompanyCnpj = env.fiscal.focus.companyCnpj;
    const originalFetch = globalThis.fetch;
    const administrator = await db("users")
      .select("id")
      .where("email", "admin@example.com")
      .first();
    const sourceId = randomUUID();
    const [inserted] = await db("fiscal_documents")
      .insert({
        source_type: "SALE",
        source_id: sourceId,
        document_type: "NFE",
        provider: "FOCUS",
        environment: "HOMOLOGATION",
        status: "AUTHORIZED",
        provider_reference: `SALE${sourceId.replace(/-/g, "")}`,
        rejection_reason: "Cancelamento rejeitado anteriormente",
        response_payload: {},
        issued_by_user_id: administrator.id,
        issued_at: db.fn.now(),
      })
      .returning("id");

    env.fiscal.provider = "focus";
    env.fiscal.focus.token = "token-focus-teste";
    env.fiscal.focus.companyCnpj = "12345678000199";
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({ status: "processando_cancelamento" }),
        { status: 200 },
      )) as typeof fetch;

    try {
      const result = await cancelFiscalDocument(
        inserted.id,
        "Nova tentativa de cancelamento aceita pela Focus",
        administrator.id,
      );

      assert.equal(result.code, 200);
      assert.equal(result.data.status, "PROCESSING");
      assert.equal(result.data.rejectionReason, null);
      assert.equal(
        result.data.cancellationReason,
        "Nova tentativa de cancelamento aceita pela Focus",
      );
      assert.equal(
        result.data.cancelledByUserName,
        "Administrador de teste",
      );
    } finally {
      env.fiscal.provider = originalFiscalProvider;
      env.fiscal.focus.token = originalFocusToken;
      env.fiscal.focus.companyCnpj = originalFocusCompanyCnpj;
      globalThis.fetch = originalFetch;
    }
  });

  it("keeps authorized fiscal document when Focus rejects cancellation during sync", async () => {
    const originalFiscalProvider = env.fiscal.provider;
    const originalFocusToken = env.fiscal.focus.token;
    const originalFocusCompanyCnpj = env.fiscal.focus.companyCnpj;
    const originalFetch = globalThis.fetch;
    const administrator = await db("users")
      .select("id")
      .where("email", "admin@example.com")
      .first();
    const sourceId = randomUUID();
    const [inserted] = await db("fiscal_documents")
      .insert({
        source_type: "SALE",
        source_id: sourceId,
        document_type: "NFE",
        provider: "FOCUS",
        environment: "HOMOLOGATION",
        status: "AUTHORIZED",
        provider_reference: `SALE${sourceId.replace(/-/g, "")}`,
        response_payload: {},
        issued_by_user_id: administrator.id,
        issued_at: db.fn.now(),
      })
      .returning("id");
    const responses = [
      { status: "processando_cancelamento" },
      {
        status: "erro_cancelamento",
        mensagem_sefaz: "Cancelamento rejeitado na sincronizacao",
      },
    ];

    env.fiscal.provider = "focus";
    env.fiscal.focus.token = "token-focus-teste";
    env.fiscal.focus.companyCnpj = "12345678000199";
    globalThis.fetch = (async () =>
      new Response(JSON.stringify(responses.shift()), {
        status: 200,
      })) as typeof fetch;

    try {
      const processing = await cancelFiscalDocument(
        inserted.id,
        "Cancelamento pendente que sera rejeitado pela Focus",
        administrator.id,
      );
      const synced = await syncFiscalDocument(inserted.id);

      assert.equal(processing.code, 200);
      assert.equal(processing.data.status, "PROCESSING");
      assert.equal(synced.code, 200);
      assert.equal(synced.data.status, "AUTHORIZED");
      assert.equal(synced.data.cancelledByUserName, null);
      assert.equal(synced.data.cancelledAt, null);
      assert.equal(synced.data.cancellationReason, null);
      assert.equal(
        synced.data.rejectionReason,
        "Cancelamento rejeitado na sincronizacao",
      );
    } finally {
      env.fiscal.provider = originalFiscalProvider;
      env.fiscal.focus.token = originalFocusToken;
      env.fiscal.focus.companyCnpj = originalFocusCompanyCnpj;
      globalThis.fetch = originalFetch;
    }
  });

  it("returns fiscal readiness errors before issuing through Focus", async () => {
    const originalFiscalProvider = env.fiscal.provider;
    const product = await request<Product>("/products", {
      method: "POST",
      body: { name: "Filtro sem dados fiscais", salePrice: 35 },
    });
    const client = await request<Client>("/clients", {
      method: "POST",
      body: {
        personType: "PF",
        name: "Cliente sem endereco fiscal",
        document: "12345678901",
        stateRegistrationIndicator: "1",
      },
    });
    const paymentMethods = await request<PaymentMethod[]>(
      "/payment-methods?active=true",
    );
    const pix = paymentMethods.body.data?.find(
      (paymentMethod) => paymentMethod.code === "PIX",
    );

    await request("/stock-adjustments", {
      method: "POST",
      body: {
        productId: product.body.data?.id,
        quantity: 2,
        reason: "Saldo para prontidao fiscal",
      },
    });
    await request("/cash-register/open", {
      method: "POST",
      body: { openingBalance: 0 },
    });

    const sale = await request<Sale>("/sales", {
      method: "POST",
      body: {
        productId: product.body.data?.id,
        clientId: client.body.data?.id,
        paymentMethodId: pix?.id,
        quantity: 1,
      },
    });

    env.fiscal.provider = "focus";

    try {
      const fiscalDocument = await request(
        `/sales/${sale.body.data?.id}/fiscal-documents`,
        {
          method: "POST",
          body: { documentType: "NFE" },
        },
      );

      assert.equal(fiscalDocument.status, 422);
      assert.equal(
        fiscalDocument.body.message,
        "Dados fiscais incompletos para emissao da NF-e.",
      );
      assert.ok(
        fiscalDocument.body.errors?.some(
          (error) => error.field === "clientAddressStreet",
        ),
      );
      assert.ok(
        fiscalDocument.body.errors?.some(
          (error) => error.field === "clientStateRegistration",
        ),
      );
      assert.ok(
        fiscalDocument.body.errors?.some(
          (error) => error.field === "items.1.productNcm",
        ),
      );
      assert.ok(
        fiscalDocument.body.errors?.some(
          (error) => error.field === "items.1.productCfop",
        ),
      );
    } finally {
      env.fiscal.provider = originalFiscalProvider;
    }
  });

  it("returns fiscal format errors before issuing through Focus", async () => {
    const originalFiscalProvider = env.fiscal.provider;
    const product = await request<Product>("/products", {
      method: "POST",
      body: {
        name: "Filtro com dados fiscais invalidos",
        salePrice: 35,
        ncm: "8421230",
        cfop: "ABCD",
        icmsCst: "A1",
        pisCst: "X4",
        cofinsCst: "YZ",
        origin: "9",
      },
    });
    const client = await request<Client>("/clients", {
      method: "POST",
      body: {
        personType: "PF",
        name: "Cliente com endereco fiscal",
        document: "12345678901",
        stateRegistrationIndicator: "9",
        addressStreet: "Rua Fiscal",
        addressNumber: "123",
        addressDistrict: "Centro",
        addressCity: "Araguaina",
        addressState: "TO",
        addressZipCode: "77800000",
      },
    });
    const paymentMethods = await request<PaymentMethod[]>(
      "/payment-methods?active=true",
    );
    const pix = paymentMethods.body.data?.find(
      (paymentMethod) => paymentMethod.code === "PIX",
    );

    await request("/stock-adjustments", {
      method: "POST",
      body: {
        productId: product.body.data?.id,
        quantity: 2,
        reason: "Saldo para formato fiscal",
      },
    });
    await request("/cash-register/open", {
      method: "POST",
      body: { openingBalance: 0 },
    });

    const sale = await request<Sale>("/sales", {
      method: "POST",
      body: {
        productId: product.body.data?.id,
        clientId: client.body.data?.id,
        paymentMethodId: pix?.id,
        quantity: 1,
      },
    });

    env.fiscal.provider = "focus";

    try {
      const fiscalDocument = await request(
        `/sales/${sale.body.data?.id}/fiscal-documents`,
        {
          method: "POST",
          body: { documentType: "NFE" },
        },
      );

      assert.equal(fiscalDocument.status, 422);
      assert.equal(
        fiscalDocument.body.message,
        "Dados fiscais incompletos para emissao da NF-e.",
      );
      assert.ok(
        fiscalDocument.body.errors?.some(
          (error) =>
            error.field === "items.1.productNcm" &&
            error.message === "NCM do item 1 deve conter 8 digitos.",
        ),
      );
      assert.ok(
        fiscalDocument.body.errors?.some(
          (error) =>
            error.field === "items.1.productCfop" &&
            error.message === "CFOP do item 1 deve conter 4 digitos.",
        ),
      );
      assert.ok(
        fiscalDocument.body.errors?.some(
          (error) =>
            error.field === "items.1.productOrigin" &&
            error.message === "Origem fiscal do item 1 deve estar entre 0 e 8.",
        ),
      );
    } finally {
      env.fiscal.provider = originalFiscalProvider;
    }
  });

  it("returns client fiscal format errors before issuing through Focus", async () => {
    const originalFiscalProvider = env.fiscal.provider;
    const product = await request<Product>("/products", {
      method: "POST",
      body: {
        name: "Filtro para cliente fiscal invalido",
        salePrice: 35,
        ncm: "84212300",
        cfop: "5102",
        icmsCst: "102",
        pisCst: "49",
        cofinsCst: "49",
        origin: "0",
      },
    });
    const client = await request<Client>("/clients", {
      method: "POST",
      body: {
        personType: "PF",
        name: "Cliente fiscal invalido",
        document: "12345",
        stateRegistrationIndicator: "9",
        addressStreet: "Rua Fiscal",
        addressNumber: "123",
        addressDistrict: "Centro",
        addressCity: "Araguaina",
        addressState: "T1",
        addressZipCode: "778",
      },
    });
    const paymentMethods = await request<PaymentMethod[]>(
      "/payment-methods?active=true",
    );
    const pix = paymentMethods.body.data?.find(
      (paymentMethod) => paymentMethod.code === "PIX",
    );

    await request("/stock-adjustments", {
      method: "POST",
      body: {
        productId: product.body.data?.id,
        quantity: 2,
        reason: "Saldo para cliente fiscal",
      },
    });
    await request("/cash-register/open", {
      method: "POST",
      body: { openingBalance: 0 },
    });

    const sale = await request<Sale>("/sales", {
      method: "POST",
      body: {
        productId: product.body.data?.id,
        clientId: client.body.data?.id,
        paymentMethodId: pix?.id,
        quantity: 1,
      },
    });

    env.fiscal.provider = "focus";

    try {
      const fiscalDocument = await request(
        `/sales/${sale.body.data?.id}/fiscal-documents`,
        {
          method: "POST",
          body: { documentType: "NFE" },
        },
      );

      assert.equal(fiscalDocument.status, 422);
      assert.equal(
        fiscalDocument.body.message,
        "Dados fiscais incompletos para emissao da NF-e.",
      );
      assert.ok(
        fiscalDocument.body.errors?.some(
          (error) =>
            error.field === "clientDocument" &&
            error.message ===
              "CPF/CNPJ do cliente deve conter 11 ou 14 digitos.",
        ),
      );
      assert.ok(
        fiscalDocument.body.errors?.some(
          (error) =>
            error.field === "clientAddressState" &&
            error.message === "UF do cliente deve conter 2 letras.",
        ),
      );
      assert.ok(
        fiscalDocument.body.errors?.some(
          (error) =>
            error.field === "clientAddressZipCode" &&
            error.message === "CEP do cliente deve conter 8 digitos.",
        ),
      );
    } finally {
      env.fiscal.provider = originalFiscalProvider;
    }
  });

  it("returns Focus configuration errors after fiscal readiness passes", async () => {
    const originalFiscalProvider = env.fiscal.provider;
    const originalFocusToken = env.fiscal.focus.token;
    const originalFocusHomologationToken =
      env.fiscal.focus.tokens.HOMOLOGATION;
    const originalFocusCompanyCnpj = env.fiscal.focus.companyCnpj;
    const product = await request<Product>("/products", {
      method: "POST",
      body: {
        name: "Filtro pronto para Focus",
        salePrice: 35,
        ncm: "84212300",
        cfop: "5102",
        icmsCst: "102",
        pisCst: "49",
        cofinsCst: "49",
        origin: "0",
      },
    });
    const client = await request<Client>("/clients", {
      method: "POST",
      body: {
        personType: "PF",
        name: "Cliente pronto para Focus",
        document: "12345678901",
        stateRegistrationIndicator: "9",
        addressStreet: "Rua Fiscal",
        addressNumber: "123",
        addressDistrict: "Centro",
        addressCity: "Araguaina",
        addressState: "TO",
        addressZipCode: "77800000",
      },
    });
    const paymentMethods = await request<PaymentMethod[]>(
      "/payment-methods?active=true",
    );
    const pix = paymentMethods.body.data?.find(
      (paymentMethod) => paymentMethod.code === "PIX",
    );

    await request("/stock-adjustments", {
      method: "POST",
      body: {
        productId: product.body.data?.id,
        quantity: 2,
        reason: "Saldo para configuracao Focus",
      },
    });
    await request("/cash-register/open", {
      method: "POST",
      body: { openingBalance: 0 },
    });

    const sale = await request<Sale>("/sales", {
      method: "POST",
      body: {
        productId: product.body.data?.id,
        clientId: client.body.data?.id,
        paymentMethodId: pix?.id,
        quantity: 1,
      },
    });

    env.fiscal.provider = "focus";
    env.fiscal.focus.token = null;
    env.fiscal.focus.tokens.HOMOLOGATION = null;
    env.fiscal.focus.companyCnpj = null;

    try {
      const fiscalDocument = await request(
        `/sales/${sale.body.data?.id}/fiscal-documents`,
        {
          method: "POST",
          body: { documentType: "NFE" },
        },
      );

      assert.equal(fiscalDocument.status, 503);
      assert.equal(
        fiscalDocument.body.message,
        "Integracao Focus NFe sem configuracao: FOCUS_NFE_HOMOLOGATION_TOKEN, CNPJ fiscal da loja.",
      );
    } finally {
      env.fiscal.provider = originalFiscalProvider;
      env.fiscal.focus.token = originalFocusToken;
      env.fiscal.focus.tokens.HOMOLOGATION = originalFocusHomologationToken;
      env.fiscal.focus.companyCnpj = originalFocusCompanyCnpj;
    }
  });

  it("rejects invalid store CNPJ before calling Focus", async () => {
    const originalFocusToken = env.fiscal.focus.token;
    const originalFocusHomologationToken =
      env.fiscal.focus.tokens.HOMOLOGATION;

    env.fiscal.focus.token = "token-focus-teste";
    env.fiscal.focus.tokens.HOMOLOGATION = "token-focus-teste";

    try {
      await new FocusFiscalProvider().issue({
        ...focusIssueRequest(),
        companyCnpj: "123",
      });
      assert.fail("Expected Focus store CNPJ configuration error");
    } catch (error) {
      const appError = error as { message?: string; statusCode?: number };

      assert.equal(appError.statusCode, 503);
      assert.equal(
        appError.message,
        "Integracao Focus NFe com configuracao invalida: CNPJ fiscal da loja deve ter 14 digitos.",
      );
    } finally {
      env.fiscal.focus.token = originalFocusToken;
      env.fiscal.focus.tokens.HOMOLOGATION = originalFocusHomologationToken;
    }
  });

  it("uses Focus credentials and URLs by environment", async () => {
    const originalFocusBaseUrls = { ...env.fiscal.focus.baseUrls };
    const originalFocusTokens = { ...env.fiscal.focus.tokens };
    const originalFetch = globalThis.fetch;
    const requests: Array<{ authorization: string | null; url: string }> = [];

    env.fiscal.focus.baseUrls.HOMOLOGATION =
      "https://homologacao.focus-teste.local";
    env.fiscal.focus.baseUrls.PRODUCTION =
      "https://producao.focus-teste.local/v2/nfe";
    env.fiscal.focus.tokens.HOMOLOGATION = "token-homologacao";
    env.fiscal.focus.tokens.PRODUCTION = "token-producao";
    globalThis.fetch = (async (input, init) => {
      const headers = init?.headers as Record<string, string> | undefined;

      requests.push({
        authorization: headers?.Authorization ?? null,
        url: String(input),
      });

      return new Response(JSON.stringify({ status: "autorizado" }), {
        status: 200,
      });
    }) as typeof fetch;

    try {
      await new FocusFiscalProvider().check({
        documentType: "NFE",
        environment: "HOMOLOGATION",
        providerReference: "SALEhomologacao",
      });
      await new FocusFiscalProvider().check({
        documentType: "NFE",
        environment: "PRODUCTION",
        providerReference: "SALEproducao",
      });

      assert.deepEqual(requests, [
        {
          authorization: focusBasicAuth("token-homologacao"),
          url: "https://homologacao.focus-teste.local/v2/nfe/SALEhomologacao",
        },
        {
          authorization: focusBasicAuth("token-producao"),
          url: "https://producao.focus-teste.local/v2/nfe/SALEproducao",
        },
      ]);
    } finally {
      env.fiscal.focus.baseUrls.HOMOLOGATION =
        originalFocusBaseUrls.HOMOLOGATION;
      env.fiscal.focus.baseUrls.PRODUCTION =
        originalFocusBaseUrls.PRODUCTION;
      env.fiscal.focus.tokens.HOMOLOGATION =
        originalFocusTokens.HOMOLOGATION;
      env.fiscal.focus.tokens.PRODUCTION = originalFocusTokens.PRODUCTION;
      globalThis.fetch = originalFetch;
    }
  });

  it("returns a clear error when Focus cannot be reached", async () => {
    const originalFiscalProvider = env.fiscal.provider;
    const originalFocusToken = env.fiscal.focus.token;
    const originalFocusCompanyCnpj = env.fiscal.focus.companyCnpj;
    const originalFetch = globalThis.fetch;

    env.fiscal.provider = "focus";
    env.fiscal.focus.token = "token-focus-teste";
    env.fiscal.focus.companyCnpj = "12345678000199";
    globalThis.fetch = (async () => {
      throw new Error("Focus unavailable");
    }) as typeof fetch;

    try {
      await new FocusFiscalProvider().issue(focusIssueRequest());
      assert.fail("Expected Focus connection error");
    } catch (error) {
      const appError = error as { message?: string; statusCode?: number };

      assert.equal(appError.statusCode, 502);
      assert.equal(appError.message, "Nao foi possivel conectar a Focus NFe.");
    } finally {
      env.fiscal.provider = originalFiscalProvider;
      env.fiscal.focus.token = originalFocusToken;
      env.fiscal.focus.companyCnpj = originalFocusCompanyCnpj;
      globalThis.fetch = originalFetch;
    }
  });

  it("returns a clear error when Focus rejects the token", async () => {
    const originalFiscalProvider = env.fiscal.provider;
    const originalFocusToken = env.fiscal.focus.token;
    const originalFocusCompanyCnpj = env.fiscal.focus.companyCnpj;
    const originalFetch = globalThis.fetch;

    env.fiscal.provider = "focus";
    env.fiscal.focus.token = "token-focus-invalido";
    env.fiscal.focus.companyCnpj = "12345678000199";
    globalThis.fetch = focusUnauthorizedFetch();

    try {
      await new FocusFiscalProvider().issue(focusIssueRequest());
      assert.fail("Expected Focus token error");
    } catch (error) {
      const appError = error as { message?: string; statusCode?: number };

      assert.equal(appError.statusCode, 502);
      assert.equal(appError.message, "Token da Focus NFe nao autorizado.");
    } finally {
      env.fiscal.provider = originalFiscalProvider;
      env.fiscal.focus.token = originalFocusToken;
      env.fiscal.focus.companyCnpj = originalFocusCompanyCnpj;
      globalThis.fetch = originalFetch;
    }
  });

  it("returns a clear error when Focus rejects the token during sync", async () => {
    const originalFiscalProvider = env.fiscal.provider;
    const originalFocusToken = env.fiscal.focus.token;
    const originalFocusCompanyCnpj = env.fiscal.focus.companyCnpj;
    const originalFetch = globalThis.fetch;

    env.fiscal.provider = "focus";
    env.fiscal.focus.token = "token-focus-invalido";
    env.fiscal.focus.companyCnpj = "12345678000199";
    globalThis.fetch = focusUnauthorizedFetch();

    try {
      await new FocusFiscalProvider().check({
        documentType: "NFE",
        environment: "HOMOLOGATION",
        providerReference: "SALEfocusprovidertest",
      });
      assert.fail("Expected Focus token error");
    } catch (error) {
      const appError = error as { message?: string; statusCode?: number };

      assert.equal(appError.statusCode, 502);
      assert.equal(appError.message, "Token da Focus NFe nao autorizado.");
    } finally {
      env.fiscal.provider = originalFiscalProvider;
      env.fiscal.focus.token = originalFocusToken;
      env.fiscal.focus.companyCnpj = originalFocusCompanyCnpj;
      globalThis.fetch = originalFetch;
    }
  });

  it("returns a clear error when Focus rejects the token during cancellation", async () => {
    const originalFiscalProvider = env.fiscal.provider;
    const originalFocusToken = env.fiscal.focus.token;
    const originalFocusCompanyCnpj = env.fiscal.focus.companyCnpj;
    const originalFetch = globalThis.fetch;

    env.fiscal.provider = "focus";
    env.fiscal.focus.token = "token-focus-invalido";
    env.fiscal.focus.companyCnpj = "12345678000199";
    globalThis.fetch = focusUnauthorizedFetch();

    try {
      await new FocusFiscalProvider().cancel({
        documentType: "NFE",
        environment: "HOMOLOGATION",
        providerReference: "SALEfocusprovidertest",
        reason: "Cancelamento por teste fiscal",
      });
      assert.fail("Expected Focus token error");
    } catch (error) {
      const appError = error as { message?: string; statusCode?: number };

      assert.equal(appError.statusCode, 502);
      assert.equal(appError.message, "Token da Focus NFe nao autorizado.");
    } finally {
      env.fiscal.provider = originalFiscalProvider;
      env.fiscal.focus.token = originalFocusToken;
      env.fiscal.focus.companyCnpj = originalFocusCompanyCnpj;
      globalThis.fetch = originalFetch;
    }
  });

  it("keeps Focus cancellation processing until it is confirmed", async () => {
    const originalFiscalProvider = env.fiscal.provider;
    const originalFocusToken = env.fiscal.focus.token;
    const originalFocusCompanyCnpj = env.fiscal.focus.companyCnpj;
    const originalFetch = globalThis.fetch;

    env.fiscal.provider = "focus";
    env.fiscal.focus.token = "token-focus-teste";
    env.fiscal.focus.companyCnpj = "12345678000199";
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ status: "processando_cancelamento" }), {
        status: 200,
      })) as typeof fetch;

    try {
      const result = await new FocusFiscalProvider().cancel({
        documentType: "NFE",
        environment: "HOMOLOGATION",
        providerReference: "SALEfocusprovidertest",
        reason: "Cancelamento ainda em processamento pela Focus",
      });

      assert.equal(result.status, "PROCESSING");
      assert.equal(result.rejectionReason, null);
    } finally {
      env.fiscal.provider = originalFiscalProvider;
      env.fiscal.focus.token = originalFocusToken;
      env.fiscal.focus.companyCnpj = originalFocusCompanyCnpj;
      globalThis.fetch = originalFetch;
    }
  });

  it("normalizes Focus status values before mapping fiscal status", async () => {
    const originalFocusToken = env.fiscal.focus.token;
    const originalFetch = globalThis.fetch;
    const responses = [
      { status: "erro autorização", mensagem_sefaz: "Rejeicao com acento" },
      { status: "PROCESSANDO CANCELAMENTO" },
    ];

    env.fiscal.focus.token = "token-focus-teste";
    globalThis.fetch = (async () =>
      new Response(JSON.stringify(responses.shift()), {
        status: 200,
      })) as typeof fetch;

    try {
      const authorization = await new FocusFiscalProvider().check({
        documentType: "NFE",
        environment: "HOMOLOGATION",
        providerReference: "SALEfocusstatusnormalizado",
      });
      const cancellation = await new FocusFiscalProvider().cancel({
        documentType: "NFE",
        environment: "HOMOLOGATION",
        providerReference: "SALEfocusstatusnormalizado",
        reason: "Cancelamento para testar status normalizado",
      });

      assert.equal(authorization.status, "REJECTED");
      assert.equal(authorization.rejectionReason, "Rejeicao com acento");
      assert.equal(cancellation.status, "PROCESSING");
    } finally {
      env.fiscal.focus.token = originalFocusToken;
      globalThis.fetch = originalFetch;
    }
  });

  it("returns a rejected fiscal result when Focus rejects the payload", async () => {
    const originalFiscalProvider = env.fiscal.provider;
    const originalFocusToken = env.fiscal.focus.token;
    const originalFocusCompanyCnpj = env.fiscal.focus.companyCnpj;
    const originalFetch = globalThis.fetch;

    env.fiscal.provider = "focus";
    env.fiscal.focus.token = "token-focus-teste";
    env.fiscal.focus.companyCnpj = "12345678000199";
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          erros: [{ mensagem: "NCM invalido" }, "CFOP invalido"],
        }),
        {
          status: 422,
        },
      )) as typeof fetch;

    try {
      const result = await new FocusFiscalProvider().issue(focusIssueRequest());

      assert.equal(result.provider, "FOCUS");
      assert.equal(result.status, "REJECTED");
      assert.equal(result.rejectionReason, "NCM invalido; CFOP invalido");
      assert.equal(result.providerReference, "SALEfocusprovidertest");
    } finally {
      env.fiscal.provider = originalFiscalProvider;
      env.fiscal.focus.token = originalFocusToken;
      env.fiscal.focus.companyCnpj = originalFocusCompanyCnpj;
      globalThis.fetch = originalFetch;
    }
  });

  it("builds Focus file URLs from API endpoint base URL", async () => {
    const originalFiscalProvider = env.fiscal.provider;
    const originalFocusBaseUrls = { ...env.fiscal.focus.baseUrls };
    const originalFocusToken = env.fiscal.focus.token;
    const originalFocusCompanyCnpj = env.fiscal.focus.companyCnpj;
    const originalFetch = globalThis.fetch;

    env.fiscal.provider = "focus";
    env.fiscal.focus.baseUrls.HOMOLOGATION =
      "https://arquivos.focus-teste.local/v2/nfe";
    env.fiscal.focus.token = "token-focus-teste";
    env.fiscal.focus.companyCnpj = "12345678000199";
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          ref: "SALEfocusprovidertest",
          status: "autorizado",
          caminho_xml_nota_fiscal: "/arquivos/notas/teste.xml",
          caminho_danfe: "/arquivos/notas/teste.pdf",
        }),
        { status: 201 },
      )) as typeof fetch;

    try {
      const result = await new FocusFiscalProvider().issue(focusIssueRequest());

      assert.equal(result.status, "AUTHORIZED");
      assert.equal(
        result.xmlUrl,
        "https://arquivos.focus-teste.local/arquivos/notas/teste.xml",
      );
      assert.equal(
        result.pdfUrl,
        "https://arquivos.focus-teste.local/arquivos/notas/teste.pdf",
      );
    } finally {
      env.fiscal.provider = originalFiscalProvider;
      env.fiscal.focus.baseUrls.HOMOLOGATION =
        originalFocusBaseUrls.HOMOLOGATION;
      env.fiscal.focus.baseUrls.PRODUCTION =
        originalFocusBaseUrls.PRODUCTION;
      env.fiscal.focus.token = originalFocusToken;
      env.fiscal.focus.companyCnpj = originalFocusCompanyCnpj;
      globalThis.fetch = originalFetch;
    }
  });

  it("normalizes blank Focus optional fields before saving fiscal metadata", async () => {
    const originalFiscalProvider = env.fiscal.provider;
    const originalFocusToken = env.fiscal.focus.token;
    const originalFocusCompanyCnpj = env.fiscal.focus.companyCnpj;
    const originalFetch = globalThis.fetch;

    env.fiscal.provider = "focus";
    env.fiscal.focus.token = "token-focus-teste";
    env.fiscal.focus.companyCnpj = "12345678000199";
    globalThis.fetch = (async () =>
      new Response(
        JSON.stringify({
          ref: " SALEfocusprovidertest ",
          status: "autorizado",
          chave_nfe: " ",
          numero: " ",
          serie: "",
          caminho_xml_nota_fiscal: " ",
          caminho_danfe: "",
        }),
        { status: 201 },
      )) as typeof fetch;

    try {
      const result = await new FocusFiscalProvider().issue(focusIssueRequest());

      assert.equal(result.status, "AUTHORIZED");
      assert.equal(result.providerReference, "SALEfocusprovidertest");
      assert.equal(result.accessKey, null);
      assert.equal(result.number, null);
      assert.equal(result.series, null);
      assert.equal(result.xmlUrl, null);
      assert.equal(result.pdfUrl, null);
    } finally {
      env.fiscal.provider = originalFiscalProvider;
      env.fiscal.focus.token = originalFocusToken;
      env.fiscal.focus.companyCnpj = originalFocusCompanyCnpj;
      globalThis.fetch = originalFetch;
    }
  });

  it("trims Focus payload text fields before issuing", async () => {
    const originalFiscalProvider = env.fiscal.provider;
    const originalFocusToken = env.fiscal.focus.token;
    const originalFocusCompanyCnpj = env.fiscal.focus.companyCnpj;
    const originalFetch = globalThis.fetch;
    const requestPayload = focusIssueRequest();
    let submittedPayload: Record<string, unknown> | null = null;

    requestPayload.sale.clientName = " Cliente Focus ";
    requestPayload.sale.clientEmail = " fiscal@example.com ";
    requestPayload.sale.clientStateRegistration = " 123456 ";
    requestPayload.sale.clientAddressStreet = " Rua Fiscal ";
    requestPayload.sale.clientAddressNumber = " 123 ";
    requestPayload.sale.clientAddressComplement = " Sala 1 ";
    requestPayload.sale.clientAddressDistrict = " Centro ";
    requestPayload.sale.clientAddressCity = " Araguaina ";
    requestPayload.sale.clientAddressState = " to ";
    requestPayload.sale.items[0].productInternalCode = " FISCAL-1 ";
    requestPayload.sale.items[0].productName = " Filtro Focus ";
    requestPayload.sale.items[0].productNcm = " 84212300 ";

    env.fiscal.provider = "focus";
    env.fiscal.focus.token = "token-focus-teste";
    env.fiscal.focus.companyCnpj = "12345678000199";
    globalThis.fetch = (async (_input, init) => {
      submittedPayload = JSON.parse(String(init?.body)) as Record<
        string,
        unknown
      >;

      return new Response(
        JSON.stringify({
          ref: "SALEfocusprovidertest",
          status: "autorizado",
        }),
        { status: 201 },
      );
    }) as typeof fetch;

    try {
      await new FocusFiscalProvider().issue(requestPayload);
      assert.ok(submittedPayload);

      const payload = submittedPayload as Record<string, unknown>;

      assert.equal(payload.nome_destinatario, "Cliente Focus");
      assert.equal(
        payload.inscricao_estadual_destinatario,
        "123456",
      );
      assert.equal(payload.logradouro_destinatario, "Rua Fiscal");
      assert.equal(payload.numero_destinatario, "123");
      assert.equal(payload.complemento_destinatario, "Sala 1");
      assert.equal(payload.bairro_destinatario, "Centro");
      assert.equal(payload.municipio_destinatario, "Araguaina");
      assert.equal(payload.uf_destinatario, "TO");
      assert.equal(payload.email_destinatario, "fiscal@example.com");

      const item = (payload.items as Array<Record<string, unknown>>)[0];

      assert.equal(item.codigo_produto, "FISCAL-1");
      assert.equal(item.descricao, "Filtro Focus");
      assert.equal(item.codigo_ncm, "84212300");
    } finally {
      env.fiscal.provider = originalFiscalProvider;
      env.fiscal.focus.token = originalFocusToken;
      env.fiscal.focus.companyCnpj = originalFocusCompanyCnpj;
      globalThis.fetch = originalFetch;
    }
  });

  it("reissues a rejected fiscal document without duplicating the source", async () => {
    const product = await request<Product>("/products", {
      method: "POST",
      body: { name: "Filtro com nota rejeitada", salePrice: 35 },
    });
    const client = await request<Client>("/clients", {
      method: "POST",
      body: {
        personType: "PF",
        name: "Cliente para reemissao",
        document: "12345678901",
      },
    });
    const paymentMethods = await request<PaymentMethod[]>(
      "/payment-methods?active=true",
    );
    const pix = paymentMethods.body.data?.find(
      (paymentMethod) => paymentMethod.code === "PIX",
    );
    const administrator = await db("users")
      .select("id")
      .where("email", "admin@example.com")
      .first();

    await request("/stock-adjustments", {
      method: "POST",
      body: {
        productId: product.body.data?.id,
        quantity: 2,
        reason: "Saldo para reemissao fiscal",
      },
    });
    await request("/cash-register/open", {
      method: "POST",
      body: { openingBalance: 0 },
    });

    const sale = await request<Sale>("/sales", {
      method: "POST",
      body: {
        productId: product.body.data?.id,
        clientId: client.body.data?.id,
        paymentMethodId: pix?.id,
        quantity: 1,
      },
    });

    await db("fiscal_documents").insert({
      source_type: "SALE",
      source_id: sale.body.data?.id,
      document_type: "NFE",
      provider: "MOCK",
      environment: "HOMOLOGATION",
      status: "REJECTED",
      provider_reference: `SALE${sale.body.data?.id?.replace(/-/g, "")}`,
      rejection_reason: "Rejeicao simulada",
      request_payload: {},
      response_payload: {},
      issued_by_user_id: administrator.id,
      issued_at: db.fn.now(),
    });

    const reissued = await request<FiscalDocument>(
      `/sales/${sale.body.data?.id}/fiscal-documents`,
      {
        method: "POST",
        body: { documentType: "NFE" },
      },
    );
    const listed = await request<FiscalDocument[]>("/fiscal-documents");

    assert.equal(reissued.status, 201);
    assert.equal(reissued.body.data?.status, "AUTHORIZED");
    assert.equal(reissued.body.data?.rejectionReason, null);
    assert.equal(listed.body.data?.length, 1);
  });

  it("reissues a Focus rejected fiscal document with the same source reference", async () => {
    const originalFocusToken = env.fiscal.focus.token;
    const originalFocusHomologationToken =
      env.fiscal.focus.tokens.HOMOLOGATION;
    const originalFetch = globalThis.fetch;
    const focusRequests: string[] = [];
    const focusResponses = [
      {
        status: "erro_autorizacao",
        mensagem_sefaz: "CPF do destinatario invalido",
      },
      {
        status: "autorizado",
        chave_nfe: "35260612345678000199550010000000011000000010",
        numero: 1,
        serie: 1,
        caminho_xml_nota_fiscal: "/arquivos/nfe/reemitida.xml",
        caminho_danfe: "/arquivos/nfe/reemitida.pdf",
      },
    ];
    const product = await request<Product>("/products", {
      method: "POST",
      body: {
        name: "Filtro Focus reemissao",
        salePrice: 35,
        ncm: "84212300",
        cfop: "5102",
        icmsCst: "102",
        pisCst: "49",
        cofinsCst: "49",
        origin: "0",
      },
    });
    const client = await request<Client>("/clients", {
      method: "POST",
      body: {
        personType: "PF",
        name: "Cliente Focus reemissao",
        document: "12345678901",
        stateRegistrationIndicator: "9",
        addressStreet: "Rua Fiscal",
        addressNumber: "123",
        addressDistrict: "Centro",
        addressCity: "Araguaina",
        addressState: "TO",
        addressZipCode: "77800000",
      },
    });
    const paymentMethods = await request<PaymentMethod[]>(
      "/payment-methods?active=true",
    );
    const pix = paymentMethods.body.data?.find(
      (paymentMethod) => paymentMethod.code === "PIX",
    );

    env.fiscal.focus.token = "token-focus-teste";
    env.fiscal.focus.tokens.HOMOLOGATION = "token-focus-teste";
    globalThis.fetch = (async (input, init) => {
      const url = String(input);

      if (url.startsWith(baseUrl)) {
        return originalFetch(input, init);
      }

      focusRequests.push(url);

      return new Response(JSON.stringify(focusResponses.shift()), {
        status: 200,
      });
    }) as typeof fetch;

    try {
      await request("/fiscal-settings", {
        method: "PUT",
        body: {
          provider: "FOCUS",
          environment: "HOMOLOGATION",
          companyCnpj: "12.345.678/0001-99",
          allowProduction: false,
        },
      });
      await request("/stock-adjustments", {
        method: "POST",
        body: {
          productId: product.body.data?.id,
          quantity: 2,
          reason: "Saldo para reemissao Focus",
        },
      });
      await request("/cash-register/open", {
        method: "POST",
        body: { openingBalance: 0 },
      });

      const sale = await request<Sale>("/sales", {
        method: "POST",
        body: {
          productId: product.body.data?.id,
          clientId: client.body.data?.id,
          paymentMethodId: pix?.id,
          quantity: 1,
        },
      });
      const rejected = await request<FiscalDocument>(
        `/sales/${sale.body.data?.id}/fiscal-documents`,
        {
          method: "POST",
          body: { documentType: "NFE" },
        },
      );
      const reissued = await request<FiscalDocument>(
        `/sales/${sale.body.data?.id}/fiscal-documents`,
        {
          method: "POST",
          body: { documentType: "NFE" },
        },
      );
      const listed = await request<FiscalDocument[]>("/fiscal-documents");
      const reference = `SALE${sale.body.data?.id?.replace(/-/g, "")}`;

      assert.equal(rejected.status, 201);
      assert.equal(rejected.body.data?.status, "REJECTED");
      assert.equal(
        rejected.body.data?.rejectionReason,
        "CPF do destinatario invalido",
      );
      assert.equal(reissued.status, 201);
      assert.equal(reissued.body.data?.id, rejected.body.data?.id);
      assert.equal(reissued.body.data?.status, "AUTHORIZED");
      assert.equal(reissued.body.data?.provider, "FOCUS");
      assert.equal(reissued.body.data?.providerReference, reference);
      assert.equal(reissued.body.data?.rejectionReason, null);
      assert.equal(listed.body.data?.length, 1);
      assert.deepEqual(
        focusRequests.map((url) => new URL(url).searchParams.get("ref")),
        [reference, reference],
      );
    } finally {
      env.fiscal.focus.token = originalFocusToken;
      env.fiscal.focus.tokens.HOMOLOGATION = originalFocusHomologationToken;
      globalThis.fetch = originalFetch;
    }
  });

  it("returns a management reports overview", async () => {
    const product = await request<Product>("/products", {
      method: "POST",
      body: { name: "Filtro relatorio", salePrice: 10, minimumStock: 5 },
    });
    const client = await request<Client>("/clients", {
      method: "POST",
      body: { personType: "PF", name: "Cliente relatorio" },
    });
    const initial = await request<ReportsOverview>("/reports/overview");

    await request("/stock-adjustments", {
      method: "POST",
      body: {
        productId: product.body.data?.id,
        quantity: 3,
        reason: "Saldo para relatorio",
      },
    });
    await request("/cash-register/open", {
      method: "POST",
      body: { openingBalance: 0 },
    });

    const paymentMethods = await request<PaymentMethod[]>(
      "/payment-methods?active=true",
    );
    const pix = paymentMethods.body.data?.find(
      (paymentMethod) => paymentMethod.code === "PIX",
    );

    await request("/sales", {
      method: "POST",
      body: {
        productId: product.body.data?.id,
        clientId: client.body.data?.id,
        paymentMethodId: pix?.id,
        quantity: 1,
      },
    });
    await request("/pickup-reservations", {
      method: "POST",
      body: {
        clientId: client.body.data?.id,
        productId: product.body.data?.id,
        quantity: 1,
      },
    });
    await request("/shipping-orders", {
      method: "POST",
      body: {
        clientId: client.body.data?.id,
        productId: product.body.data?.id,
        quantity: 1,
      },
    });

    const overview = await request<ReportsOverview>("/reports/overview");

    assert.equal(initial.status, 200);
    assert.equal(initial.body.data?.salesCount, 0);
    assert.equal(initial.body.data?.salesTotalAmount, "0.00");
    assert.equal(initial.body.data?.openCashRegister, null);
    assert.equal(overview.status, 200);
    assert.equal(overview.body.data?.salesCount, 1);
    assert.equal(overview.body.data?.salesTotalAmount, "10.00");
    assert.equal(overview.body.data?.lowStockProductsCount, 1);
    assert.equal(overview.body.data?.openPickupReservationsCount, 1);
    assert.equal(overview.body.data?.openShippingOrdersCount, 1);
    assert.equal(
      overview.body.data?.openCashRegister?.openedByUserName,
      "Administrador de teste",
    );
  });

  it("creates a shipping quote and reserves its item after approval", async () => {
    const product = await request<Product>("/products", {
      method: "POST",
      body: { name: "Filtro para envio", salePrice: 44.9, minimumStock: 1 },
    });
    const client = await request<Client>("/clients", {
      method: "POST",
      body: {
        personType: "PF",
        name: "Cliente WhatsApp",
        phone: "85999998888",
      },
    });

    await request("/stock-adjustments", {
      method: "POST",
      body: {
        productId: product.body.data?.id,
        quantity: 3,
        reason: "Saldo inicial para pedido",
      },
    });

    const quoted = await request<ShippingOrder>("/shipping-orders", {
      method: "POST",
      body: {
        clientId: client.body.data?.id,
        productId: product.body.data?.id,
        quantity: 2,
      },
    });
    const beforeApproval = await request<Product>(
      `/products/${product.body.data?.id}`,
    );
    const approved = await request<ShippingOrder>(
      `/shipping-orders/${quoted.body.data?.id}/approve`,
      {
        method: "PATCH",
        body: {},
      },
    );
    const repeatedApproval = await request(
      `/shipping-orders/${quoted.body.data?.id}/approve`,
      {
        method: "PATCH",
        body: {},
      },
    );

    await request("/cash-register/open", {
      method: "POST",
      body: { openingBalance: 0 },
    });
    const paymentMethods = await request<PaymentMethod[]>(
      "/payment-methods?active=true",
    );
    const pix = paymentMethods.body.data?.find(
      (paymentMethod) => paymentMethod.code === "PIX",
    );
    const saleOverAvailable = await request("/sales", {
      method: "POST",
      body: {
        productId: product.body.data?.id,
        paymentMethodId: pix?.id,
        quantity: 2,
      },
    });
    const adjustmentOverAvailable = await request("/stock-adjustments", {
      method: "POST",
      body: {
        productId: product.body.data?.id,
        quantity: -2,
        reason: "Tentativa de retirar produto reservado",
      },
    });
    const listed = await request<ShippingOrder[]>("/shipping-orders");
    const afterApproval = await request<Product>(
      `/products/${product.body.data?.id}`,
    );
    const lowStock = await request<Product[]>("/products/low-stock");
    const separated = await request<ShippingOrder>(
      `/shipping-orders/${quoted.body.data?.id}/separate`,
      {
        method: "PATCH",
        body: {},
      },
    );
    const repeatedSeparation = await request(
      `/shipping-orders/${quoted.body.data?.id}/separate`,
      {
        method: "PATCH",
        body: {},
      },
    );
    const approvalAfterSeparation = await request(
      `/shipping-orders/${quoted.body.data?.id}/approve`,
      {
        method: "PATCH",
        body: {},
      },
    );
    const cancelled = await request<ShippingOrder>(
      `/shipping-orders/${quoted.body.data?.id}/cancel`,
      {
        method: "PATCH",
        body: { reason: "Cliente desistiu da compra" },
      },
    );
    const repeatedCancellation = await request(
      `/shipping-orders/${quoted.body.data?.id}/cancel`,
      {
        method: "PATCH",
        body: { reason: "Tentativa repetida" },
      },
    );
    const approvalAfterCancellation = await request(
      `/shipping-orders/${quoted.body.data?.id}/approve`,
      {
        method: "PATCH",
        body: {},
      },
    );
    const afterCancellation = await request<Product>(
      `/products/${product.body.data?.id}`,
    );
    const lowStockAfterCancellation = await request<Product[]>(
      "/products/low-stock",
    );

    assert.equal(quoted.status, 201);
    assert.equal(quoted.body.data?.status, "QUOTED");
    assert.equal(quoted.body.data?.clientName, "Cliente WhatsApp");
    assert.equal(quoted.body.data?.clientPhone, "85999998888");
    assert.equal(quoted.body.data?.unitPrice, "44.90");
    assert.equal(quoted.body.data?.totalAmount, "89.80");
    assert.equal(quoted.body.data?.items.length, 1);
    assert.equal(quoted.body.data?.items[0]?.productName, "Filtro para envio");
    assert.equal(beforeApproval.body.data?.currentStock, "3.000");
    assert.equal(beforeApproval.body.data?.reservedStock, "0.000");
    assert.equal(approved.status, 200);
    assert.equal(approved.body.data?.status, "APPROVED");
    assert.equal(
      approved.body.data?.approvedByUserName,
      "Administrador de teste",
    );
    assert.equal(repeatedApproval.status, 409);
    assert.equal(saleOverAvailable.status, 422);
    assert.equal(
      saleOverAvailable.body.message,
      "Estoque insuficiente para concluir a venda.",
    );
    assert.equal(adjustmentOverAvailable.status, 422);
    assert.equal(
      adjustmentOverAvailable.body.message,
      "Ajuste nao pode retirar quantidade reservada para separacao.",
    );
    assert.equal(listed.body.data?.length, 1);
    assert.equal(afterApproval.body.data?.currentStock, "3.000");
    assert.equal(afterApproval.body.data?.reservedStock, "2.000");
    assert.equal(afterApproval.body.data?.availableStock, "1.000");
    assert.equal(lowStock.body.data?.[0]?.id, product.body.data?.id);
    assert.equal(separated.status, 200);
    assert.equal(separated.body.data?.status, "SEPARATED");
    assert.ok(separated.body.data?.separatedAt);
    assert.equal(
      separated.body.data?.separatedByUserName,
      "Administrador de teste",
    );
    assert.equal(repeatedSeparation.status, 409);
    assert.equal(approvalAfterSeparation.status, 409);
    assert.equal(
      approvalAfterSeparation.body.message,
      "A separacao deste pedido ja foi confirmada.",
    );
    assert.equal(cancelled.status, 200);
    assert.equal(cancelled.body.data?.status, "CANCELLED");
    assert.ok(cancelled.body.data?.separatedAt);
    assert.equal(
      cancelled.body.data?.cancelledByUserName,
      "Administrador de teste",
    );
    assert.equal(
      cancelled.body.data?.cancellationReason,
      "Cliente desistiu da compra",
    );
    assert.equal(repeatedCancellation.status, 409);
    assert.equal(approvalAfterCancellation.status, 409);
    assert.equal(
      approvalAfterCancellation.body.message,
      "Pedido cancelado nao pode ser aprovado para separacao.",
    );
    assert.equal(afterCancellation.body.data?.currentStock, "3.000");
    assert.equal(afterCancellation.body.data?.reservedStock, "0.000");
    assert.equal(afterCancellation.body.data?.availableStock, "3.000");
    assert.equal(lowStockAfterCancellation.body.data?.length, 0);
  });

  it("completes a separated shipping order as a sale", async () => {
    const product = await request<Product>("/products", {
      method: "POST",
      body: { name: "Filtro enviado", salePrice: 69.9 },
    });
    const client = await request<Client>("/clients", {
      method: "POST",
      body: {
        personType: "PF",
        name: "Cliente do envio",
        phone: "85988887777",
      },
    });

    await request("/stock-adjustments", {
      method: "POST",
      body: {
        productId: product.body.data?.id,
        quantity: 4,
        reason: "Saldo para venda remota",
      },
    });

    const quoted = await request<ShippingOrder>("/shipping-orders", {
      method: "POST",
      body: {
        clientId: client.body.data?.id,
        productId: product.body.data?.id,
        quantity: 2,
      },
    });

    await request(`/shipping-orders/${quoted.body.data?.id}/approve`, {
      method: "PATCH",
      body: {},
    });
    await request(`/shipping-orders/${quoted.body.data?.id}/separate`, {
      method: "PATCH",
      body: {},
    });

    const paymentMethods = await request<PaymentMethod[]>(
      "/payment-methods?active=true",
    );
    const boleto = paymentMethods.body.data?.find(
      (paymentMethod) => paymentMethod.code === "BOLETO",
    );
    const withoutCash = await request(
      `/shipping-orders/${quoted.body.data?.id}/complete`,
      {
        method: "PATCH",
        body: { paymentMethodId: boleto?.id },
      },
    );

    await request("/cash-register/open", {
      method: "POST",
      body: { openingBalance: 0 },
    });

    const completed = await request<ShippingOrder>(
      `/shipping-orders/${quoted.body.data?.id}/complete`,
      {
        method: "PATCH",
        body: { paymentMethodId: boleto?.id },
      },
    );
    const repeatedCompletion = await request(
      `/shipping-orders/${quoted.body.data?.id}/complete`,
      {
        method: "PATCH",
        body: { paymentMethodId: boleto?.id },
      },
    );
    const cancellationAfterCompletion = await request(
      `/shipping-orders/${quoted.body.data?.id}/cancel`,
      {
        method: "PATCH",
        body: { reason: "Tentativa apos venda" },
      },
    );
    const sales = await request<Sale[]>("/sales");
    const updatedProduct = await request<Product>(
      `/products/${product.body.data?.id}`,
    );
    const movements = await request<StockMovement[]>("/stock-movements");
    const saleMovement = movements.body.data?.find(
      (movement) => movement.type === "SALE",
    );
    const linkedSaleCancellation = await request(
      `/sales/${sales.body.data?.[0]?.id}/cancel`,
      {
        method: "PATCH",
        body: { reason: "Tentativa pelo fluxo de balcao" },
      },
    );
    const linkedSaleFiscalDocument = await request(
      `/sales/${sales.body.data?.[0]?.id}/fiscal-documents`,
      {
        method: "POST",
        body: { documentType: "NFE" },
      },
    );

    assert.equal(withoutCash.status, 422);
    assert.equal(
      withoutCash.body.message,
      "Abra o caixa antes de concluir a venda para envio.",
    );
    assert.equal(completed.status, 200);
    assert.equal(completed.body.data?.status, "COMPLETED");
    assert.ok(completed.body.data?.saleId);
    assert.ok(completed.body.data?.completedAt);
    assert.equal(
      completed.body.data?.completedByUserName,
      "Administrador de teste",
    );
    assert.equal(repeatedCompletion.status, 409);
    assert.equal(cancellationAfterCompletion.status, 409);
    assert.equal(linkedSaleCancellation.status, 409);
    assert.equal(
      linkedSaleCancellation.body.message,
      "Venda gerada por envio ou retirada nao pode ser cancelada por este fluxo.",
    );
    assert.equal(linkedSaleFiscalDocument.status, 409);
    assert.equal(
      linkedSaleFiscalDocument.body.message,
      "Venda gerada por envio ou retirada deve emitir NF-e pelo fluxo de origem.",
    );
    assert.equal(sales.body.data?.length, 1);
    assert.equal(sales.body.data?.[0]?.clientName, "Cliente do envio");
    assert.equal(sales.body.data?.[0]?.paymentMethodName, "Boleto");
    assert.equal(sales.body.data?.[0]?.totalAmount, "139.80");
    const fiscalDocument = await request<FiscalDocument>(
      `/shipping-orders/${completed.body.data?.id}/fiscal-documents`,
      {
        method: "POST",
        body: { documentType: "NFE" },
      },
    );

    assert.equal(updatedProduct.body.data?.currentStock, "2.000");
    assert.equal(updatedProduct.body.data?.reservedStock, "0.000");
    assert.equal(updatedProduct.body.data?.availableStock, "2.000");
    assert.equal(saleMovement?.quantity, "-2.000");
    assert.equal(fiscalDocument.status, 201);
    assert.equal(fiscalDocument.body.data?.sourceType, "SHIPPING_ORDER");
    assert.equal(fiscalDocument.body.data?.sourceId, completed.body.data?.id);
  });

  it("blocks shipping fiscal issue when the linked sale already has an active fiscal document", async () => {
    const product = await request<Product>("/products", {
      method: "POST",
      body: { name: "Filtro envio fiscal legado", salePrice: 80 },
    });
    const client = await request<Client>("/clients", {
      method: "POST",
      body: {
        personType: "PF",
        name: "Cliente envio fiscal legado",
      },
    });

    await request("/stock-adjustments", {
      method: "POST",
      body: {
        productId: product.body.data?.id,
        quantity: 2,
        reason: "Saldo para fiscal legado",
      },
    });

    const quoted = await request<ShippingOrder>("/shipping-orders", {
      method: "POST",
      body: {
        clientId: client.body.data?.id,
        productId: product.body.data?.id,
        quantity: 1,
      },
    });
    await request(`/shipping-orders/${quoted.body.data?.id}/approve`, {
      method: "PATCH",
      body: {},
    });
    await request(`/shipping-orders/${quoted.body.data?.id}/separate`, {
      method: "PATCH",
      body: {},
    });

    const paymentMethods = await request<PaymentMethod[]>(
      "/payment-methods?active=true",
    );
    const boleto = paymentMethods.body.data?.find(
      (paymentMethod) => paymentMethod.code === "BOLETO",
    );

    await request("/cash-register/open", {
      method: "POST",
      body: { openingBalance: 0 },
    });

    const completed = await request<ShippingOrder>(
      `/shipping-orders/${quoted.body.data?.id}/complete`,
      {
        method: "PATCH",
        body: { paymentMethodId: boleto?.id },
      },
    );
    const administrator = await db("users")
      .select("id")
      .where("email", "admin@example.com")
      .first();

    await db("fiscal_documents").insert({
      source_type: "SALE",
      source_id: completed.body.data?.saleId,
      document_type: "NFE",
      provider: "MOCK",
      environment: "HOMOLOGATION",
      status: "AUTHORIZED",
      provider_reference: `SALE${completed.body.data?.saleId?.replace(/-/g, "")}`,
      response_payload: {},
      issued_by_user_id: administrator.id,
      issued_at: db.fn.now(),
    });

    const fiscalDocument = await request(
      `/shipping-orders/${completed.body.data?.id}/fiscal-documents`,
      {
        method: "POST",
        body: { documentType: "NFE" },
      },
    );

    assert.equal(fiscalDocument.status, 409);
    assert.equal(
      fiscalDocument.body.message,
      "Documento fiscal ja emitido para esta venda operacional.",
    );
  });

  it("completes a multi-item quoted shipping order as a sale", async () => {
    const firstProduct = await request<Product>("/products", {
      method: "POST",
      body: { name: "Filtro envio multi A", salePrice: 40 },
    });
    const secondProduct = await request<Product>("/products", {
      method: "POST",
      body: { name: "Filtro envio multi B", salePrice: 75 },
    });
    const client = await request<Client>("/clients", {
      method: "POST",
      body: { personType: "PF", name: "Cliente envio multi" },
    });

    await request("/stock-adjustments", {
      method: "POST",
      body: {
        productId: firstProduct.body.data?.id,
        quantity: 5,
        reason: "Saldo para envio multi A",
      },
    });
    await request("/stock-adjustments", {
      method: "POST",
      body: {
        productId: secondProduct.body.data?.id,
        quantity: 3,
        reason: "Saldo para envio multi B",
      },
    });

    const quote = await request<Quote>("/quotes", {
      method: "POST",
      body: {
        clientId: client.body.data?.id,
        items: [
          { productId: firstProduct.body.data?.id, quantity: 2 },
          { productId: secondProduct.body.data?.id, quantity: 1 },
        ],
      },
    });
    const shippingOrder = await request<ShippingOrder>(
      `/quotes/${quote.body.data?.id}/shipping-order`,
      {
        method: "POST",
        body: {},
      },
    );

    await request(`/shipping-orders/${shippingOrder.body.data?.id}/approve`, {
      method: "PATCH",
      body: {},
    });
    await request(`/shipping-orders/${shippingOrder.body.data?.id}/separate`, {
      method: "PATCH",
      body: {},
    });
    await request("/cash-register/open", {
      method: "POST",
      body: { openingBalance: 0 },
    });

    const paymentMethods = await request<PaymentMethod[]>(
      "/payment-methods?active=true",
    );
    const boleto = paymentMethods.body.data?.find(
      (paymentMethod) => paymentMethod.code === "BOLETO",
    );
    const completed = await request<ShippingOrder>(
      `/shipping-orders/${shippingOrder.body.data?.id}/complete`,
      {
        method: "PATCH",
        body: { paymentMethodId: boleto?.id },
      },
    );
    const sales = await request<Sale[]>("/sales");
    const firstUpdatedProduct = await request<Product>(
      `/products/${firstProduct.body.data?.id}`,
    );
    const secondUpdatedProduct = await request<Product>(
      `/products/${secondProduct.body.data?.id}`,
    );
    const movements = await request<StockMovement[]>("/stock-movements");
    const saleMovements =
      movements.body.data?.filter((movement) => movement.type === "SALE") ?? [];

    assert.equal(completed.status, 200);
    assert.equal(completed.body.data?.status, "COMPLETED");
    assert.equal(sales.body.data?.length, 1);
    assert.equal(sales.body.data?.[0]?.items.length, 2);
    assert.equal(sales.body.data?.[0]?.totalAmount, "155.00");
    assert.equal(
      sales.body.data?.[0]?.items[0]?.productName,
      "Filtro envio multi A",
    );
    assert.equal(sales.body.data?.[0]?.items[0]?.quantity, "2.000");
    assert.equal(
      sales.body.data?.[0]?.items[1]?.productName,
      "Filtro envio multi B",
    );
    assert.equal(sales.body.data?.[0]?.items[1]?.quantity, "1.000");
    assert.equal(firstUpdatedProduct.body.data?.currentStock, "3.000");
    assert.equal(firstUpdatedProduct.body.data?.reservedStock, "0.000");
    assert.equal(secondUpdatedProduct.body.data?.currentStock, "2.000");
    assert.equal(secondUpdatedProduct.body.data?.reservedStock, "0.000");
    assert.equal(saleMovements.length, 2);
    assert.ok(
      saleMovements.some(
        (movement) => movement.productName === "Filtro envio multi A",
      ),
    );
    assert.ok(
      saleMovements.some(
        (movement) => movement.productName === "Filtro envio multi B",
      ),
    );
  });

  it("creates and cancels a pickup reservation releasing reserved stock", async () => {
    const product = await request<Product>("/products", {
      method: "POST",
      body: { name: "Filtro reservado", salePrice: 49.9 },
    });
    const client = await request<Client>("/clients", {
      method: "POST",
      body: {
        personType: "PF",
        name: "Cliente retirada",
        phone: "85977776666",
      },
    });

    await request("/stock-adjustments", {
      method: "POST",
      body: {
        productId: product.body.data?.id,
        quantity: 3,
        reason: "Saldo para reserva",
      },
    });

    const created = await request<PickupReservation>("/pickup-reservations", {
      method: "POST",
      body: {
        clientId: client.body.data?.id,
        productId: product.body.data?.id,
        quantity: 2,
      },
    });
    const repeatedOverAvailable = await request("/pickup-reservations", {
      method: "POST",
      body: {
        clientId: client.body.data?.id,
        productId: product.body.data?.id,
        quantity: 2,
      },
    });
    const reservedProduct = await request<Product>(
      `/products/${product.body.data?.id}`,
    );
    const cancelled = await request<PickupReservation>(
      `/pickup-reservations/${created.body.data?.id}/cancel`,
      {
        method: "PATCH",
        body: { reason: "Cliente desistiu" },
      },
    );
    const repeatedCancellation = await request(
      `/pickup-reservations/${created.body.data?.id}/cancel`,
      {
        method: "PATCH",
        body: { reason: "Tentativa repetida" },
      },
    );
    const listed = await request<PickupReservation[]>("/pickup-reservations");
    const releasedProduct = await request<Product>(
      `/products/${product.body.data?.id}`,
    );

    assert.equal(created.status, 201);
    assert.equal(created.body.data?.status, "RESERVED");
    assert.equal(created.body.data?.totalAmount, "99.80");
    assert.equal(created.body.data?.items.length, 1);
    assert.equal(repeatedOverAvailable.status, 422);
    assert.equal(
      repeatedOverAvailable.body.message,
      "Quantidade indisponivel para esta reserva.",
    );
    assert.equal(reservedProduct.body.data?.reservedStock, "2.000");
    assert.equal(reservedProduct.body.data?.availableStock, "1.000");
    assert.equal(cancelled.status, 200);
    assert.equal(cancelled.body.data?.status, "CANCELLED");
    assert.equal(
      cancelled.body.data?.cancelledByUserName,
      "Administrador de teste",
    );
    assert.equal(cancelled.body.data?.cancellationReason, "Cliente desistiu");
    assert.equal(repeatedCancellation.status, 409);
    assert.equal(listed.body.data?.length, 1);
    assert.equal(releasedProduct.body.data?.reservedStock, "0.000");
    assert.equal(releasedProduct.body.data?.availableStock, "3.000");
  });

  it("completes a pickup reservation as a sale", async () => {
    const product = await request<Product>("/products", {
      method: "POST",
      body: { name: "Filtro retirada venda", salePrice: 39.9 },
    });
    const client = await request<Client>("/clients", {
      method: "POST",
      body: { personType: "PF", name: "Cliente retirou" },
    });

    await request("/stock-adjustments", {
      method: "POST",
      body: {
        productId: product.body.data?.id,
        quantity: 5,
        reason: "Saldo para retirada",
      },
    });

    const reservation = await request<PickupReservation>(
      "/pickup-reservations",
      {
        method: "POST",
        body: {
          clientId: client.body.data?.id,
          productId: product.body.data?.id,
          quantity: 2,
        },
      },
    );
    const paymentMethods = await request<PaymentMethod[]>(
      "/payment-methods?active=true",
    );
    const boleto = paymentMethods.body.data?.find(
      (paymentMethod) => paymentMethod.code === "BOLETO",
    );
    const withoutCash = await request(
      `/pickup-reservations/${reservation.body.data?.id}/complete`,
      {
        method: "PATCH",
        body: { paymentMethodId: boleto?.id },
      },
    );

    await request("/cash-register/open", {
      method: "POST",
      body: { openingBalance: 0 },
    });

    const completed = await request<PickupReservation>(
      `/pickup-reservations/${reservation.body.data?.id}/complete`,
      {
        method: "PATCH",
        body: { paymentMethodId: boleto?.id },
      },
    );
    const repeatedCompletion = await request(
      `/pickup-reservations/${reservation.body.data?.id}/complete`,
      {
        method: "PATCH",
        body: { paymentMethodId: boleto?.id },
      },
    );
    const cancellationAfterCompletion = await request(
      `/pickup-reservations/${reservation.body.data?.id}/cancel`,
      {
        method: "PATCH",
        body: { reason: "Tentativa apos retirada" },
      },
    );
    const sales = await request<Sale[]>("/sales");
    const updatedProduct = await request<Product>(
      `/products/${product.body.data?.id}`,
    );
    const movements = await request<StockMovement[]>("/stock-movements");
    const saleMovement = movements.body.data?.find(
      (movement) => movement.type === "SALE",
    );
    const fiscalDocument = await request<FiscalDocument>(
      `/pickup-reservations/${completed.body.data?.id}/fiscal-documents`,
      {
        method: "POST",
        body: { documentType: "NFE" },
      },
    );
    const linkedSaleCancellation = await request(
      `/sales/${sales.body.data?.[0]?.id}/cancel`,
      {
        method: "PATCH",
        body: { reason: "Tentativa pelo fluxo de balcao" },
      },
    );

    assert.equal(withoutCash.status, 422);
    assert.equal(
      withoutCash.body.message,
      "Abra o caixa antes de concluir a reserva para retirada.",
    );
    assert.equal(completed.status, 200);
    assert.equal(completed.body.data?.status, "COMPLETED");
    assert.ok(completed.body.data?.saleId);
    assert.ok(completed.body.data?.completedAt);
    assert.equal(
      completed.body.data?.completedByUserName,
      "Administrador de teste",
    );
    assert.equal(repeatedCompletion.status, 409);
    assert.equal(cancellationAfterCompletion.status, 409);
    assert.equal(linkedSaleCancellation.status, 409);
    assert.equal(
      linkedSaleCancellation.body.message,
      "Venda gerada por envio ou retirada nao pode ser cancelada por este fluxo.",
    );
    assert.equal(sales.body.data?.length, 1);
    assert.equal(sales.body.data?.[0]?.clientName, "Cliente retirou");
    assert.equal(sales.body.data?.[0]?.paymentMethodName, "Boleto");
    assert.equal(sales.body.data?.[0]?.totalAmount, "79.80");
    assert.equal(updatedProduct.body.data?.currentStock, "3.000");
    assert.equal(updatedProduct.body.data?.reservedStock, "0.000");
    assert.equal(updatedProduct.body.data?.availableStock, "3.000");
    assert.equal(saleMovement?.quantity, "-2.000");
    assert.equal(fiscalDocument.status, 201);
    assert.equal(fiscalDocument.body.data?.sourceType, "PICKUP_RESERVATION");
    assert.equal(fiscalDocument.body.data?.sourceId, completed.body.data?.id);
  });

  it("blocks pickup fiscal issue when the linked sale already has an active fiscal document", async () => {
    const product = await request<Product>("/products", {
      method: "POST",
      body: { name: "Filtro retirada fiscal legado", salePrice: 80 },
    });
    const client = await request<Client>("/clients", {
      method: "POST",
      body: {
        personType: "PF",
        name: "Cliente retirada fiscal legado",
      },
    });

    await request("/stock-adjustments", {
      method: "POST",
      body: {
        productId: product.body.data?.id,
        quantity: 2,
        reason: "Saldo para fiscal legado retirada",
      },
    });

    const reservation = await request<PickupReservation>(
      "/pickup-reservations",
      {
        method: "POST",
        body: {
          clientId: client.body.data?.id,
          productId: product.body.data?.id,
          quantity: 1,
        },
      },
    );
    const paymentMethods = await request<PaymentMethod[]>(
      "/payment-methods?active=true",
    );
    const boleto = paymentMethods.body.data?.find(
      (paymentMethod) => paymentMethod.code === "BOLETO",
    );

    await request("/cash-register/open", {
      method: "POST",
      body: { openingBalance: 0 },
    });

    const completed = await request<PickupReservation>(
      `/pickup-reservations/${reservation.body.data?.id}/complete`,
      {
        method: "PATCH",
        body: { paymentMethodId: boleto?.id },
      },
    );
    const administrator = await db("users")
      .select("id")
      .where("email", "admin@example.com")
      .first();

    await db("fiscal_documents").insert({
      source_type: "SALE",
      source_id: completed.body.data?.saleId,
      document_type: "NFE",
      provider: "MOCK",
      environment: "HOMOLOGATION",
      status: "AUTHORIZED",
      provider_reference: `SALE${completed.body.data?.saleId?.replace(/-/g, "")}`,
      response_payload: {},
      issued_by_user_id: administrator.id,
      issued_at: db.fn.now(),
    });

    const fiscalDocument = await request(
      `/pickup-reservations/${completed.body.data?.id}/fiscal-documents`,
      {
        method: "POST",
        body: { documentType: "NFE" },
      },
    );

    assert.equal(fiscalDocument.status, 409);
    assert.equal(
      fiscalDocument.body.message,
      "Documento fiscal ja emitido para esta venda operacional.",
    );
  });

  it("completes a multi-item pickup reservation as a sale", async () => {
    const firstProduct = await request<Product>("/products", {
      method: "POST",
      body: { name: "Filtro retirada multi A", salePrice: 25 },
    });
    const secondProduct = await request<Product>("/products", {
      method: "POST",
      body: { name: "Filtro retirada multi B", salePrice: 60 },
    });
    const client = await request<Client>("/clients", {
      method: "POST",
      body: { personType: "PF", name: "Cliente retirada multi" },
    });

    await request("/stock-adjustments", {
      method: "POST",
      body: {
        productId: firstProduct.body.data?.id,
        quantity: 4,
        reason: "Saldo para retirada multi A",
      },
    });
    await request("/stock-adjustments", {
      method: "POST",
      body: {
        productId: secondProduct.body.data?.id,
        quantity: 2,
        reason: "Saldo para retirada multi B",
      },
    });

    const reservation = await request<PickupReservation>(
      "/pickup-reservations",
      {
        method: "POST",
        body: {
          clientId: client.body.data?.id,
          items: [
            { productId: firstProduct.body.data?.id, quantity: 2 },
            { productId: secondProduct.body.data?.id, quantity: 1 },
          ],
        },
      },
    );
    const firstReservedProduct = await request<Product>(
      `/products/${firstProduct.body.data?.id}`,
    );
    const secondReservedProduct = await request<Product>(
      `/products/${secondProduct.body.data?.id}`,
    );

    await request("/cash-register/open", {
      method: "POST",
      body: { openingBalance: 0 },
    });

    const paymentMethods = await request<PaymentMethod[]>(
      "/payment-methods?active=true",
    );
    const boleto = paymentMethods.body.data?.find(
      (paymentMethod) => paymentMethod.code === "BOLETO",
    );
    const completed = await request<PickupReservation>(
      `/pickup-reservations/${reservation.body.data?.id}/complete`,
      {
        method: "PATCH",
        body: { paymentMethodId: boleto?.id },
      },
    );
    const sales = await request<Sale[]>("/sales");
    const firstUpdatedProduct = await request<Product>(
      `/products/${firstProduct.body.data?.id}`,
    );
    const secondUpdatedProduct = await request<Product>(
      `/products/${secondProduct.body.data?.id}`,
    );
    const movements = await request<StockMovement[]>("/stock-movements");
    const saleMovements =
      movements.body.data?.filter((movement) => movement.type === "SALE") ?? [];

    assert.equal(reservation.status, 201);
    assert.equal(reservation.body.data?.items.length, 2);
    assert.equal(reservation.body.data?.totalAmount, "110.00");
    assert.equal(firstReservedProduct.body.data?.reservedStock, "2.000");
    assert.equal(secondReservedProduct.body.data?.reservedStock, "1.000");
    assert.equal(completed.status, 200);
    assert.equal(completed.body.data?.status, "COMPLETED");
    assert.equal(sales.body.data?.length, 1);
    assert.equal(sales.body.data?.[0]?.items.length, 2);
    assert.equal(sales.body.data?.[0]?.totalAmount, "110.00");
    assert.equal(firstUpdatedProduct.body.data?.currentStock, "2.000");
    assert.equal(firstUpdatedProduct.body.data?.reservedStock, "0.000");
    assert.equal(secondUpdatedProduct.body.data?.currentStock, "1.000");
    assert.equal(secondUpdatedProduct.body.data?.reservedStock, "0.000");
    assert.equal(saleMovements.length, 2);
    assert.ok(
      saleMovements.some(
        (movement) => movement.productName === "Filtro retirada multi A",
      ),
    );
    assert.ok(
      saleMovements.some(
        (movement) => movement.productName === "Filtro retirada multi B",
      ),
    );
  });

  it("creates and shows a multi-item quote using commercial descriptions", async () => {
    const firstProduct = await request<Product>("/products", {
      method: "POST",
      body: { name: "Filtro quote A", salePrice: 50 },
    });
    const secondProduct = await request<Product>("/products", {
      method: "POST",
      body: {
        name: "Filtro quote B - fabricante interno",
        salePrice: 80,
        description: "Descricao comercial limpa para o cliente",
      },
    });
    const client = await request<Client>("/clients", {
      method: "POST",
      body: {
        personType: "PF",
        name: "Cliente orcamento",
        phone: "85911112222",
      },
    });

    await request("/stock-adjustments", {
      method: "POST",
      body: {
        productId: firstProduct.body.data?.id,
        quantity: 2,
        reason: "Saldo nao deve mudar no orcamento",
      },
    });

    const created = await request<Quote>("/quotes", {
      method: "POST",
      body: {
        clientId: client.body.data?.id,
        validUntil: "2026-06-30",
        notes: "Retirar condicoes no PDF depois",
        showBrand: false,
        items: [
          {
            productId: firstProduct.body.data?.id,
            quantity: 2,
            unitPrice: 45,
            description: "Filtro quote A promocional",
          },
          {
            productId: secondProduct.body.data?.id,
            quantity: 1,
          },
        ],
      },
    });
    const shown = await request<Quote>(`/quotes/${created.body.data?.id}`);
    const listed = await request<Quote[]>("/quotes");
    const pdf = await requestRaw(`/quotes/${created.body.data?.id}/pdf`);
    const shippingOrder = await request<ShippingOrder>(
      `/quotes/${created.body.data?.id}/shipping-order`,
      {
        method: "POST",
        body: {},
      },
    );
    const repeatedShippingOrder = await request(
      `/quotes/${created.body.data?.id}/shipping-order`,
      {
        method: "POST",
        body: {},
      },
    );
    const listedAfterShippingOrder = await request<Quote[]>("/quotes");
    const listedShippingOrders =
      await request<ShippingOrder[]>("/shipping-orders");
    const unchangedProduct = await request<Product>(
      `/products/${firstProduct.body.data?.id}`,
    );

    assert.equal(created.status, 201);
    assert.equal(created.body.data?.status, "DRAFT");
    assert.equal(created.body.data?.clientName, "Cliente orcamento");
    assert.equal(created.body.data?.showBrand, false);
    assert.equal(created.body.data?.totalAmount, "170.00");
    assert.ok(created.body.data?.validUntil?.startsWith("2026-06-30"));
    assert.equal(created.body.data?.notes, "Retirar condicoes no PDF depois");
    assert.equal(created.body.data?.items.length, 2);
    assert.equal(
      created.body.data?.items[0]?.description,
      "Filtro quote A promocional",
    );
    assert.equal(created.body.data?.items[0]?.unitPrice, "45.00");
    assert.equal(created.body.data?.items[0]?.totalAmount, "90.00");
    assert.equal(
      created.body.data?.items[1]?.description,
      "Descricao comercial limpa para o cliente",
    );
    assert.equal(
      created.body.data?.items[1]?.productName,
      "Filtro quote B - fabricante interno",
    );
    assert.equal(created.body.data?.items[1]?.unitPrice, "80.00");
    assert.equal(shown.body.data?.items.length, 2);
    assert.equal(shown.body.data?.showBrand, false);
    assert.equal(shown.body.data?.shippingOrderId, null);
    assert.equal(shown.body.data?.shippingOrderStatus, null);
    assert.equal(listed.body.data?.length, 1);
    assert.equal(listed.body.data?.[0]?.showBrand, false);
    assert.equal(listed.body.data?.[0]?.shippingOrderId, null);
    assert.equal(pdf.status, 200);
    assert.equal(pdf.contentType, "application/pdf");
    assert.equal(pdf.body.subarray(0, 4).toString(), "%PDF");
    assert.equal(shippingOrder.status, 201);
    assert.equal(shippingOrder.body.data?.quoteId, created.body.data?.id);
    assert.equal(shippingOrder.body.data?.clientName, "Cliente orcamento");
    assert.equal(shippingOrder.body.data?.totalAmount, "170.00");
    assert.equal(shippingOrder.body.data?.items.length, 2);
    assert.equal(
      shippingOrder.body.data?.items[0]?.productName,
      "Filtro quote A",
    );
    assert.equal(shippingOrder.body.data?.items[0]?.quantity, "2.000");
    assert.equal(
      shippingOrder.body.data?.items[1]?.productName,
      "Filtro quote B - fabricante interno",
    );
    assert.equal(
      shippingOrder.body.data?.items[1]?.description,
      "Descricao comercial limpa para o cliente",
    );
    assert.equal(shippingOrder.body.data?.items[1]?.unitPrice, "80.00");
    assert.equal(repeatedShippingOrder.status, 409);
    assert.equal(
      repeatedShippingOrder.body.message,
      "Este orcamento ja foi enviado para pedidos de envio.",
    );
    assert.equal(
      listedAfterShippingOrder.body.data?.[0]?.shippingOrderId,
      shippingOrder.body.data?.id,
    );
    assert.equal(
      listedAfterShippingOrder.body.data?.[0]?.shippingOrderStatus,
      "QUOTED",
    );
    assert.equal(listedShippingOrders.body.data?.length, 1);
    assert.equal(listedShippingOrders.body.data?.[0]?.items.length, 2);
    assert.equal(unchangedProduct.body.data?.currentStock, "2.000");
    assert.equal(unchangedProduct.body.data?.reservedStock, "0.000");
  });

  it("updates a draft quote before it becomes a shipping order", async () => {
    const firstProduct = await request<Product>("/products", {
      method: "POST",
      body: { name: "Filtro quote edicao A", salePrice: 40 },
    });
    const secondProduct = await request<Product>("/products", {
      method: "POST",
      body: {
        name: "Filtro quote edicao B",
        salePrice: 90,
        description: "Descricao comercial edicao B",
      },
    });
    const client = await request<Client>("/clients", {
      method: "POST",
      body: { personType: "PF", name: "Cliente edita orcamento" },
    });
    const created = await request<Quote>("/quotes", {
      method: "POST",
      body: {
        clientId: client.body.data?.id,
        items: [{ productId: firstProduct.body.data?.id, quantity: 1 }],
      },
    });

    const updated = await request<Quote>(`/quotes/${created.body.data?.id}`, {
      method: "PUT",
      body: {
        clientId: client.body.data?.id,
        validUntil: "2026-07-15",
        notes: "Orcamento revisado pelo cliente",
        showBrand: false,
        discountAmount: 10,
        items: [
          {
            productId: secondProduct.body.data?.id,
            quantity: 2,
            unitPrice: 85,
            discountAmount: 5,
          },
        ],
      },
    });
    const shown = await request<Quote>(`/quotes/${created.body.data?.id}`);
    await request(`/quotes/${created.body.data?.id}/shipping-order`, {
      method: "POST",
      body: {},
    });
    const updateAfterShippingOrder = await request(
      `/quotes/${created.body.data?.id}`,
      {
        method: "PUT",
        body: {
          clientId: client.body.data?.id,
          items: [{ productId: firstProduct.body.data?.id, quantity: 1 }],
        },
      },
    );

    assert.equal(updated.status, 200);
    assert.equal(updated.body.data?.id, created.body.data?.id);
    assert.equal(updated.body.data?.subtotalAmount, "170.00");
    assert.equal(updated.body.data?.discountAmount, "10.00");
    assert.equal(updated.body.data?.totalAmount, "155.00");
    assert.equal(updated.body.data?.showBrand, false);
    assert.ok(updated.body.data?.validUntil?.startsWith("2026-07-15"));
    assert.equal(updated.body.data?.notes, "Orcamento revisado pelo cliente");
    assert.equal(updated.body.data?.items.length, 1);
    assert.equal(
      updated.body.data?.items[0]?.productName,
      "Filtro quote edicao B",
    );
    assert.equal(
      updated.body.data?.items[0]?.description,
      "Descricao comercial edicao B",
    );
    assert.equal(updated.body.data?.items[0]?.quantity, "2.000");
    assert.equal(updated.body.data?.items[0]?.unitPrice, "85.00");
    assert.equal(updated.body.data?.items[0]?.discountAmount, "5.00");
    assert.equal(updated.body.data?.items[0]?.totalAmount, "165.00");
    assert.equal(shown.body.data?.totalAmount, "155.00");
    assert.equal(shown.body.data?.items.length, 1);
    assert.equal(updateAfterShippingOrder.status, 409);
    assert.equal(
      updateAfterShippingOrder.body.message,
      "Orcamento enviado para pedido de envio deve seguir o fluxo do pedido.",
    );
  });

  it("cancels a draft quote before it becomes a shipping order", async () => {
    const product = await request<Product>("/products", {
      method: "POST",
      body: { name: "Filtro quote cancelado", salePrice: 60 },
    });
    const client = await request<Client>("/clients", {
      method: "POST",
      body: { personType: "PF", name: "Cliente cancela orcamento" },
    });
    const draft = await request<Quote>("/quotes", {
      method: "POST",
      body: {
        clientId: client.body.data?.id,
        items: [{ productId: product.body.data?.id, quantity: 1 }],
      },
    });
    const sentQuote = await request<Quote>("/quotes", {
      method: "POST",
      body: {
        clientId: client.body.data?.id,
        items: [{ productId: product.body.data?.id, quantity: 1 }],
      },
    });

    await request(`/quotes/${sentQuote.body.data?.id}/shipping-order`, {
      method: "POST",
      body: {},
    });

    const cancelled = await request<Quote>(
      `/quotes/${draft.body.data?.id}/cancel`,
      {
        method: "PATCH",
        body: { reason: "Cliente recusou a proposta" },
      },
    );
    const repeatedCancellation = await request(
      `/quotes/${draft.body.data?.id}/cancel`,
      {
        method: "PATCH",
        body: { reason: "Tentativa repetida" },
      },
    );
    const shippingOrderAfterCancellation = await request(
      `/quotes/${draft.body.data?.id}/shipping-order`,
      {
        method: "POST",
        body: {},
      },
    );
    const cancellationAfterShippingOrder = await request(
      `/quotes/${sentQuote.body.data?.id}/cancel`,
      {
        method: "PATCH",
        body: { reason: "Pedido ja enviado" },
      },
    );
    const listed = await request<Quote[]>("/quotes");

    assert.equal(cancelled.status, 200);
    assert.equal(cancelled.body.data?.status, "CANCELLED");
    assert.equal(
      cancelled.body.data?.cancellationReason,
      "Cliente recusou a proposta",
    );
    assert.ok(cancelled.body.data?.cancelledAt);
    assert.equal(
      cancelled.body.data?.cancelledByUserName,
      "Administrador de teste",
    );
    assert.equal(repeatedCancellation.status, 409);
    assert.equal(
      repeatedCancellation.body.message,
      "Este orcamento ja foi cancelado.",
    );
    assert.equal(shippingOrderAfterCancellation.status, 409);
    assert.equal(
      shippingOrderAfterCancellation.body.message,
      "Orcamento cancelado nao pode gerar pedido de envio.",
    );
    assert.equal(cancellationAfterShippingOrder.status, 409);
    assert.equal(
      cancellationAfterShippingOrder.body.message,
      "Orcamento enviado para pedido de envio deve seguir o fluxo do pedido.",
    );
    assert.ok(listed.body.data?.some((quote) => quote.status === "CANCELLED"));
  });

  it("rejects quotes with unavailable products or empty items", async () => {
    const product = await request<Product>("/products", {
      method: "POST",
      body: { name: "Filtro indisponivel quote", salePrice: 25 },
    });
    const client = await request<Client>("/clients", {
      method: "POST",
      body: { personType: "PF", name: "Cliente quote invalido" },
    });

    await request(`/products/${product.body.data?.id}/status`, {
      method: "PATCH",
      body: { active: false },
    });

    const withoutItems = await request("/quotes", {
      method: "POST",
      body: {
        clientId: client.body.data?.id,
        items: [],
      },
    });
    const inactiveProduct = await request("/quotes", {
      method: "POST",
      body: {
        clientId: client.body.data?.id,
        items: [{ productId: product.body.data?.id, quantity: 1 }],
      },
    });

    assert.equal(withoutItems.status, 422);
    assert.equal(withoutItems.body.errors?.[0]?.field, "items");
    assert.equal(inactiveProduct.status, 422);
    assert.equal(
      inactiveProduct.body.message,
      "Um ou mais produtos informados nao estao disponiveis para orcamento.",
    );
  });

  it("requires explicit confirmation to sell without available stock", async () => {
    const product = await request<Product>("/products", {
      method: "POST",
      body: { name: "Filtro venda sem estoque", salePrice: 100 },
    });
    const paymentMethods = await request<PaymentMethod[]>(
      "/payment-methods?active=true",
    );
    const pix = paymentMethods.body.data?.find(
      (paymentMethod) => paymentMethod.code === "PIX",
    );

    await request("/cash-register/open", {
      method: "POST",
      body: { openingBalance: 0 },
    });

    const blocked = await request("/sales", {
      method: "POST",
      body: {
        productId: product.body.data?.id,
        paymentMethodId: pix?.id,
        quantity: 1,
      },
    });
    const confirmed = await request<Sale>("/sales", {
      method: "POST",
      body: {
        productId: product.body.data?.id,
        paymentMethodId: pix?.id,
        quantity: 1,
        allowInsufficientStock: true,
      },
    });
    const updatedProduct = await request<Product>(
      `/products/${product.body.data?.id}`,
    );

    assert.equal(blocked.status, 422);
    assert.equal(blocked.body.message, "Estoque insuficiente para concluir a venda.");
    assert.equal(confirmed.status, 201);
    assert.equal(confirmed.body.data?.totalAmount, "100.00");
    assert.equal(updatedProduct.body.data?.currentStock, "-1.000");
  });

  it("requires explicit confirmation to reserve pickup without available stock", async () => {
    const product = await request<Product>("/products", {
      method: "POST",
      body: { name: "Filtro retirada sem estoque", salePrice: 75 },
    });
    const client = await request<Client>("/clients", {
      method: "POST",
      body: { personType: "PF", name: "Cliente reserva sem estoque" },
    });

    const blocked = await request("/pickup-reservations", {
      method: "POST",
      body: {
        clientId: client.body.data?.id,
        productId: product.body.data?.id,
        quantity: 2,
      },
    });
    const confirmed = await request<PickupReservation>("/pickup-reservations", {
      method: "POST",
      body: {
        clientId: client.body.data?.id,
        productId: product.body.data?.id,
        quantity: 2,
        allowInsufficientStock: true,
      },
    });
    const updatedProduct = await request<Product>(
      `/products/${product.body.data?.id}`,
    );

    assert.equal(blocked.status, 422);
    assert.equal(blocked.body.message, "Quantidade indisponivel para esta reserva.");
    assert.equal(confirmed.status, 201);
    assert.equal(confirmed.body.data?.totalAmount, "150.00");
    assert.equal(updatedProduct.body.data?.reservedStock, "2.000");
    assert.equal(updatedProduct.body.data?.availableStock, "-2.000");
  });

  it("requires explicit confirmation to approve shipping without available stock", async () => {
    const product = await request<Product>("/products", {
      method: "POST",
      body: { name: "Filtro envio sem estoque", salePrice: 55 },
    });
    const client = await request<Client>("/clients", {
      method: "POST",
      body: { personType: "PF", name: "Cliente envio sem estoque" },
    });

    const blockedQuote = await request("/shipping-orders", {
      method: "POST",
      body: {
        clientId: client.body.data?.id,
        productId: product.body.data?.id,
        quantity: 2,
      },
    });
    const quoted = await request<ShippingOrder>("/shipping-orders", {
      method: "POST",
      body: {
        clientId: client.body.data?.id,
        productId: product.body.data?.id,
        quantity: 2,
        allowInsufficientStock: true,
      },
    });
    const blockedApproval = await request(
      `/shipping-orders/${quoted.body.data?.id}/approve`,
      {
        method: "PATCH",
        body: {},
      },
    );
    const approved = await request<ShippingOrder>(
      `/shipping-orders/${quoted.body.data?.id}/approve`,
      {
        method: "PATCH",
        body: { allowInsufficientStock: true },
      },
    );
    const updatedProduct = await request<Product>(
      `/products/${product.body.data?.id}`,
    );

    assert.equal(blockedQuote.status, 422);
    assert.equal(blockedQuote.body.message, "Quantidade indisponivel para este orcamento.");
    assert.equal(quoted.status, 201);
    assert.equal(blockedApproval.status, 422);
    assert.equal(
      blockedApproval.body.message,
      "Estoque insuficiente para separar este pedido.",
    );
    assert.equal(approved.status, 200);
    assert.equal(approved.body.data?.status, "APPROVED");
    assert.equal(updatedProduct.body.data?.reservedStock, "2.000");
    assert.equal(updatedProduct.body.data?.availableStock, "-2.000");
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
    assert.equal(
      duplicated.body.message,
      "Ja existe um fabricante com esse nome.",
    );
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
    const debit = listed.body.data?.find(
      (paymentMethod) => paymentMethod.code === "DEBIT",
    );

    const deactivated = await request<PaymentMethod>(
      `/payment-methods/${debit?.id}/status`,
      {
        method: "PATCH",
        body: { active: false },
      },
    );
    const active = await request<PaymentMethod[]>(
      "/payment-methods?active=true",
    );

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
        stateRegistrationIndicator: "9",
        addressStreet: "Rua Fiscal",
        addressNumber: "123",
        addressDistrict: "Centro",
        addressCity: "Araguaina",
        addressState: "TO",
        addressZipCode: "77800000",
      },
    });
    const listed = await request<Client[]>("/clients?search=12345678900");
    const deactivated = await request<Client>(
      `/clients/${created.body.data?.id}/status`,
      {
        method: "PATCH",
        body: { active: false },
      },
    );
    const updated = await request<Client>(`/clients/${created.body.data?.id}`, {
      method: "PUT",
      body: {
        personType: "PJ",
        name: "Ana Filtros LTDA",
        document: "",
        email: "",
        phone: "8533330000",
        stateRegistration: "123456789",
        stateRegistrationIndicator: "1",
        addressStreet: "Avenida Atualizada",
        addressNumber: "456",
        addressComplement: "Sala 2",
        addressDistrict: "Vila Nova",
        addressCity: "Fortaleza",
        addressState: "CE",
        addressZipCode: "60000000",
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
    assert.equal(updated.body.data?.stateRegistration, "123456789");
    assert.equal(updated.body.data?.stateRegistrationIndicator, "1");
    assert.equal(updated.body.data?.addressCity, "Fortaleza");
    assert.equal(updated.body.data?.addressState, "CE");
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
    assert.ok(
      response.body.errors?.some((error) => error.field === "personType"),
    );
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
        cfop: "5102",
        icmsCst: "102",
        pisCst: "49",
        cofinsCst: "49",
        origin: "0",
        description: "Descricao comercial do filtro para orcamento",
      },
    });

    const listed = await request<Product[]>("/products?search=Wega");
    const shown = await request<Product>(`/products/${created.body.data?.id}`);
    const updated = await request<Product>(
      `/products/${created.body.data?.id}`,
      {
        method: "PUT",
        body: {
          name: "Filtro Wega FAP4040 Atualizado",
          salePrice: 31.9,
          location: "",
        },
      },
    );
    const deactivated = await request<Product>(
      `/products/${created.body.data?.id}/status`,
      {
        method: "PATCH",
        body: { active: false },
      },
    );

    assert.equal(created.status, 201);
    assert.equal(created.body.data?.brandId, brand.body.data?.id);
    assert.equal(created.body.data?.brandName, "Wega");
    assert.equal(created.body.data?.groupName, "Filtro de ar");
    assert.equal(created.body.data?.unit, "KIT");
    assert.equal(created.body.data?.location, "Corredor A - Prateleira 2");
    assert.equal(created.body.data?.currentStock, "0.000");
    assert.equal(created.body.data?.reservedStock, "0.000");
    assert.equal(created.body.data?.availableStock, "0.000");
    assert.equal(created.body.data?.ncm, "84212300");
    assert.equal(created.body.data?.cest, "0100100");
    assert.equal(created.body.data?.cfop, "5102");
    assert.equal(created.body.data?.icmsCst, "102");
    assert.equal(created.body.data?.pisCst, "49");
    assert.equal(created.body.data?.cofinsCst, "49");
    assert.equal(created.body.data?.origin, "0");
    assert.equal(
      created.body.data?.description,
      "Descricao comercial do filtro para orcamento",
    );
    assert.equal(listed.status, 200);
    assert.equal(listed.body.data?.length, 1);
    assert.equal(shown.status, 200);
    assert.equal(shown.body.data?.internalCode, "FAP4040");
    assert.equal(
      shown.body.data?.description,
      "Descricao comercial do filtro para orcamento",
    );
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
    assert.equal(
      duplicated.body.message,
      "Ja existe um produto com esse codigo de barras.",
    );
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
    const updatedProduct = await request<Product>(
      `/products/${product.body.data?.id}`,
    );
    const productSupplier = await db("product_suppliers")
      .where({
        product_id: product.body.data?.id,
        supplier_id: supplier.body.data?.id,
      })
      .first();

    assert.equal(created.status, 201);
    assert.equal(created.body.data?.productName, "Filtro para entrada");
    assert.equal(created.body.data?.supplierName, "Distribuidora de Filtros");
    assert.equal(created.body.data?.createdByUserName, "Administrador de teste");
    assert.equal(created.body.data?.quantity, "12.500");
    assert.equal(created.body.data?.unitCost, "14.90");
    assert.equal(created.body.data?.notes, "Recebimento inicial");
    assert.equal(listed.status, 200);
    assert.equal(listed.body.data?.length, 1);
    assert.equal(
      listed.body.data?.[0]?.createdByUserName,
      "Administrador de teste",
    );
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
    const unchangedProduct = await request<Product>(
      `/products/${product.body.data?.id}`,
    );
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
    const updatedProduct = await request<Product>(
      `/products/${product.body.data?.id}`,
    );

    assert.equal(created.status, 201);
    assert.equal(created.body.data?.productName, "Filtro para ajuste");
    assert.equal(created.body.data?.createdByUserName, "Administrador de teste");
    assert.equal(created.body.data?.quantity, "-3.000");
    assert.equal(created.body.data?.reason, "Item avariado no estoque");
    assert.equal(increased.status, 201);
    assert.equal(increased.body.data?.quantity, "2.000");
    assert.equal(listed.body.data?.length, 2);
    assert.equal(
      listed.body.data?.[0]?.createdByUserName,
      "Administrador de teste",
    );
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
    const entry = response.body.data?.find(
      (movement) => movement.type === "ENTRY",
    );
    const adjustment = response.body.data?.find(
      (movement) => movement.type === "ADJUSTMENT",
    );

    assert.equal(response.status, 200);
    assert.equal(response.body.data?.length, 2);
    assert.equal(entry?.productName, "Filtro com historico");
    assert.equal(entry?.supplierName, "Fornecedor do historico");
    assert.equal(entry?.createdByUserName, "Administrador de teste");
    assert.equal(entry?.quantity, "5.000");
    assert.equal(entry?.unitCost, "11.90");
    assert.equal(adjustment?.productName, "Filtro com historico");
    assert.equal(adjustment?.supplierName, null);
    assert.equal(adjustment?.createdByUserName, "Administrador de teste");
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
    const unchangedProduct = await request<Product>(
      `/products/${product.body.data?.id}`,
    );
    const adjustments = await request<StockAdjustment[]>("/stock-adjustments");

    assert.equal(response.status, 422);
    assert.equal(
      response.body.message,
      "Ajuste nao pode resultar em estoque negativo.",
    );
    assert.equal(unchangedProduct.body.data?.currentStock, "0.000");
    assert.equal(adjustments.body.data?.length, 0);
  });
});

function focusIssueRequest(): FiscalIssueRequest {
  return {
    reference: "SALEfocusprovidertest",
    documentType: "NFE",
    environment: "HOMOLOGATION",
    companyCnpj: "12345678000199",
    sale: {
      id: "salefocusprovidertest",
      clientPersonType: "PF",
      clientName: "Cliente Focus",
      clientDocument: "12345678901",
      clientEmail: null,
      clientPhone: null,
      clientStateRegistration: null,
      clientStateRegistrationIndicator: "9",
      clientAddressStreet: "Rua Fiscal",
      clientAddressNumber: "123",
      clientAddressComplement: null,
      clientAddressDistrict: "Centro",
      clientAddressCity: "Araguaina",
      clientAddressState: "TO",
      clientAddressZipCode: "77800000",
      paymentMethodName: "PIX",
      totalAmount: "35.00",
      items: [
        {
          productId: "productfocusprovidertest",
          productInternalCode: "FISCAL-1",
          productName: "Filtro Focus",
          productCfop: "5102",
          productIcmsCst: "102",
          productNcm: "84212300",
          productPisCst: "49",
          productCofinsCst: "49",
          productOrigin: "0",
          productUnit: "UN",
          quantity: "1.000",
          unitPrice: "35.00",
          totalAmount: "35.00",
          position: 1,
        },
      ],
    },
  };
}

function focusUnauthorizedFetch() {
  return (async () =>
    new Response(JSON.stringify({ mensagem: "Nao autorizado" }), {
      status: 401,
    })) as typeof fetch;
}

function focusBasicAuth(token: string) {
  return `Basic ${Buffer.from(`${token}:`).toString("base64")}`;
}

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

async function requestRaw(
  path: string,
  options: {
    method?: string;
    authenticated?: boolean;
  } = {},
) {
  const headers: Record<string, string> = {};

  if (options.authenticated !== false && authCookie) {
    headers.cookie = authCookie;
  }

  const response = await fetch(`${baseUrl}${path}`, {
    method: options.method ?? "GET",
    headers,
  });
  const body = Buffer.from(await response.arrayBuffer());

  return {
    status: response.status,
    body,
    contentType: response.headers.get("content-type"),
  };
}
