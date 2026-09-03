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
import { saleReceiptPdfHtml } from "../integrations/pdf/templates/sale-receipt-pdf-template.js";
import type { Sale as ModelSale } from "../models/sales/sales.model.js";

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

type Supplier = NamedEntity & {
  branchId: string | null;
  branchName: string | null;
  document: string | null;
  email: string | null;
  phone: string | null;
};

type Product = {
  id: string;
  name: string;
  internalCode: string | null;
  barcode: string | null;
  branchId: string | null;
  branchName: string | null;
  brandId: string | null;
  brandName: string | null;
  groupName: string | null;
  unit: string;
  location: string | null;
  costPrice: string;
  accessoryExpenses: string;
  otherExpenses: string;
  salePrice: string;
  profitMarginPercentage: string | null;
  minimumStock: string;
  currentStock: string;
  reservedStock: string;
  availableStock: string;
  replenishmentMonitorEnabled: boolean;
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

type ProductListPage = {
  items: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

type NcmOption = {
  code: string;
  label: string;
  productCount: number;
  sampleProducts: string[];
};

type CestOption = NcmOption;

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

type PurchaseInvoice = {
  id: string;
  supplierId: string | null;
  supplierName: string;
  supplierDocument: string | null;
  transporterName: string | null;
  transporterDocument: string | null;
  createdByUserName: string;
  accessKey: string;
  number: string | null;
  series: string | null;
  issueDate: string | null;
  totalAmount: string;
  status: "IMPORTED" | "POSTED" | "CANCELLED";
  installments: Array<{
    id: string;
    position: number;
    number: string | null;
    dueDate: string | null;
    value: string;
  }>;
  items: Array<{
    id: string;
    productId: string | null;
    productName: string | null;
    position: number;
    supplierProductCode: string | null;
    description: string;
    cest: string | null;
    ncm: string | null;
    cfop: string | null;
    unit: string | null;
    quantity: string;
    unitCost: string;
    totalAmount: string;
  }>;
};

type ParsedPurchaseInvoice = {
  accessKey: string;
  installments: Array<{
    dueDate: string | null;
    number: string | null;
    value: number;
  }>;
  issueDate: string | null;
  items: Array<{
    cest: string | null;
    cfop: string | null;
    description: string;
    ncm: string | null;
    position: number;
    quantity: number;
    supplierProductCode: string | null;
    totalAmount: number;
    unit: string | null;
    unitCost: number;
  }>;
  number: string | null;
  series: string | null;
  supplierDocument: string | null;
  supplierName: string;
  totalAmount: number;
  transporterDocument: string | null;
  transporterName: string | null;
  xmlContent: string;
};

type Sale = {
  id: string;
  saleNumber: number;
  productId: string;
  productName: string;
  quantity: string;
  unitPrice: string;
  subtotalAmount: string;
  discountAmount: string;
  totalAmount: string;
  billingIssueDate: string | null;
  billingDueDate: string | null;
  items: Array<{
    id: string;
    productId: string;
    productName: string;
    quantity: string;
    unitPrice: string;
    discountAmount: string;
    totalAmount: string;
    returnedQuantity: string;
    returnableQuantity: string;
    returns: Array<{
      id: string;
      quantity: string;
      reason: string;
      refundAmount: string;
      refundPaymentMethodId: string;
      refundPaymentMethodName: string;
      refundedAt: string;
      refundReference: string | null;
      createdByUserName: string;
      createdAt: string;
    }>;
    position: number;
  }>;
  clientName: string | null;
  paymentMethodCode: string;
  paymentMethodName: string;
  payments: Array<{
    id: string;
    paymentMethodId: string;
    paymentMethodCode: string;
    paymentMethodName: string;
    amount: string;
  }>;
  paymentInstallments: Array<{
    id: string;
    saleId: string;
    position: number;
    dueDate: string;
    amount: string;
  }>;
  createdByUserName: string;
  cancelledByUserName: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  status: "OPEN" | "COMPLETED" | "CANCELLED";
};

type ShippingOrder = {
  id: string;
  quoteId: string | null;
  branchId: string | null;
  branchName: string | null;
  clientName: string;
  clientPhone: string | null;
  productName: string;
  quantity: string;
  unitPrice: string;
  totalAmount: string;
  paymentMethodId: string | null;
  paymentMethodName: string | null;
  payments: Array<{
    id: string;
    quoteId: string;
    paymentMethodId: string;
    paymentMethodName: string;
    amount: string;
  }>;
  billingIssueDate: string | null;
  billingDueDate: string | null;
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
  branchId: string | null;
  branchName: string | null;
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
  quoteNumber: number;
  clientName: string;
  clientPhone: string | null;
  paymentMethodId: string | null;
  paymentMethodName: string | null;
  payments: Array<{
    id: string;
    quoteId: string;
    paymentMethodId: string;
    paymentMethodName: string;
    amount: string;
  }>;
  status: "DRAFT" | "CANCELLED";
  showBrand: boolean;
  subtotalAmount: string;
  discountPercentage: string;
  discountAmount: string;
  totalAmount: string;
  billingIssueDate: string | null;
  billingDueDate: string | null;
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
    discountPercentage: string;
    discountAmount: string;
    totalAmount: string;
    position: number;
  }>;
  paymentInstallments: Array<{
    id: string;
    quoteId: string;
    position: number;
    dueDate: string;
    amount: string;
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

type User = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: "ADMIN" | "EMPLOYEE";
  branchId: string | null;
  branchName: string | null;
  branches: Array<{ id: string; name: string }>;
  active: boolean;
  permissions: string[];
  lastLoginAt?: string | null;
  mustChangePassword: boolean;
};

type Branch = {
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

type CashRegisterSession = {
  id: string;
  branchId: string | null;
  branchName: string | null;
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

type SalesReport = {
  summary: {
    salesCount: number;
    itemsQuantity: string;
    grossAmount: string;
    discountAmount: string;
    costAmount: string;
    netAmount: string;
    grossProfitAmount: string;
    grossMarginPercentage: string;
  };
  byProduct: Array<{
    productId: string;
    productName: string;
    quantity: string;
    costAmount: string;
    totalAmount: string;
    grossProfitAmount: string;
    grossMarginPercentage: string;
  }>;
  byClient: Array<{
    clientId: string | null;
    clientName: string;
    salesCount: number;
    totalAmount: string;
  }>;
  byPaymentMethod: Array<{
    paymentMethodId: string;
    paymentMethodName: string;
    totalAmount: string;
  }>;
  abcProducts: Array<{
    productId: string;
    productName: string;
    totalAmount: string;
    revenueSharePercentage: string;
    cumulativeRevenuePercentage: string;
    abcClass: "A" | "B" | "C";
  }>;
};

type StockReport = {
  summary: {
    activeProductsCount: number;
    lowStockProductsCount: number;
    productsWithoutMovementCount: number;
    soldQuantity: string;
  };
  lowStockProducts: Array<{
    productId: string;
    productName: string;
    currentStock: string;
    reservedStock: string;
    availableStock: string;
    minimumStock: string;
  }>;
  productsWithoutMovement: Array<{
    productId: string;
    productName: string;
    currentStock: string;
    minimumStock: string;
  }>;
  turnoverProducts: Array<{
    productId: string;
    productName: string;
    soldQuantity: string;
    lastSaleAt: string | null;
  }>;
};

type InventoryReport = {
  summary: {
    productsCount: number;
    returnedProductsCount: number;
    totalCurrentStock: string;
    totalReservedStock: string;
    totalAvailableStock: string;
    totalCostAmount: string;
    totalSaleAmount: string;
    potentialProfitAmount: string;
    lowStockProductsCount: number;
    negativeStockProductsCount: number;
  };
  items: Array<{
    productId: string;
    productName: string;
    internalCode: string | null;
    barcode: string | null;
    brandName: string | null;
    groupName: string | null;
    unit: string;
    location: string | null;
    costPrice: string;
    salePrice: string;
    currentStock: string;
    reservedStock: string;
    availableStock: string;
    minimumStock: string;
    totalCostAmount: string;
    totalSaleAmount: string;
    stockStatus: "LOW" | "NEGATIVE" | "AVAILABLE" | "OUT_OF_STOCK";
    active: boolean;
  }>;
};

type PurchaseReport = {
  summary: {
    entriesCount: number;
    totalQuantity: string;
    totalAmount: string;
    manualAmount: string;
    xmlAmount: string;
  };
  bySource: Array<{
    source: "MANUAL" | "XML";
    entriesCount: number;
    totalQuantity: string;
    totalAmount: string;
  }>;
  bySupplier: Array<{
    supplierId: string;
    supplierName: string;
    entriesCount: number;
    totalAmount: string;
  }>;
  byProduct: Array<{
    productId: string;
    productName: string;
    quantity: string;
    totalAmount: string;
  }>;
};

type CashReport = {
  summary: {
    sessionsCount: number;
    openSessionsCount: number;
    closedSessionsCount: number;
    openingAmount: string;
    grossSalesAmount: string;
    refundAmount: string;
    netSalesAmount: string;
    supplyAmount: string;
    withdrawalAmount: string;
    expectedClosingAmount: string;
    closingAmount: string;
    closedDifferenceAmount: string;
  };
  byPaymentMethod: Array<{
    paymentMethodId: string;
    paymentMethodName: string;
    grossAmount: string;
    refundAmount: string;
    netAmount: string;
  }>;
  sessions: Array<{
    id: string;
    openedByUserName: string;
    closedByUserName: string | null;
    status: "OPEN" | "CLOSED";
    openedAt: string;
    closedAt: string | null;
    openingBalance: string;
    salesAmount: string;
    supplyAmount: string;
    withdrawalAmount: string;
    expectedClosingBalance: string;
    closingBalance: string | null;
    difference: string | null;
  }>;
};

type UserPerformanceReport = {
  summary: {
    usersCount: number;
    salesCount: number;
    grossAmount: string;
    refundAmount: string;
    netAmount: string;
    quotesCreatedCount: number;
    stockMovementsCount: number;
    fiscalDocumentsIssuedCount: number;
  };
  users: Array<{
    userId: string;
    userName: string;
    salesCount: number;
    cancelledSalesCount: number;
    openSalesCount: number;
    grossAmount: string;
    refundAmount: string;
    netAmount: string;
    quotesCreatedCount: number;
    stockMovementsCount: number;
    fiscalDocumentsIssuedCount: number;
  }>;
  sales: Array<{
    saleId: string;
    saleNumber: number;
    userId: string;
    userName: string;
    clientName: string;
    status: "OPEN" | "COMPLETED" | "CANCELLED";
    totalAmount: string;
    refundAmount: string;
    netAmount: string;
    createdAt: string;
  }>;
};

type FiscalDocument = {
  id: string;
  branchId: string | null;
  branchName: string | null;
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
  requestPayload: Record<string, unknown>;
  issuedByUserName: string;
  cancelledByUserName: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
};

type FiscalSettings = {
  id: string;
  branchId: string | null;
  branchName: string | null;
  provider: "MOCK" | "FOCUS";
  environment: "HOMOLOGATION" | "PRODUCTION";
  companyCnpj: string | null;
  allowProduction: boolean;
  defaultNatureOperation: string | null;
  defaultSaleCfop: string | null;
  defaultIcmsCst: string | null;
  defaultPisCst: string | null;
  defaultCofinsCst: string | null;
  createdAt: string;
  updatedAt: string;
};

type CommercialSettings = {
  id: string;
  branchId: string | null;
  branchName: string | null;
  defaultProfitMarginPercentage: string;
  defaultQuoteDueDays: number;
  defaultQuoteValidityDays: number;
  createdAt: string;
  updatedAt: string;
};

let server: Server;
let baseUrl: string;
let authCookie: string;
let defaultBranchId: string;

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
  await db.raw(
    "truncate table auth_events, commercial_settings, fiscal_settings, fiscal_documents, cash_register_sessions, purchase_invoices, product_suppliers, products, product_groups, suppliers, brands, clients cascade",
  );
  await db("auth_events").del();
  await db("users").del();
  await db("branches").del();

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

  const defaultBranch = await request<Branch>("/branches", {
    method: "POST",
    body: {
      name: "Matriz Teste",
      code: "MATRIZ_TESTE",
    },
  });

  assert.ok(defaultBranch.body.data?.id);
  defaultBranchId = defaultBranch.body.data.id;
});

beforeEach(async () => {
  env.fiscal.provider = "mock";

  await db.raw(
    "truncate table auth_events, commercial_settings, fiscal_settings, fiscal_documents, cash_register_sessions, purchase_invoices, product_suppliers, products, product_groups, suppliers, brands, clients cascade",
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

  it("lists inventory-based NCM options", async () => {
    const listed = await request<NcmOption[]>("/fiscal/ncm-options");
    const filtered = await request<NcmOption[]>(
      "/fiscal/ncm-options?search=separador",
    );

    assert.equal(listed.status, 200);
    assert.ok(listed.body.data?.some((option) => option.code === "84212300"));
    assert.equal(filtered.status, 200);
    assert.deepEqual(
      filtered.body.data?.map((option) => option.code),
      ["84212300"],
    );
  });

  it("lists branch product CEST options", async () => {
    await request<Product>("/products", {
      method: "POST",
      body: {
        name: "Jogo de vedacao CEST",
        internalCode: "CEST-001",
        salePrice: 50,
        cest: "0100100",
      },
    });
    await request<Product>("/products", {
      method: "POST",
      body: {
        name: "Anel de vedacao CEST",
        internalCode: "CEST-002",
        salePrice: 60,
        cest: "0100100",
      },
    });
    await request<Product>("/products", {
      method: "POST",
      body: {
        name: "Filtro sem busca CEST",
        internalCode: "CEST-003",
        salePrice: 70,
        cest: "2800100",
      },
    });

    const listed = await request<CestOption[]>("/fiscal/cest-options");
    const filtered = await request<CestOption[]>(
      "/fiscal/cest-options?search=vedacao",
    );

    assert.equal(listed.status, 200);
    assert.ok(
      listed.body.data?.some(
        (option) => option.code === "0100100" && option.productCount === 2,
      ),
    );
    assert.equal(filtered.status, 200);
    assert.deepEqual(
      filtered.body.data?.map((option) => option.code),
      ["0100100"],
    );
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
    const blockedAdminCreation = await request("/users", {
      method: "POST",
      body: {
        name: "Segundo usuario",
        email: "segundo@example.com",
        phone: "85911110000",
        role: "ADMIN",
        branchId: randomUUID(),
        password: "senha-segura-789",
      },
    });
    const branch = await request<Branch>("/branches", {
      method: "POST",
      body: {
        name: "Filial Norte",
        code: "NORTE",
      },
    });
    const employee = await request<User>("/users", {
      method: "POST",
      body: {
        name: "Funcionario filial",
        email: "funcionario@example.com",
        phone: "85922220000",
        branchId: branch.body.data?.id,
        permissions: ["VIEW_REPORTS"],
        password: "senha-segura-456",
      },
    });
    await request("/auth/logout", { method: "POST" });
    const employeeLogin = await request<User>("/auth/login", {
      method: "POST",
      authenticated: false,
      body: {
        email: "funcionario@example.com",
        password: "senha-segura-456",
      },
    });
    const changedEmployeePassword = await request<User>("/auth/password", {
      method: "POST",
      cookie: employeeLogin.cookie,
      body: {
        currentPassword: "senha-segura-456",
        newPassword: "senha-alterada-456",
      },
    });
    const employeeCreate = await request("/users", {
      method: "POST",
      cookie: changedEmployeePassword.cookie,
      headers: { "x-active-branch-id": branch.body.data?.id ?? "" },
      body: {
        name: "Criado por funcionario",
        email: "bloqueado@example.com",
        role: "EMPLOYEE",
        branchId: branch.body.data?.id,
        password: "senha-segura-321",
      },
    });
    const employeeBranches = await request("/branches", {
      cookie: changedEmployeePassword.cookie,
      headers: { "x-active-branch-id": branch.body.data?.id ?? "" },
    });
    const employeeUsers = await request("/users", {
      cookie: changedEmployeePassword.cookie,
      headers: { "x-active-branch-id": branch.body.data?.id ?? "" },
    });
    const employeeAuthEvents = await request("/auth-events", {
      cookie: changedEmployeePassword.cookie,
      headers: { "x-active-branch-id": branch.body.data?.id ?? "" },
    });
    const employeeReports = await request("/reports/sales", {
      cookie: changedEmployeePassword.cookie,
      headers: { "x-active-branch-id": branch.body.data?.id ?? "" },
    });
    const employeeCash = await request("/cash-register/open", {
      method: "POST",
      cookie: changedEmployeePassword.cookie,
      headers: { "x-active-branch-id": branch.body.data?.id ?? "" },
      body: {
        openingBalance: 0,
      },
    });
    await request("/auth/logout", { method: "POST" });
    await request("/auth/login", {
      method: "POST",
      authenticated: false,
      body: {
        email: "admin@example.com",
        password: "senha-segura-123",
      },
    });
    const updatedEmployee = await request<User>(
      `/users/${employee.body.data?.id}`,
      {
        method: "PUT",
        body: {
          name: "Funcionario atualizado",
          email: "funcionario@example.com",
          phone: "85933330000",
          branchId: branch.body.data?.id,
          permissions: ["MANAGE_CASH_REGISTER"],
          password: "nova-senha-segura-456",
        },
      },
    );
    const passwordResetEmployee = await request<User>(
      `/users/${employee.body.data?.id}/password-reset`,
      {
        method: "POST",
        body: {
          password: "senha-redefinida-456",
        },
      },
    );
    const deactivatedEmployee = await request<User>(
      `/users/${employee.body.data?.id}/status`,
      {
        method: "PATCH",
        body: {
          active: false,
        },
      },
    );
    const users = await request<User[]>("/users");
    const listedAuthEvents = await request("/auth-events");
    const filteredAuthEvents = await request<{
      items: Array<{ email: string; eventType: string }>;
      pagination: { total: number };
    }>("/auth-events?eventType=LOGIN_SUCCESS&email=funcionario");
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
    const deactivatedEmployeeLogin = await request<User>("/auth/login", {
      method: "POST",
      authenticated: false,
      body: {
        email: "funcionario@example.com",
        password: "nova-senha-segura-456",
      },
    });
    const storedAdministrator = await db("users")
      .where("email", "admin@example.com")
      .first();
    const authEvents = await db("auth_events")
      .whereIn("email", ["admin@example.com", "funcionario@example.com"])
      .select<Array<{ eventType: string; reason: string | null }>>([
        "event_type as eventType",
        "reason",
      ]);
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
    assert.equal(typeof loginBody.data?.lastLoginAt, "string");
    assert.notEqual(storedAdministrator?.password_hash, "senha-segura-123");
    assert.match(storedAdministrator?.password_hash ?? "", /^scrypt\$/);
    assert.equal(repeatedSetup.status, 403);
    assert.equal(blockedAdminCreation.status, 422);
    assert.equal(branch.status, 201);
    assert.equal(employee.status, 201);
    assert.equal(employee.body.data?.role, "EMPLOYEE");
    assert.equal(employee.body.data?.branchId, branch.body.data?.id);
    assert.equal(employee.body.data?.branchName, "Filial Norte");
    assert.deepEqual(employee.body.data?.permissions, ["VIEW_REPORTS"]);
    assert.equal(employee.body.data?.mustChangePassword, true);
    assert.equal(employeeLogin.status, 200);
    assert.equal(employeeLogin.body.data?.role, "EMPLOYEE");
    assert.equal(employeeLogin.body.data?.branchName, "Filial Norte");
    assert.equal(employeeLogin.body.data?.mustChangePassword, true);
    assert.equal(typeof employeeLogin.body.data?.lastLoginAt, "string");
    assert.equal(changedEmployeePassword.status, 200);
    assert.equal(changedEmployeePassword.body.data?.mustChangePassword, false);
    assert.equal(employeeCreate.status, 403);
    assert.equal(
      employeeCreate.body.message,
      "Acesso permitido apenas para administradores.",
    );
    assert.equal(employeeBranches.status, 403);
    assert.equal(employeeUsers.status, 403);
    assert.equal(employeeAuthEvents.status, 403);
    assert.equal(employeeReports.status, 200);
    assert.equal(employeeCash.status, 403);
    assert.equal(updatedEmployee.status, 200);
    assert.equal(updatedEmployee.body.data?.name, "Funcionario atualizado");
    assert.equal(updatedEmployee.body.data?.phone, "85933330000");
    assert.equal(updatedEmployee.body.data?.mustChangePassword, true);
    assert.deepEqual(updatedEmployee.body.data?.permissions, [
      "MANAGE_CASH_REGISTER",
    ]);
    assert.equal(passwordResetEmployee.status, 200);
    assert.equal(passwordResetEmployee.body.data?.mustChangePassword, true);
    assert.equal(deactivatedEmployee.status, 200);
    assert.equal(deactivatedEmployee.body.data?.active, false);
    assert.equal(users.status, 200);
    assert.equal(listedAuthEvents.status, 200);
    assert.equal(filteredAuthEvents.status, 200);
    assert.ok(
      Array.isArray(
        (
          listedAuthEvents.body.data as {
            items?: unknown[];
          }
        )?.items,
      ),
    );
    assert.ok((filteredAuthEvents.body.data?.pagination.total ?? 0) >= 1);
    assert.ok(
      filteredAuthEvents.body.data?.items.every(
        (event) =>
          event.email === "funcionario@example.com" &&
          event.eventType === "LOGIN_SUCCESS",
      ),
    );
    assert.equal(users.body.data?.length, 2);
    assert.ok(
      users.body.data?.some(
        (user) =>
          user.email === "funcionario@example.com" &&
          typeof user.lastLoginAt === "string",
      ),
    );
    assert.deepEqual(
      users.body.data?.map((user) => user.email),
      ["admin@example.com", "funcionario@example.com"],
    );
    assert.equal(unauthenticatedCreate.status, 401);
    assert.equal(logout.status, 200);
    assert.equal(logout.cookie, "auth_token=");
    assert.equal(deactivatedEmployeeLogin.status, 401);
    assert.ok(
      authEvents.some(
        (event) =>
          event.eventType === "LOGIN_FAILURE" &&
          event.reason === "INVALID_PASSWORD",
      ),
    );
    assert.ok(
      authEvents.some((event) => event.eventType === "LOGIN_SUCCESS"),
    );
    assert.ok(authEvents.some((event) => event.eventType === "LOGOUT"));
    assert.ok(
      authEvents.some((event) => event.eventType === "PASSWORD_CHANGED"),
    );
    assert.ok(
      authEvents.some((event) => event.eventType === "PASSWORD_RESET"),
    );
    assert.ok(
      authEvents.some((event) => event.eventType === "EMPLOYEE_CREATED"),
    );
    assert.ok(
      authEvents.some((event) => event.eventType === "EMPLOYEE_UPDATED"),
    );
    assert.ok(
      authEvents.some(
        (event) => event.eventType === "EMPLOYEE_STATUS_CHANGED",
      ),
    );
  });

  it("allows employees to operate multiple assigned branches", async () => {
    const norte = await request<Branch>("/branches", {
      method: "POST",
      body: {
        name: "Filial Usuario Norte",
        code: "USER-NORTE",
      },
    });
    const sul = await request<Branch>("/branches", {
      method: "POST",
      body: {
        name: "Filial Usuario Sul",
        code: "USER-SUL",
      },
    });
    const bloqueada = await request<Branch>("/branches", {
      method: "POST",
      body: {
        name: "Filial Usuario Bloqueada",
        code: "USER-BLOCK",
      },
    });
    const employee = await request<User>("/users", {
      method: "POST",
      body: {
        name: "Funcionario multifilial",
        email: "multifilial@example.com",
        branchId: norte.body.data?.id,
        branchIds: [sul.body.data?.id],
        permissions: [],
        password: "senha-segura-456",
      },
    });

    const login = await request<User>("/auth/login", {
      method: "POST",
      authenticated: false,
      body: {
        email: "multifilial@example.com",
        password: "senha-segura-456",
      },
    });

    const productNorte = await request<Product>("/products", {
      method: "POST",
      headers: { "x-active-branch-id": norte.body.data?.id ?? "" },
      body: {
        name: "Produto multifilial norte",
        salePrice: 10,
      },
    });
    const productSul = await request<Product>("/products", {
      method: "POST",
      headers: { "x-active-branch-id": sul.body.data?.id ?? "" },
      body: {
        name: "Produto multifilial sul",
        salePrice: 20,
      },
    });

    const defaultBranchProducts = await request<ProductListPage>(
      "/products?includeMeta=true&page=1&limit=10",
      {
        cookie: login.cookie,
        headers: { "x-active-branch-id": "" },
      },
    );
    const allowedBranchProducts = await request<ProductListPage>(
      "/products?includeMeta=true&page=1&limit=10",
      {
        cookie: login.cookie,
        headers: { "x-active-branch-id": sul.body.data?.id ?? "" },
      },
    );
    const blockedBranchProducts = await request<ProductListPage>(
      "/products?includeMeta=true&page=1&limit=10",
      {
        cookie: login.cookie,
        headers: { "x-active-branch-id": bloqueada.body.data?.id ?? "" },
      },
    );

    assert.equal(employee.status, 201);
    assert.deepEqual(
      employee.body.data?.branches.map((branch) => branch.name),
      ["Filial Usuario Norte", "Filial Usuario Sul"],
    );
    assert.equal(login.status, 200);
    assert.deepEqual(
      login.body.data?.branches.map((branch) => branch.name),
      ["Filial Usuario Norte", "Filial Usuario Sul"],
    );
    assert.equal(defaultBranchProducts.status, 200);
    assert.deepEqual(
      defaultBranchProducts.body.data?.items.map((product) => product.id),
      [productNorte.body.data?.id],
    );
    assert.equal(allowedBranchProducts.status, 200);
    assert.deepEqual(
      allowedBranchProducts.body.data?.items.map((product) => product.id),
      [productSul.body.data?.id],
    );
    assert.equal(blockedBranchProducts.status, 403);
    assert.equal(
      blockedBranchProducts.body.message,
      "Usuario sem acesso a filial selecionada.",
    );
  });

  it("limits repeated invalid login attempts without blocking a valid password", async () => {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const invalidLogin = await request("/auth/login", {
        method: "POST",
        authenticated: false,
        body: {
          email: "admin@example.com",
          password: `senha-incorreta-${attempt}`,
        },
      });

      assert.equal(invalidLogin.status, 401);
      assert.equal(invalidLogin.body.message, "Email ou senha invalidos.");
    }

    const blockedInvalidLogin = await request("/auth/login", {
      method: "POST",
      authenticated: false,
      body: {
        email: "admin@example.com",
        password: "senha-incorreta-final",
      },
    });
    const validLogin = await request<User>("/auth/login", {
      method: "POST",
      authenticated: false,
      body: {
        email: "admin@example.com",
        password: "senha-segura-123",
      },
    });

    assert.equal(blockedInvalidLogin.status, 429);
    assert.equal(
      blockedInvalidLogin.body.message,
      "Muitas tentativas de autenticacao. Tente novamente mais tarde.",
    );
    assert.equal(validLogin.status, 200);
    assert.equal(validLogin.body.data?.email, "admin@example.com");
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
        defaultNatureOperation: "Venda de mercadoria",
        defaultSaleCfop: "5405",
        defaultIcmsCst: "500",
        defaultPisCst: "49",
        defaultCofinsCst: "49",
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
    assert.equal(current.body.data?.branchId, defaultBranchId);
    assert.equal(current.body.data?.branchName, "Matriz Teste");
    assert.equal(current.body.data?.provider, "MOCK");
    assert.equal(current.body.data?.environment, "HOMOLOGATION");
    assert.equal(current.body.data?.allowProduction, false);
    assert.equal(updated.status, 200);
    assert.equal(updated.body.data?.provider, "FOCUS");
    assert.equal(updated.body.data?.environment, "HOMOLOGATION");
    assert.equal(updated.body.data?.companyCnpj, "12345678000190");
    assert.equal(updated.body.data?.allowProduction, false);
    assert.equal(updated.body.data?.defaultNatureOperation, "Venda de mercadoria");
    assert.equal(updated.body.data?.defaultSaleCfop, "5405");
    assert.equal(updated.body.data?.defaultIcmsCst, "500");
    assert.equal(updated.body.data?.defaultPisCst, "49");
    assert.equal(updated.body.data?.defaultCofinsCst, "49");
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

  it("keeps fiscal settings scoped to the active branch", async () => {
    const branch = await request<Branch>("/branches", {
      method: "POST",
      body: {
        name: "Filial Fiscal Isolada",
        code: "FISCAL",
      },
    });
    assert.ok(branch.body.data?.id);

    const defaultUpdated = await request<FiscalSettings>("/fiscal-settings", {
      method: "PUT",
      body: {
        provider: "FOCUS",
        environment: "HOMOLOGATION",
        companyCnpj: "12.345.678/0001-90",
        allowProduction: false,
      },
    });
    const isolatedCurrent = await request<FiscalSettings>("/fiscal-settings", {
      headers: { "x-active-branch-id": branch.body.data.id },
    });
    const isolatedUpdated = await request<FiscalSettings>("/fiscal-settings", {
      method: "PUT",
      headers: { "x-active-branch-id": branch.body.data.id },
      body: {
        provider: "MOCK",
        environment: "HOMOLOGATION",
        companyCnpj: null,
        allowProduction: false,
      },
    });
    const defaultCurrent = await request<FiscalSettings>("/fiscal-settings");

    assert.equal(defaultUpdated.status, 200);
    assert.equal(defaultUpdated.body.data?.branchId, defaultBranchId);
    assert.equal(isolatedCurrent.status, 200);
    assert.equal(isolatedCurrent.body.data?.branchId, branch.body.data.id);
    assert.equal(isolatedCurrent.body.data?.provider, "MOCK");
    assert.notEqual(isolatedCurrent.body.data?.companyCnpj, "12345678000190");
    assert.equal(isolatedUpdated.status, 200);
    assert.equal(isolatedUpdated.body.data?.branchName, "Filial Fiscal Isolada");
    assert.equal(defaultCurrent.body.data?.companyCnpj, "12345678000190");
  });

  it("uses the branch company document as fiscal CNPJ", async () => {
    const branch = await request<Branch>("/branches", {
      method: "POST",
      body: {
        name: "Filial Fiscal CNPJ Proprio",
        code: "FISCAL_CNPJ",
        legalName: "Filial Fiscal CNPJ Proprio LTDA",
        tradeName: "Filial Fiscal",
        document: "98.765.432/0001-10",
        stateRegistration: "123456789",
        addressStreet: "Rua da Filial",
        addressNumber: "10",
        addressDistrict: "Centro",
        addressCity: "Sao Luis",
        addressState: "MA",
        addressZipCode: "65000000",
      },
    });
    assert.ok(branch.body.data?.id);

    const current = await request<FiscalSettings>("/fiscal-settings", {
      headers: { "x-active-branch-id": branch.body.data.id },
    });
    const invalidBranch = await request(`/branches/${branch.body.data.id}`, {
      method: "PUT",
      body: {
        name: "Filial Fiscal CNPJ Proprio",
        code: "FISCAL_CNPJ",
        document: "123",
      },
    });
    const updatedBranch = await request<Branch>(
      `/branches/${branch.body.data.id}`,
      {
        method: "PUT",
        body: {
          name: "Filial Fiscal CNPJ Proprio",
          code: "FISCAL_CNPJ",
          legalName: "Filial Fiscal CNPJ Proprio LTDA",
          tradeName: "Filial Fiscal",
          document: "98.765.432/0002-00",
          stateRegistration: "987654321",
          addressStreet: "Rua da Filial",
          addressNumber: "20",
          addressDistrict: "Centro",
          addressCity: "Sao Luis",
          addressState: "MA",
          addressZipCode: "65000000",
        },
      },
    );
    const updatedCurrent = await request<FiscalSettings>("/fiscal-settings", {
      headers: { "x-active-branch-id": branch.body.data.id },
    });

    assert.equal(branch.status, 201);
    assert.equal(branch.body.data?.document, "98.765.432/0001-10");
    assert.equal(current.status, 200);
    assert.equal(current.body.data?.companyCnpj, "98765432000110");
    assert.equal(invalidBranch.status, 422);
    assert.equal(
      invalidBranch.body.message,
      "CNPJ da filial deve ter 14 digitos.",
    );
    assert.equal(updatedBranch.status, 200);
    assert.equal(updatedBranch.body.data?.document, "98.765.432/0002-00");
    assert.equal(updatedCurrent.status, 200);
    assert.equal(updatedCurrent.body.data?.companyCnpj, "98765432000200");
  });

  it("shows and updates commercial settings", async () => {
    const current = await request<CommercialSettings>("/commercial-settings");
    const invalid = await request("/commercial-settings", {
      method: "PUT",
      body: { defaultProfitMarginPercentage: 1001 },
    });
    const updated = await request<CommercialSettings>("/commercial-settings", {
      method: "PUT",
      body: {
        defaultProfitMarginPercentage: 50,
        defaultQuoteDueDays: 28,
        defaultQuoteValidityDays: 14,
      },
    });
    const listedAfterUpdate =
      await request<CommercialSettings>("/commercial-settings");

    assert.equal(current.status, 200);
    assert.equal(current.body.data?.branchId, defaultBranchId);
    assert.equal(current.body.data?.branchName, "Matriz Teste");
    assert.equal(current.body.data?.defaultProfitMarginPercentage, "0.00");
    assert.equal(current.body.data?.defaultQuoteDueDays, 0);
    assert.equal(current.body.data?.defaultQuoteValidityDays, 7);
    assert.equal(invalid.status, 422);
    assert.equal(updated.status, 200);
    assert.equal(updated.body.data?.defaultProfitMarginPercentage, "50.00");
    assert.equal(updated.body.data?.defaultQuoteDueDays, 28);
    assert.equal(updated.body.data?.defaultQuoteValidityDays, 14);
    assert.equal(listedAfterUpdate.body.data?.id, updated.body.data?.id);
    assert.equal(
      listedAfterUpdate.body.data?.defaultProfitMarginPercentage,
      "50.00",
    );
    assert.equal(listedAfterUpdate.body.data?.defaultQuoteDueDays, 28);
    assert.equal(listedAfterUpdate.body.data?.defaultQuoteValidityDays, 14);
  });

  it("keeps commercial settings scoped to the active branch", async () => {
    const branch = await request<Branch>("/branches", {
      method: "POST",
      body: {
        name: "Filial Comercial Isolada",
        code: "COMERCIAL",
      },
    });
    assert.ok(branch.body.data?.id);

    const defaultUpdated = await request<CommercialSettings>(
      "/commercial-settings",
      {
        method: "PUT",
        body: {
          defaultProfitMarginPercentage: 50,
          defaultQuoteDueDays: 21,
          defaultQuoteValidityDays: 10,
        },
      },
    );
    const isolatedCurrent = await request<CommercialSettings>(
      "/commercial-settings",
      {
        headers: { "x-active-branch-id": branch.body.data.id },
      },
    );
    const isolatedUpdated = await request<CommercialSettings>(
      "/commercial-settings",
      {
        method: "PUT",
        headers: { "x-active-branch-id": branch.body.data.id },
        body: {
          defaultProfitMarginPercentage: 35,
          defaultQuoteDueDays: 7,
          defaultQuoteValidityDays: 3,
        },
      },
    );
    const defaultCurrent =
      await request<CommercialSettings>("/commercial-settings");

    assert.equal(defaultUpdated.status, 200);
    assert.equal(defaultUpdated.body.data?.branchId, defaultBranchId);
    assert.equal(isolatedCurrent.status, 200);
    assert.equal(isolatedCurrent.body.data?.branchId, branch.body.data.id);
    assert.equal(
      isolatedCurrent.body.data?.defaultProfitMarginPercentage,
      "0.00",
    );
    assert.equal(isolatedCurrent.body.data?.defaultQuoteDueDays, 0);
    assert.equal(isolatedCurrent.body.data?.defaultQuoteValidityDays, 7);
    assert.equal(isolatedUpdated.status, 200);
    assert.equal(
      isolatedUpdated.body.data?.defaultProfitMarginPercentage,
      "35.00",
    );
    assert.equal(isolatedUpdated.body.data?.defaultQuoteDueDays, 7);
    assert.equal(isolatedUpdated.body.data?.defaultQuoteValidityDays, 3);
    assert.equal(
      defaultCurrent.body.data?.defaultProfitMarginPercentage,
      "50.00",
    );
    assert.equal(defaultCurrent.body.data?.defaultQuoteDueDays, 21);
    assert.equal(defaultCurrent.body.data?.defaultQuoteValidityDays, 10);
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
    assert.equal(
      duplicate.body.message,
      "Ja existe um caixa aberto para esta filial.",
    );
  });

  it("keeps current cash register scoped to the active branch", async () => {
    const branch = await request<Branch>("/branches", {
      method: "POST",
      body: {
        name: "Filial Caixa Isolado",
        code: "CAIXA_ISOLADO",
      },
    });

    assert.ok(branch.body.data?.id);

    const defaultOpened = await request<CashRegisterSession>(
      "/cash-register/open",
      {
        method: "POST",
        body: { openingBalance: 100 },
      },
    );
    const isolatedCurrentBeforeOpen = await request<CashRegisterSession | null>(
      "/cash-register/current",
      {
        headers: { "x-active-branch-id": branch.body.data.id },
      },
    );
    const isolatedOpened = await request<CashRegisterSession>(
      "/cash-register/open",
      {
        method: "POST",
        headers: { "x-active-branch-id": branch.body.data.id },
        body: { openingBalance: 200 },
      },
    );
    const defaultCurrent = await request<CashRegisterSession>(
      "/cash-register/current",
    );
    const isolatedCurrent = await request<CashRegisterSession>(
      "/cash-register/current",
      {
        headers: { "x-active-branch-id": branch.body.data.id },
      },
    );

    assert.equal(defaultOpened.status, 201);
    assert.equal(defaultOpened.body.data?.branchName, "Matriz Teste");
    assert.equal(isolatedCurrentBeforeOpen.status, 200);
    assert.equal(isolatedCurrentBeforeOpen.body.data, null);
    assert.equal(isolatedOpened.status, 201);
    assert.equal(isolatedOpened.body.data?.branchName, "Filial Caixa Isolado");
    assert.equal(defaultCurrent.body.data?.id, defaultOpened.body.data?.id);
    assert.equal(isolatedCurrent.body.data?.id, isolatedOpened.body.data?.id);
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
    const invalidBillingDates = await request("/sales", {
      method: "POST",
      body: {
        productId: product.body.data?.id,
        paymentMethodId: pix?.id,
        quantity: 1,
        billingIssueDate: "2026-07-10",
        billingDueDate: "2026-07-09",
      },
    });
    const created = await request<Sale>("/sales", {
      method: "POST",
      body: {
        productId: product.body.data?.id,
        paymentMethodId: pix?.id,
        quantity: 2,
        discountAmount: 15,
        billingIssueDate: "2026-07-10",
        billingDueDate: "2026-07-20",
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
    assert.equal(invalidBillingDates.status, 422);
    assert.equal(
      invalidBillingDates.body.errors?.[0]?.message,
      "Vencimento nao pode ser anterior a data da fatura.",
    );
    assert.equal(created.status, 201);
    assert.equal(created.body.data?.saleNumber, 1);
    assert.equal(created.body.data?.subtotalAmount, "80.00");
    assert.equal(created.body.data?.discountAmount, "15.00");
    assert.equal(created.body.data?.totalAmount, "65.00");
    assert.equal(created.body.data?.paymentMethodCode, "PIX");
    assert.equal(created.body.data?.billingIssueDate, null);
    assert.equal(created.body.data?.billingDueDate, null);
    assert.equal(created.body.data?.paymentInstallments.length, 0);
    assert.equal(cash.body.data?.salesTotal, "65.00");
    assert.equal(cash.body.data?.paymentSummary[0]?.amount, "65.00");
  });

  it("records a counter sale with multiple payment methods", async () => {
    const product = await request<Product>("/products", {
      method: "POST",
      body: { name: "Filtro com pagamento dividido", salePrice: 100 },
    });
    const paymentMethods = await request<PaymentMethod[]>(
      "/payment-methods?active=true",
    );
    const pix = paymentMethods.body.data?.find(
      (paymentMethod) => paymentMethod.code === "PIX",
    );
    const credit = paymentMethods.body.data?.find(
      (paymentMethod) => paymentMethod.code === "CREDIT",
    );

    await request("/stock-adjustments", {
      method: "POST",
      body: {
        productId: product.body.data?.id,
        quantity: 2,
        reason: "Saldo inicial para venda dividida",
      },
    });
    await request("/cash-register/open", {
      method: "POST",
      body: { openingBalance: 0 },
    });

    const invalidTotal = await request("/sales", {
      method: "POST",
      body: {
        items: [{ productId: product.body.data?.id, quantity: 1 }],
        payments: [
          { paymentMethodId: pix?.id, amount: 40 },
          { paymentMethodId: credit?.id, amount: 50 },
        ],
      },
    });
    const created = await request<Sale>("/sales", {
      method: "POST",
      body: {
        items: [{ productId: product.body.data?.id, quantity: 1 }],
        payments: [
          { paymentMethodId: pix?.id, amount: 40 },
          { paymentMethodId: credit?.id, amount: 60 },
        ],
      },
    });
    const cash = await request<CashRegisterSession | null>(
      "/cash-register/current",
    );

    assert.equal(invalidTotal.status, 422);
    assert.equal(
      invalidTotal.body.message,
      "Total dos pagamentos deve ser igual ao total da venda.",
    );
    assert.equal(created.status, 201);
    assert.equal(created.body.data?.paymentMethodCode, "MULTIPLE");
    assert.equal(created.body.data?.payments.length, 2);
    assert.deepEqual(
      created.body.data?.payments
        .map((payment) => payment.amount)
        .sort(),
      ["40.00", "60.00"],
    );
    assert.equal(cash.body.data?.salesTotal, "100.00");
    assert.deepEqual(
      cash.body.data?.paymentSummary
        .map((payment) => payment.amount)
        .sort(),
      ["40.00", "60.00"],
    );
  });

  it("updates completed sale commercial payment details before fiscal issue", async () => {
    const product = await request<Product>("/products", {
      method: "POST",
      body: { name: "Filtro venda com datas editaveis", salePrice: 120 },
    });
    const paymentMethod = await activePaymentMethod();
    const boleto = await activePaymentMethod("BOLETO");

    await request("/stock-adjustments", {
      method: "POST",
      body: {
        productId: product.body.data?.id,
        quantity: 2,
        reason: "Saldo inicial para venda com datas editaveis",
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
        paymentMethodId: paymentMethod.id,
        quantity: 1,
        billingIssueDate: "2026-08-10",
        billingDueDate: "2026-08-20",
      },
    });
    const invalidDates = await request(
      `/sales/${sale.body.data?.id}/commercial-details`,
      {
        method: "PATCH",
        body: {
          billingIssueDate: "2026-08-20",
          billingDueDate: "2026-08-10",
        },
      },
    );
    const updated = await request<Sale>(
      `/sales/${sale.body.data?.id}/commercial-details`,
      {
        method: "PATCH",
        body: {
          billingIssueDate: "2026-08-11",
          billingDueDate: "2026-08-25",
          payments: [
            {
              paymentMethodId: boleto.id,
              amount: 120,
            },
          ],
        },
      },
    );
    const updatedBackToPix = await request<Sale>(
      `/sales/${sale.body.data?.id}/commercial-details`,
      {
        method: "PATCH",
        body: {
          billingIssueDate: "2026-09-01",
          billingDueDate: "2026-10-01",
          payments: [
            {
              paymentMethodId: paymentMethod.id,
              amount: 120,
            },
          ],
        },
      },
    );

    assert.equal(sale.status, 201);
    assert.equal(sale.body.data?.paymentMethodCode, "PIX");
    assert.equal(sale.body.data?.billingIssueDate, null);
    assert.equal(sale.body.data?.billingDueDate, null);
    assert.equal(sale.body.data?.paymentInstallments.length, 0);
    assert.equal(invalidDates.status, 422);
    assert.equal(
      invalidDates.body.errors?.[0]?.message,
      "Vencimento nao pode ser anterior a data da fatura.",
    );
    assert.equal(updated.status, 200);
    assert.ok(updated.body.data?.billingIssueDate?.startsWith("2026-08-11"));
    assert.ok(updated.body.data?.billingDueDate?.startsWith("2026-08-25"));
    assert.equal(updated.body.data?.paymentMethodCode, "BOLETO");
    assert.equal(updated.body.data?.payments[0]?.paymentMethodId, boleto.id);
    assert.equal(updated.body.data?.payments[0]?.amount, "120.00");
    assert.ok(
      updated.body.data?.paymentInstallments[0]?.dueDate.startsWith(
        "2026-08-25",
      ),
    );
    assert.equal(updated.body.data?.paymentInstallments[0]?.amount, "120.00");
    assert.equal(updatedBackToPix.status, 200);
    assert.equal(updatedBackToPix.body.data?.paymentMethodCode, "PIX");
    assert.equal(updatedBackToPix.body.data?.billingIssueDate, null);
    assert.equal(updatedBackToPix.body.data?.billingDueDate, null);
    assert.equal(updatedBackToPix.body.data?.paymentInstallments.length, 0);
  });

  it("reopens and completes a sale before fiscal issue", async () => {
    const product = await request<Product>("/products", {
      method: "POST",
      body: {
        name: "Filtro venda reaberta",
        salePrice: 150,
        ncm: "84212300",
        cfop: "5102",
        origin: "0",
      },
    });
    const removedProduct = await request<Product>("/products", {
      method: "POST",
      body: {
        name: "Filtro removido da venda reaberta",
        salePrice: 80,
      },
    });
    const client = await request<Client>("/clients", {
      method: "POST",
      body: {
        personType: "PF",
        name: "Cliente venda reaberta",
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
    const paymentMethod = await activePaymentMethod("BOLETO");

    await request("/stock-adjustments", {
      method: "POST",
      body: {
        productId: product.body.data?.id,
        quantity: 2,
        reason: "Saldo inicial para venda reaberta",
      },
    });
    await request("/stock-adjustments", {
      method: "POST",
      body: {
        productId: removedProduct.body.data?.id,
        quantity: 2,
        reason: "Saldo inicial para remover item da venda reaberta",
      },
    });
    await request("/cash-register/open", {
      method: "POST",
      body: { openingBalance: 0 },
    });

    const sale = await request<Sale>("/sales", {
      method: "POST",
      body: {
        clientId: client.body.data?.id,
        items: [
          { productId: product.body.data?.id, quantity: 1 },
          { productId: removedProduct.body.data?.id, quantity: 1 },
        ],
        payments: [{ paymentMethodId: paymentMethod.id, amount: 230 }],
      },
    });
    const reopened = await request<Sale>(`/sales/${sale.body.data?.id}/reopen`, {
      method: "PATCH",
    });
    const fiscalWhileOpen = await request(
      `/sales/${sale.body.data?.id}/fiscal-documents/preview`,
      {
        method: "POST",
        body: { documentType: "NFE" },
      },
    );
    const updated = await request<Sale>(
      `/sales/${sale.body.data?.id}`,
      {
        method: "PUT",
        body: {
          clientId: client.body.data?.id,
          items: [{ productId: product.body.data?.id, quantity: 1 }],
          payments: [{ paymentMethodId: paymentMethod.id, amount: 150 }],
          billingIssueDate: "2026-08-11",
          billingDueDate: "2026-08-25",
        },
      },
    );
    const keptProduct = await request<Product>(`/products/${product.body.data?.id}`);
    const productRemovedFromSale = await request<Product>(
      `/products/${removedProduct.body.data?.id}`,
    );
    const completed = await request<Sale>(
      `/sales/${sale.body.data?.id}/complete`,
      {
        method: "PATCH",
      },
    );

    assert.equal(reopened.status, 200);
    assert.equal(reopened.body.data?.status, "OPEN");
    assert.equal(fiscalWhileOpen.status, 422);
    assert.equal(
      fiscalWhileOpen.body.message,
      "Conclua a venda antes de gerar previa de NF-e.",
    );
    assert.equal(updated.status, 200);
    assert.equal(updated.body.data?.status, "OPEN");
    assert.equal(updated.body.data?.items.length, 1);
    assert.equal(updated.body.data?.totalAmount, "150.00");
    assert.ok(updated.body.data?.billingDueDate?.startsWith("2026-08-25"));
    assert.equal(keptProduct.body.data?.currentStock, "1.000");
    assert.equal(productRemovedFromSale.body.data?.currentStock, "2.000");
    assert.equal(completed.status, 200);
    assert.equal(completed.body.data?.status, "COMPLETED");
  });

  it("blocks completed sale commercial date updates when fiscal document is active", async () => {
    const product = await request<Product>("/products", {
      method: "POST",
      body: { name: "Filtro venda com fiscal ativo", salePrice: 90 },
    });
    const client = await request<Client>("/clients", {
      method: "POST",
      body: {
        personType: "PF",
        name: "Cliente fiscal bloqueio",
        document: "12345678901",
      },
    });
    const paymentMethod = await activePaymentMethod();

    await request("/stock-adjustments", {
      method: "POST",
      body: {
        productId: product.body.data?.id,
        quantity: 2,
        reason: "Saldo inicial para venda bloqueada por fiscal",
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
        paymentMethodId: paymentMethod.id,
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
    const blocked = await request(
      `/sales/${sale.body.data?.id}/commercial-details`,
      {
        method: "PATCH",
        body: {
          billingIssueDate: "2026-08-11",
          billingDueDate: "2026-08-25",
        },
      },
    );

    assert.equal(issued.status, 201);
    assert.equal(blocked.status, 409);
    assert.equal(
      blocked.body.message,
      "Cancele a NF-e antes de editar os dados comerciais desta venda.",
    );
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
    const receipt = await requestRaw(
      `/sales/${created.body.data?.id}/receipt`,
    );
    const cancelled = await request<Sale>(
      `/sales/${created.body.data?.id}/cancel`,
      {
        method: "PATCH",
        body: { reason: "Cliente desistiu da compra de balcao" },
      },
    );
    const cancelledReceipt = await requestRaw(
      `/sales/${created.body.data?.id}/receipt`,
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
    assert.equal(receipt.status, 200);
    assert.equal(receipt.contentType, "application/pdf");
    assert.equal(receipt.body.subarray(0, 4).toString(), "%PDF");
    assert.equal(cancelled.status, 200);
    assert.equal(cancelled.body.data?.status, "CANCELLED");
    assert.equal(cancelledReceipt.status, 409);
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
    const cashAfterReturn = await request<CashRegisterSession | null>(
      "/cash-register/current",
    );
    const movements = await request<StockMovement[]>("/stock-movements");
    const returnMovement = movements.body.data?.find(
      (movement) => movement.type === "SALE_RETURN",
    );
    const returnRecord = await db("sale_item_returns")
      .where("sale_id", created.body.data?.id)
      .first();
    const listedAfterReturn = await request<Sale[]>("/sales");
    const listedReturnedSale = listedAfterReturn.body.data?.find(
      (sale) => sale.id === created.body.data?.id,
    );
    const listedReturn = listedReturnedSale?.items[0]?.returns[0];

    assert.equal(returned.status, 200);
    assert.equal(returned.body.data?.status, "COMPLETED");
    assert.equal(returned.body.data?.items[0]?.returnedQuantity, "1.000");
    assert.equal(returned.body.data?.items[0]?.returnableQuantity, "2.000");
    assert.equal(excessiveReturn.status, 422);
    assert.equal(
      excessiveReturn.body.message,
      "Quantidade de devolucao maior que quantidade disponivel do item.",
    );
    assert.equal(updatedProduct.body.data?.currentStock, "3.000");
    assert.equal(cashAfterReturn.body.data?.salesTotal, "100.00");
    assert.equal(cashAfterReturn.body.data?.expectedClosingBalance, "100.00");
    assert.equal(cashAfterReturn.body.data?.paymentSummary[0]?.amount, "100.00");
    assert.equal(returnRecord?.refund_amount, "50.00");
    assert.equal(returnRecord?.refund_payment_method_id, pix?.id);
    assert.ok(returnRecord?.refunded_at);
    assert.equal(listedReturn?.refundAmount, "50.00");
    assert.equal(listedReturn?.refundPaymentMethodName, "PIX");
    assert.equal(listedReturn?.reason, "Cliente devolveu uma unidade");
    assert.equal(returnMovement?.quantity, "1.000");
    assert.equal(returnMovement?.notes, "Cliente devolveu uma unidade");
    assert.equal(returnMovement?.createdByUserName, "Administrador de teste");
  });

  it("includes return refunds in sale receipt html", () => {
    const sale = {
      id: "sale-receipt-return",
      saleNumber: 1,
      branchId: "branch-1",
      branchName: "Matriz Teste",
      productId: "product-1",
      productName: "Filtro teste",
      quantity: "2.000",
      unitPrice: "50.00",
      subtotalAmount: "100.00",
      discountAmount: "0.00",
      totalAmount: "100.00",
      billingIssueDate: "2026-07-09",
      billingDueDate: "2026-07-20",
      clientId: null,
      clientPersonType: null,
      clientName: "Cliente teste",
      clientDocument: null,
      clientEmail: null,
      clientPhone: null,
      clientStateRegistration: null,
      clientStateRegistrationIndicator: null,
      clientAddressStreet: null,
      clientAddressNumber: null,
      clientAddressComplement: null,
      clientAddressDistrict: null,
      clientAddressCity: null,
      clientAddressState: null,
      clientAddressZipCode: null,
      paymentMethodCode: "MULTIPLE",
      paymentMethodName: "PIX + Cartao de credito",
      payments: [
        {
          id: "sale-payment-1",
          paymentMethodId: "payment-1",
          paymentMethodCode: "PIX",
          paymentMethodName: "PIX",
          amount: "60.00",
        },
        {
          id: "sale-payment-2",
          paymentMethodId: "payment-2",
          paymentMethodCode: "CREDIT",
          paymentMethodName: "Cartao de credito",
          amount: "40.00",
        },
      ],
      paymentInstallments: [
        {
          id: "sale-installment-1",
          saleId: "sale-receipt-return",
          position: 1,
          dueDate: "2026-07-20",
          amount: "50.00",
        },
        {
          id: "sale-installment-2",
          saleId: "sale-receipt-return",
          position: 2,
          dueDate: "2026-08-20",
          amount: "50.00",
        },
      ],
      createdByUserName: "Operador teste",
      createdAt: new Date("2026-07-09T12:00:00.000Z"),
      cancelledByUserName: null,
      cancelledAt: null,
      cancellationReason: null,
      status: "COMPLETED",
      items: [
        {
          id: "sale-item-1",
          productId: "product-1",
          productInternalCode: "FILTRO-1",
          productName: "Filtro teste",
          productCfop: null,
          productIcmsCst: null,
          productNcm: null,
          productPisCst: null,
          productCofinsCst: null,
          productOrigin: null,
          productUnit: "UN",
          quantity: "2.000",
          unitPrice: "50.00",
          discountAmount: "0.00",
          totalAmount: "100.00",
          returnedQuantity: "1.000",
          returnableQuantity: "1.000",
          position: 1,
          returns: [
            {
              id: "return-1",
              quantity: "1.000",
              reason: "Cliente devolveu uma unidade",
              refundAmount: "50.00",
              refundPaymentMethodId: "payment-1",
              refundPaymentMethodName: "PIX",
              refundedAt: new Date("2026-07-09T14:30:00.000Z"),
              refundReference: "NSU123",
              createdByUserName: "Operador teste",
              createdAt: new Date("2026-07-09T14:31:00.000Z"),
            },
          ],
        },
      ],
    } satisfies ModelSale;

    const storeProfile = {
      address: "Rua teste",
      city: "Cidade teste",
      document: "Documento sem valor fiscal",
      email: "teste@example.com",
      name: "Loja teste",
      phone: "63999999999",
    };
    const html = saleReceiptPdfHtml(sale, storeProfile);
    const pixOnlyHtml = saleReceiptPdfHtml(
      {
        ...sale,
        paymentMethodCode: "PIX",
        paymentMethodName: "PIX",
        payments: [
          {
            id: "sale-payment-pix",
            paymentMethodId: "payment-pix",
            paymentMethodCode: "PIX",
            paymentMethodName: "PIX",
            amount: "100.00",
          },
        ],
      },
      storeProfile,
    );

    assert.match(html, /Devolucoes e estornos/);
    assert.match(html, /Forma de pagamento/);
    assert.match(html, /Cartao de credito/);
    assert.match(html, /Parcelas \/ vencimentos/);
    assert.match(html, /001/);
    assert.match(html, /002/);
    assert.match(html, /20\/07\/2026/);
    assert.match(html, /20\/08\/2026/);
    assert.doesNotMatch(html, /Referencia interna/);
    assert.doesNotMatch(html, /Vencimento do boleto\/fatura/);
    assert.match(html, /Cliente devolveu uma unidade/);
    assert.match(html, /NSU123/);
    assert.match(html, /Estornos/);
    assert.match(html, /Total liquido/);
    assert.match(html, /R\$\s*50,00/);
    assert.doesNotMatch(pixOnlyHtml, /Parcelas \/ vencimentos/);
    assert.doesNotMatch(pixOnlyHtml, /Faturamento/);
  });

  it("returns an item from a completed shipping sale to stock", async () => {
    const product = await request<Product>("/products", {
      method: "POST",
      body: { name: "Filtro envio devolucao", salePrice: 70 },
    });
    const client = await request<Client>("/clients", {
      method: "POST",
      body: {
        personType: "PF",
        name: "Cliente devolucao envio",
      },
    });

    await request("/stock-adjustments", {
      method: "POST",
      body: {
        productId: product.body.data?.id,
        quantity: 4,
        reason: "Saldo para devolucao por envio",
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
    const order = await request<ShippingOrder>("/shipping-orders", {
      method: "POST",
      body: {
        clientId: client.body.data?.id,
        productId: product.body.data?.id,
        quantity: 2,
      },
    });
    const completed = await request<ShippingOrder>(
      `/shipping-orders/${order.body.data?.id}/complete`,
      {
        method: "PATCH",
        body: { paymentMethodId: pix?.id },
      },
    );
    const sales = await request<Sale[]>("/sales");
    const linkedSale = sales.body.data?.find(
      (sale) => sale.id === completed.body.data?.saleId,
    );
    const returned = await request<Sale>(
      `/sales/${linkedSale?.id}/returns`,
      {
        method: "POST",
        body: {
          saleItemId: linkedSale?.items[0]?.id,
          quantity: 1,
          reason: "Cliente devolveu item enviado",
          refundAmount: 70,
          refundPaymentMethodId: pix?.id,
          refundedAt: "2026-07-09T10:00:00.000Z",
          refundReference: "NSU-SMOKE-DEVOLUCAO",
        },
      },
    );
    const updatedProduct = await request<Product>(
      `/products/${product.body.data?.id}`,
    );
    const returnRecord = await db("sale_item_returns")
      .where("sale_id", linkedSale?.id)
      .first();

    assert.equal(returned.status, 200);
    assert.equal(returned.body.data?.items[0]?.returnedQuantity, "1.000");
    assert.equal(returned.body.data?.items[0]?.returnableQuantity, "1.000");
    assert.equal(updatedProduct.body.data?.currentStock, "3.000");
    assert.equal(returnRecord?.refund_amount, "70.00");
    assert.equal(returnRecord?.refund_payment_method_id, pix?.id);
    assert.equal(returnRecord?.refund_reference, "NSU-SMOKE-DEVOLUCAO");
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
        body: {
          documentType: "NFE",
          additionalInformation: " Entregar DANFE com observacao fiscal ",
        },
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
    const isolatedBranch = await request<Branch>("/branches", {
      method: "POST",
      body: {
        name: "Filial Fiscal Isolado",
        code: "FISCAL_ISOLADO",
      },
    });
    const isolatedFiscalDocuments = await request<FiscalDocument[]>(
      "/fiscal-documents",
      {
        headers: { "x-active-branch-id": isolatedBranch.body.data?.id ?? "" },
      },
    );
    const isolatedFiscalDocument = await request<FiscalDocument>(
      `/fiscal-documents/${issued.body.data?.id}`,
      {
        headers: { "x-active-branch-id": isolatedBranch.body.data?.id ?? "" },
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
    assert.equal(issued.body.data?.branchName, "Matriz Teste");
    assert.equal(
      issued.body.data?.providerReference,
      `SALE${sale.body.data?.id?.replace(/-/g, "")}`,
    );
    assert.equal(issued.body.data?.issuedByUserName, "Administrador de teste");
    assert.equal(
      issued.body.data?.requestPayload.additionalInformation,
      "Entregar DANFE com observacao fiscal",
    );
    assert.equal(duplicated.status, 409);
    assert.equal(
      duplicated.body.message,
      "Documento fiscal ja emitido para esta venda.",
    );
    assert.equal(unsupportedDocumentType.status, 422);
    assert.equal(listed.body.data?.length, 1);
    assert.equal(shown.body.data?.id, issued.body.data?.id);
    assert.equal(isolatedFiscalDocuments.body.data?.length, 0);
    assert.equal(isolatedFiscalDocument.status, 404);
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
      branch_id: defaultBranchId,
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
        branch_id: defaultBranchId,
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
        defaultBranchId,
      );
      const synced = await syncFiscalDocument(inserted.id, defaultBranchId);

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
        branch_id: defaultBranchId,
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
        defaultBranchId,
      );
      const synced = await syncFiscalDocument(inserted.id, defaultBranchId);

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
        branch_id: defaultBranchId,
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
        defaultBranchId,
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
        branch_id: defaultBranchId,
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
        defaultBranchId,
      );
      const synced = await syncFiscalDocument(inserted.id, defaultBranchId);

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
        personType: "PJ",
        name: "Cliente sem endereco fiscal",
        document: "12345678000199",
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
          (error) => error.field === "items.1.productOrigin",
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

    await request("/fiscal-settings", {
      method: "PUT",
      body: {
        provider: "FOCUS",
        environment: "HOMOLOGATION",
        companyCnpj: "12.345.678/0001-90",
        allowProduction: false,
        defaultNatureOperation: "Venda de mercadoria",
        defaultSaleCfop: "123",
        defaultIcmsCst: "1",
        defaultPisCst: "4",
        defaultCofinsCst: "7",
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
            error.field === "defaultSaleCfop" &&
            error.message === "CFOP padrao de venda deve conter 4 digitos.",
        ),
      );
      assert.ok(
        fiscalDocument.body.errors?.some(
          (error) =>
            error.field === "defaultIcmsCst" &&
            error.message ===
              "CST/CSOSN ICMS padrao deve conter 2 ou 3 digitos.",
        ),
      );
      assert.ok(
        fiscalDocument.body.errors?.some(
          (error) =>
            error.field === "defaultPisCst" &&
            error.message === "CST PIS padrao deve conter 2 digitos.",
        ),
      );
      assert.ok(
        fiscalDocument.body.errors?.some(
          (error) =>
            error.field === "defaultCofinsCst" &&
            error.message === "CST COFINS padrao deve conter 2 digitos.",
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

  it("blocks Focus invoice billing when boleto due date is the fiscal issue date", async () => {
    const originalFiscalProvider = env.fiscal.provider;
    const product = await request<Product>("/products", {
      method: "POST",
      body: {
        name: "Filtro boleto mesmo dia",
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
        name: "Cliente boleto mesmo dia",
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
    const boleto = paymentMethods.body.data?.find(
      (paymentMethod) => paymentMethod.code === "BOLETO",
    );
    const today = testBrazilDate();

    await request("/stock-adjustments", {
      method: "POST",
      body: {
        productId: product.body.data?.id,
        quantity: 2,
        reason: "Saldo para boleto mesmo dia",
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
        paymentMethodId: boleto?.id,
        quantity: 1,
        billingIssueDate: today,
        billingDueDate: today,
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
            error.field === "billingDueDate" &&
            error.message ===
              "Vencimento do boleto/fatura deve ser posterior a data de emissao da NF-e.",
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

  it("issues Focus fiscal document using the active branch CNPJ", async () => {
    const originalFiscalProvider = env.fiscal.provider;
    const originalFocusToken = env.fiscal.focus.token;
    const originalFocusHomologationToken =
      env.fiscal.focus.tokens.HOMOLOGATION;
    const originalFocusHomologationTokensByCompanyCnpj = {
      ...env.fiscal.focus.tokensByCompanyCnpj.HOMOLOGATION,
    };
    const originalFocusCompanyCnpj = env.fiscal.focus.companyCnpj;
    const originalFetch = globalThis.fetch;

    env.fiscal.provider = "focus";
    env.fiscal.focus.token = "token-focus-fallback";
    env.fiscal.focus.tokens.HOMOLOGATION = "token-focus-homologacao";
    env.fiscal.focus.tokensByCompanyCnpj.HOMOLOGATION = {
      "98765432000110": "token-focus-sao-luis",
    };
    env.fiscal.focus.companyCnpj = "12.345.678/0001-99";

    const branch = await request<Branch>("/branches", {
      method: "POST",
      body: {
        name: "Filial Emissao Focus",
        code: "FOCUS_BRANCH",
        document: "98.765.432/0001-10",
        addressCity: "Sao Luis",
        addressState: "MA",
      },
    });
    const activeBranchHeaders = {
      "x-active-branch-id": branch.body.data?.id ?? "",
    };
    const product = await request<Product>("/products", {
      method: "POST",
      headers: activeBranchHeaders,
      body: {
        name: "Filtro NF-e filial",
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
      headers: activeBranchHeaders,
      body: {
        personType: "PF",
        name: "Cliente NF-e filial",
        document: "12345678901",
        stateRegistrationIndicator: "9",
        addressStreet: "Rua Fiscal",
        addressNumber: "123",
        addressDistrict: "Centro",
        addressCity: "Sao Luis",
        addressState: "MA",
        addressZipCode: "65000000",
      },
    });
    const paymentMethods = await request<PaymentMethod[]>(
      "/payment-methods?active=true",
      { headers: activeBranchHeaders },
    );
    const pix = paymentMethods.body.data?.find(
      (paymentMethod) => paymentMethod.code === "PIX",
    );
    let submittedPayload: Record<string, unknown> | null = null;
    let submittedAuthorization: string | null = null;

    await request("/stock-adjustments", {
      method: "POST",
      headers: activeBranchHeaders,
      body: {
        productId: product.body.data?.id,
        quantity: 2,
        reason: "Saldo para emissao Focus por filial",
      },
    });
    await request("/cash-register/open", {
      method: "POST",
      headers: activeBranchHeaders,
      body: { openingBalance: 0 },
    });

    const sale = await request<Sale>("/sales", {
      method: "POST",
      headers: activeBranchHeaders,
      body: {
        productId: product.body.data?.id,
        clientId: client.body.data?.id,
        paymentMethodId: pix?.id,
        quantity: 1,
      },
    });

    globalThis.fetch = (async (input, init) => {
      if (String(input).startsWith(baseUrl)) {
        return originalFetch(input, init);
      }

      submittedPayload = JSON.parse(String(init?.body)) as Record<
        string,
        unknown
      >;
      submittedAuthorization =
        init?.headers instanceof Headers
          ? init.headers.get("Authorization")
          : ((init?.headers as Record<string, string> | undefined)
              ?.Authorization ?? null);

      return new Response(
        JSON.stringify({
          ref: "SALEfocusbranch",
          status: "autorizado",
        }),
        { status: 201 },
      );
    }) as typeof fetch;

    try {
      const fiscalDocument = await request<FiscalDocument>(
        `/sales/${sale.body.data?.id}/fiscal-documents`,
        {
          method: "POST",
          headers: activeBranchHeaders,
          body: { documentType: "NFE" },
        },
      );

      assert.equal(
        fiscalDocument.status,
        201,
        JSON.stringify(fiscalDocument.body),
      );
      assert.equal(fiscalDocument.body.data?.branchId, branch.body.data?.id);
      assert.ok(submittedPayload);
      assert.equal(
        (submittedPayload as Record<string, unknown>).cnpj_emitente,
        "98765432000110",
      );
      assert.equal(
        submittedAuthorization,
        `Basic ${Buffer.from("token-focus-sao-luis:").toString("base64")}`,
      );
    } finally {
      env.fiscal.provider = originalFiscalProvider;
      env.fiscal.focus.token = originalFocusToken;
      env.fiscal.focus.tokens.HOMOLOGATION =
        originalFocusHomologationToken;
      env.fiscal.focus.tokensByCompanyCnpj.HOMOLOGATION =
        originalFocusHomologationTokensByCompanyCnpj;
      env.fiscal.focus.companyCnpj = originalFocusCompanyCnpj;
      globalThis.fetch = originalFetch;
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

  it("downloads authorized fiscal files through an authenticated attachment endpoint", async () => {
    const originalFetch = globalThis.fetch;
    const administrator = await db("users")
      .select("id")
      .where("email", "admin@example.com")
      .first();
    const [inserted] = await db("fiscal_documents")
      .insert({
        branch_id: defaultBranchId,
        source_type: "SALE",
        source_id: randomUUID(),
        document_type: "NFE",
        provider: "FOCUS",
        environment: "HOMOLOGATION",
        status: "AUTHORIZED",
        access_key: "12345678901234567890123456789012345678901234",
        provider_reference: "SALEfiledownloadtest",
        number: 123,
        series: 1,
        xml_url: "https://homologacao.focusnfe.com.br/arquivos/nfe/teste.xml",
        pdf_url: "https://homologacao.focusnfe.com.br/arquivos/nfe/teste.pdf",
        request_payload: {},
        response_payload: {},
        issued_by_user_id: administrator.id,
      })
      .returning("id");

    globalThis.fetch = (async (input, init) => {
      const url = String(input);

      if (url.startsWith(baseUrl)) {
        return originalFetch(input, init);
      }

      const responseByExtension = {
        pdf: new Response(Buffer.from("%PDF-test"), {
          headers: { "content-type": "application/pdf" },
          status: 200,
        }),
        xml: new Response("<nfe>autorizada</nfe>", {
          headers: { "content-type": "application/xml" },
          status: 200,
        }),
      };

      return url.endsWith(".xml")
        ? responseByExtension.xml
        : responseByExtension.pdf;
    }) as typeof fetch;

    try {
      const xml = await requestRaw(
        `/fiscal-documents/${inserted.id}/files/xml`,
      );
      const danfe = await requestRaw(
        `/fiscal-documents/${inserted.id}/files/danfe`,
      );

      assert.equal(xml.status, 200);
      assert.equal(xml.body.toString(), "<nfe>autorizada</nfe>");
      assert.equal(
        xml.contentDisposition,
        'attachment; filename="SALEfiledownloadtest.xml"',
      );
      assert.equal(danfe.status, 200);
      assert.equal(danfe.body.toString(), "%PDF-test");
      assert.equal(
        danfe.contentDisposition,
        'attachment; filename="SALEfiledownloadtest.pdf"',
      );
    } finally {
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

    requestPayload.sale.clientPersonType = "PJ";
    requestPayload.sale.clientDocument = "12345678000199";
    requestPayload.sale.clientName = " Cliente Focus ";
    requestPayload.sale.clientEmail = " fiscal@example.com ";
    requestPayload.sale.clientStateRegistration = " 123456 ";
    requestPayload.sale.clientStateRegistrationIndicator = "1";
    requestPayload.sale.clientAddressStreet = " Rua Fiscal ";
    requestPayload.sale.clientAddressNumber = " 123 ";
    requestPayload.sale.clientAddressComplement = " Sala 1 ";
    requestPayload.sale.clientAddressDistrict = " Centro ";
    requestPayload.sale.clientAddressCity = " Araguaina ";
    requestPayload.sale.clientAddressState = " to ";
    requestPayload.sale.items[0].productInternalCode = " FISCAL-1 ";
    requestPayload.sale.items[0].productName = " Filtro Focus ";
    requestPayload.sale.items[0].productNcm = " 84212300 ";
    requestPayload.additionalInformation = " Observacao fiscal no rodape ";
    requestPayload.defaultNatureOperation = " Venda de mercadoria ";
    requestPayload.defaultSaleCfop = "5405";
    requestPayload.defaultIcmsCst = "500";
    requestPayload.defaultPisCst = "49";
    requestPayload.defaultCofinsCst = "49";

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

      assert.equal(payload.natureza_operacao, "Venda de mercadoria");
      assert.ok(payload.data_emissao);
      assert.equal(payload.data_entrada_saida, payload.data_emissao);
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
      assert.equal(
        payload.informacoes_adicionais_contribuinte,
        "Observacao fiscal no rodape",
      );

      const item = (payload.items as Array<Record<string, unknown>>)[0];

      assert.equal(item.codigo_produto, "FISCAL-1");
      assert.equal(item.descricao, "Filtro Focus");
      assert.equal(item.codigo_ncm, "84212300");
      assert.equal(item.cfop, "5405");
      assert.equal(item.icms_situacao_tributaria, "500");
      assert.equal(item.pis_situacao_tributaria, "49");
      assert.equal(item.cofins_situacao_tributaria, "49");
    } finally {
      env.fiscal.provider = originalFiscalProvider;
      env.fiscal.focus.token = originalFocusToken;
      env.fiscal.focus.companyCnpj = originalFocusCompanyCnpj;
      globalThis.fetch = originalFetch;
    }
  });

  it("does not send state registration for individual Focus customers", async () => {
    const originalFiscalProvider = env.fiscal.provider;
    const originalFocusToken = env.fiscal.focus.token;
    const originalFocusCompanyCnpj = env.fiscal.focus.companyCnpj;
    const originalFetch = globalThis.fetch;
    const requestPayload = focusIssueRequest();
    let submittedPayload: Record<string, unknown> | null = null;

    requestPayload.sale.clientStateRegistration = "123456";
    requestPayload.sale.clientStateRegistrationIndicator = "1";

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

      assert.equal(payload.inscricao_estadual_destinatario, undefined);
      assert.equal(payload.indicador_inscricao_estadual_destinatario, 9);
    } finally {
      env.fiscal.provider = originalFiscalProvider;
      env.fiscal.focus.token = originalFocusToken;
      env.fiscal.focus.companyCnpj = originalFocusCompanyCnpj;
      globalThis.fetch = originalFetch;
    }
  });

  it("sends Focus sale and item discounts with gross product totals", async () => {
    const originalFiscalProvider = env.fiscal.provider;
    const originalFocusToken = env.fiscal.focus.token;
    const originalFocusCompanyCnpj = env.fiscal.focus.companyCnpj;
    const originalFetch = globalThis.fetch;
    const requestPayload = focusIssueRequest();
    let submittedPayload: Record<string, unknown> | null = null;

    requestPayload.sale.totalAmount = "140.00";
    requestPayload.sale.discountAmount = "10.00";
    requestPayload.sale.paymentMethodCode = "BOLETO";
    requestPayload.sale.paymentMethodName = "Boleto";
    requestPayload.sale.payments = [
      {
        paymentMethodCode: "BOLETO",
        paymentMethodName: "Boleto",
        amount: "140.00",
      },
    ];
    requestPayload.sale.paymentInstallments = [
      {
        dueDate: "2026-07-25",
        amount: "70.00",
        position: 1,
      },
      {
        dueDate: "2026-08-25",
        amount: "70.00",
        position: 2,
      },
    ];
    requestPayload.sale.billingIssueDate = "2026-07-10";
    requestPayload.sale.billingDueDate = "2026-07-25";
    requestPayload.sale.items[0].quantity = "2.000";
    requestPayload.sale.items[0].unitPrice = "40.00";
    requestPayload.sale.items[0].discountAmount = "5.00";
    requestPayload.sale.items[0].totalAmount = "75.00";
    requestPayload.sale.items.push({
      productId: "productfocusprovidertest2",
      productInternalCode: "FISCAL-2",
      productName: "Filtro Focus 2",
      productCfop: "5102",
      productIcmsCst: "102",
      productNcm: "84212300",
      productPisCst: "49",
      productCofinsCst: "49",
      productOrigin: "0",
      productUnit: "UN",
      quantity: "1.000",
      unitPrice: "75.00",
      discountAmount: "0.00",
      totalAmount: "75.00",
      position: 2,
    });

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
      const items = payload.items as Array<Record<string, unknown>>;

      assert.equal(payload.valor_produtos, 155);
      assert.equal(payload.valor_desconto, 15);
      assert.equal(payload.valor_total, 140);
      assert.match(
        String(payload.data_emissao),
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-03:00$/,
      );
      assert.equal(payload.numero_fatura, "001");
      assert.equal(payload.valor_original_fatura, 155);
      assert.equal(payload.valor_desconto_fatura, 15);
      assert.equal(payload.valor_liquido_fatura, 140);
      assert.deepEqual(payload.formas_pagamento, [
        {
          indicador_pagamento: 1,
          forma_pagamento: "15",
          valor_pagamento: 140,
        },
      ]);
      assert.deepEqual(payload.duplicatas, [
        {
          numero: "001",
          data_vencimento: "2026-07-25",
          valor: 70,
        },
        {
          numero: "002",
          data_vencimento: "2026-08-25",
          valor: 70,
        },
      ]);
      assert.equal(items[0]?.valor_bruto, 80);
      assert.equal(items[0]?.valor_desconto, 5);
      assert.equal(items[1]?.valor_bruto, 75);
      assert.equal(items[1]?.valor_desconto, 0);
    } finally {
      env.fiscal.provider = originalFiscalProvider;
      env.fiscal.focus.token = originalFocusToken;
      env.fiscal.focus.companyCnpj = originalFocusCompanyCnpj;
      globalThis.fetch = originalFetch;
    }
  });

  it("does not send Focus invoice billing for cash payment methods", async () => {
    const originalFiscalProvider = env.fiscal.provider;
    const originalFocusToken = env.fiscal.focus.token;
    const originalFocusCompanyCnpj = env.fiscal.focus.companyCnpj;
    const originalFetch = globalThis.fetch;
    const requestPayload = focusIssueRequest();
    let submittedPayload: Record<string, unknown> | null = null;

    requestPayload.sale.billingIssueDate = "2026-07-10";
    requestPayload.sale.billingDueDate = "2026-07-10";

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

      assert.equal(payload.numero_fatura, undefined);
      assert.equal(payload.valor_original_fatura, undefined);
      assert.equal(payload.valor_desconto_fatura, undefined);
      assert.equal(payload.valor_liquido_fatura, undefined);
      assert.equal(payload.duplicatas, undefined);
    } finally {
      env.fiscal.provider = originalFiscalProvider;
      env.fiscal.focus.token = originalFocusToken;
      env.fiscal.focus.companyCnpj = originalFocusCompanyCnpj;
      globalThis.fetch = originalFetch;
    }
  });

  it("sends a one-installment Focus invoice for boleto when sale has no billing due date", async () => {
    const originalFiscalProvider = env.fiscal.provider;
    const originalFocusToken = env.fiscal.focus.token;
    const originalFocusCompanyCnpj = env.fiscal.focus.companyCnpj;
    const originalFetch = globalThis.fetch;
    const requestPayload = focusIssueRequest();
    let submittedPayload: Record<string, unknown> | null = null;

    requestPayload.sale.paymentMethodCode = "BOLETO";
    requestPayload.sale.paymentMethodName = "Boleto";
    requestPayload.sale.payments = [
      {
        paymentMethodCode: "BOLETO",
        paymentMethodName: "Boleto",
        amount: "35.00",
      },
    ];
    requestPayload.sale.billingIssueDate = "2026-07-10";
    requestPayload.sale.billingDueDate = null;
    requestPayload.sale.paymentInstallments = [];

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

      assert.equal(payload.numero_fatura, "001");
      assert.equal(payload.valor_original_fatura, 35);
      assert.equal(payload.valor_desconto_fatura, 0);
      assert.equal(payload.valor_liquido_fatura, 35);
      assert.deepEqual(payload.duplicatas, [
        {
          numero: "001",
          data_vencimento: "2026-07-10",
          valor: 35,
        },
      ]);
    } finally {
      env.fiscal.provider = originalFiscalProvider;
      env.fiscal.focus.token = originalFocusToken;
      env.fiscal.focus.companyCnpj = originalFocusCompanyCnpj;
      globalThis.fetch = originalFetch;
    }
  });

  it("sends credit card payment details to Focus", async () => {
    const originalFiscalProvider = env.fiscal.provider;
    const originalFocusToken = env.fiscal.focus.token;
    const originalFocusCompanyCnpj = env.fiscal.focus.companyCnpj;
    const originalFetch = globalThis.fetch;
    const requestPayload = focusIssueRequest();
    let submittedPayload: Record<string, unknown> | null = null;

    requestPayload.sale.paymentMethodCode = "CREDIT";
    requestPayload.sale.paymentMethodName = "Cartao de credito";
    requestPayload.sale.payments = [
      {
        paymentMethodCode: "CREDIT",
        paymentMethodName: "Cartao de credito",
        amount: "35.00",
      },
    ];

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

      assert.deepEqual(payload.formas_pagamento, [
        {
          indicador_pagamento: 0,
          forma_pagamento: "03",
          valor_pagamento: 35,
        },
      ]);
    } finally {
      env.fiscal.provider = originalFiscalProvider;
      env.fiscal.focus.token = originalFocusToken;
      env.fiscal.focus.companyCnpj = originalFocusCompanyCnpj;
      globalThis.fetch = originalFetch;
    }
  });

  it("generates a Focus DANFE preview without issuing a fiscal document", async () => {
    const originalFiscalProvider = env.fiscal.provider;
    const originalFocusToken = env.fiscal.focus.token;
    const originalFocusCompanyCnpj = env.fiscal.focus.companyCnpj;
    const originalFetch = globalThis.fetch;
    const requestPayload = focusIssueRequest();
    let submittedUrl = "";
    let submittedPayload: Record<string, unknown> | null = null;

    env.fiscal.provider = "focus";
    env.fiscal.focus.token = "token-focus-teste";
    env.fiscal.focus.companyCnpj = "12345678000199";
    globalThis.fetch = (async (input, init) => {
      submittedUrl = String(input);
      submittedPayload = JSON.parse(String(init?.body)) as Record<
        string,
        unknown
      >;

      return new Response(Buffer.from("PDF preview"), {
        headers: { "content-type": "application/pdf" },
        status: 200,
      });
    }) as typeof fetch;

    try {
      const preview = await new FocusFiscalProvider().preview(requestPayload);
      const payload = submittedPayload as unknown as Record<string, unknown>;

      assert.ok(submittedUrl.endsWith("/v2/nfe/danfe"));
      assert.equal(payload.nome_destinatario, "Cliente Focus");
      assert.equal(preview.contentType, "application/pdf");
      assert.equal(preview.fileName, "previa-SALEfocusprovidertest.pdf");
      assert.equal(preview.content.toString(), "PDF preview");
    } finally {
      env.fiscal.provider = originalFiscalProvider;
      env.fiscal.focus.token = originalFocusToken;
      env.fiscal.focus.companyCnpj = originalFocusCompanyCnpj;
      globalThis.fetch = originalFetch;
    }
  });

  it("sends multiple payment methods to Focus", async () => {
    const originalFiscalProvider = env.fiscal.provider;
    const originalFocusToken = env.fiscal.focus.token;
    const originalFocusCompanyCnpj = env.fiscal.focus.companyCnpj;
    const originalFetch = globalThis.fetch;
    const requestPayload = focusIssueRequest();
    let submittedPayload: Record<string, unknown> | null = null;

    requestPayload.sale.paymentMethodCode = "MULTIPLE";
    requestPayload.sale.paymentMethodName = "PIX + Cartao de credito";
    requestPayload.sale.payments = [
      {
        paymentMethodCode: "PIX",
        paymentMethodName: "PIX",
        amount: "15.00",
      },
      {
        paymentMethodCode: "CREDIT",
        paymentMethodName: "Cartao de credito",
        amount: "20.00",
      },
    ];

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

      assert.deepEqual(payload.formas_pagamento, [
        {
          indicador_pagamento: 0,
          forma_pagamento: "20",
          valor_pagamento: 15,
        },
        {
          indicador_pagamento: 0,
          forma_pagamento: "03",
          valor_pagamento: 20,
        },
      ]);
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
    const focusPayloads: Array<Record<string, unknown>> = [];
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
      focusPayloads.push(
        JSON.parse(String(init?.body)) as Record<string, unknown>,
      );

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
          billingIssueDate: "2026-08-28",
          billingDueDate: "2026-08-28",
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
      assert.equal(focusPayloads[0]?.numero_fatura, undefined);
      assert.equal(focusPayloads[0]?.duplicatas, undefined);
      assert.equal(focusPayloads[1]?.numero_fatura, undefined);
      assert.equal(focusPayloads[1]?.duplicatas, undefined);
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

  it("keeps management reports scoped to the active branch", async () => {
    const branch = await request<Branch>("/branches", {
      method: "POST",
      body: {
        name: "Filial Relatorio Isolado",
        code: "RELATORIO_ISOLADO",
      },
    });
    const supplier = await request<NamedEntity>("/suppliers", {
      method: "POST",
      body: { name: "Fornecedor relatorio filial" },
    });
    const product = await request<Product>("/products", {
      method: "POST",
      body: {
        name: "Filtro relatorio filial",
        salePrice: 25,
        minimumStock: 10,
      },
    });
    const paymentMethod = await activePaymentMethod();

    assert.ok(branch.body.data?.id);

    await request("/stock-entries", {
      method: "POST",
      body: {
        productId: product.body.data?.id,
        supplierId: supplier.body.data?.id,
        quantity: 2,
        unitCost: 10,
      },
    });
    await request("/cash-register/open", {
      method: "POST",
      body: { openingBalance: 50 },
    });
    await request("/sales", {
      method: "POST",
      body: {
        productId: product.body.data?.id,
        paymentMethodId: paymentMethod.id,
        quantity: 1,
      },
    });

    const isolatedHeaders = { "x-active-branch-id": branch.body.data.id };
    const isolatedOverview = await request<ReportsOverview>("/reports/overview", {
      headers: isolatedHeaders,
    });
    const isolatedSales = await request<SalesReport>("/reports/sales", {
      headers: isolatedHeaders,
    });
    const isolatedStock = await request<StockReport>("/reports/stock", {
      headers: isolatedHeaders,
    });
    const isolatedInventory = await request<InventoryReport>(
      "/reports/inventory",
      {
        headers: isolatedHeaders,
      },
    );
    const isolatedPurchases = await request<PurchaseReport>("/reports/purchases", {
      headers: isolatedHeaders,
    });
    const isolatedCash = await request<CashReport>("/reports/cash", {
      headers: isolatedHeaders,
    });

    assert.equal(isolatedOverview.status, 200);
    assert.equal(isolatedOverview.body.data?.salesCount, 0);
    assert.equal(isolatedOverview.body.data?.lowStockProductsCount, 0);
    assert.equal(isolatedOverview.body.data?.openCashRegister, null);
    assert.equal(isolatedSales.body.data?.summary.salesCount, 0);
    assert.equal(isolatedStock.body.data?.summary.activeProductsCount, 0);
    assert.equal(isolatedInventory.body.data?.summary.productsCount, 0);
    assert.equal(isolatedInventory.body.data?.items.length, 0);
    assert.equal(isolatedPurchases.body.data?.summary.entriesCount, 0);
    assert.equal(isolatedCash.body.data?.summary.sessionsCount, 0);
  });

  it("returns sales commercial reports grouped by product, client, and payment method", async () => {
    const firstProduct = await request<Product>("/products", {
      method: "POST",
      body: {
        name: "Filtro relatorio comercial A",
        costPrice: 20,
        salePrice: 40,
      },
    });
    const secondProduct = await request<Product>("/products", {
      method: "POST",
      body: {
        name: "Filtro relatorio comercial B",
        costPrice: 45,
        salePrice: 75,
      },
    });
    const client = await request<Client>("/clients", {
      method: "POST",
      body: { personType: "PF", name: "Cliente relatorio comercial" },
    });
    const paymentMethods = await request<PaymentMethod[]>(
      "/payment-methods?active=true",
    );
    const boleto = paymentMethods.body.data?.find(
      (paymentMethod) => paymentMethod.code === "BOLETO",
    );

    await request("/stock-adjustments", {
      method: "POST",
      body: {
        productId: firstProduct.body.data?.id,
        quantity: 5,
        reason: "Saldo para relatorio comercial",
      },
    });
    await request("/stock-adjustments", {
      method: "POST",
      body: {
        productId: secondProduct.body.data?.id,
        quantity: 5,
        reason: "Saldo para relatorio comercial",
      },
    });
    await request("/cash-register/open", {
      method: "POST",
      body: { openingBalance: 0 },
    });
    await request("/sales", {
      method: "POST",
      body: {
        clientId: client.body.data?.id,
        discountAmount: 10,
        items: [
          { productId: firstProduct.body.data?.id, quantity: 2 },
          { productId: secondProduct.body.data?.id, quantity: 1 },
        ],
        paymentMethodId: boleto?.id,
      },
    });

    const report = await request<SalesReport>("/reports/sales");

    assert.equal(report.status, 200);
    assert.equal(report.body.data?.summary.salesCount, 1);
    assert.equal(report.body.data?.summary.itemsQuantity, "3.000");
    assert.equal(report.body.data?.summary.grossAmount, "155.00");
    assert.equal(report.body.data?.summary.discountAmount, "10.00");
    assert.equal(report.body.data?.summary.costAmount, "85.00");
    assert.equal(report.body.data?.summary.netAmount, "145.00");
    assert.equal(report.body.data?.summary.grossProfitAmount, "60.00");
    assert.equal(report.body.data?.summary.grossMarginPercentage, "41.38");
    assert.equal(
      report.body.data?.byProduct[0]?.productName,
      firstProduct.body.data?.name,
    );
    assert.equal(report.body.data?.byProduct[0]?.costAmount, "40.00");
    assert.equal(report.body.data?.byProduct[0]?.totalAmount, "80.00");
    assert.equal(
      report.body.data?.byProduct[0]?.grossProfitAmount,
      "40.00",
    );
    assert.equal(
      report.body.data?.byProduct[0]?.grossMarginPercentage,
      "50.00",
    );
    assert.equal(
      report.body.data?.byClient[0]?.clientName,
      client.body.data?.name,
    );
    assert.equal(report.body.data?.byClient[0]?.salesCount, 1);
    assert.equal(report.body.data?.byClient[0]?.totalAmount, "145.00");
    assert.equal(report.body.data?.byPaymentMethod[0]?.paymentMethodName, "Boleto");
    assert.equal(report.body.data?.byPaymentMethod[0]?.totalAmount, "145.00");
    assert.equal(
      report.body.data?.abcProducts[0]?.productName,
      firstProduct.body.data?.name,
    );
    assert.equal(report.body.data?.abcProducts[0]?.totalAmount, "80.00");
    assert.equal(
      report.body.data?.abcProducts[0]?.revenueSharePercentage,
      "51.61",
    );
    assert.equal(
      report.body.data?.abcProducts[0]?.cumulativeRevenuePercentage,
      "51.61",
    );
    assert.equal(report.body.data?.abcProducts[0]?.abcClass, "A");
  });

  it("returns stock reports with low stock, products without movement, and turnover", async () => {
    const lowStockProduct = await request<Product>("/products", {
      method: "POST",
      body: {
        name: "Filtro relatorio estoque baixo",
        minimumStock: 5,
        salePrice: 30,
      },
    });
    const soldProduct = await request<Product>("/products", {
      method: "POST",
      body: {
        name: "Filtro relatorio giro",
        minimumStock: 1,
        salePrice: 50,
      },
    });
    const withoutMovementProduct = await request<Product>("/products", {
      method: "POST",
      body: {
        name: "Filtro sem movimentacao",
        minimumStock: 0,
        salePrice: 15,
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
        productId: lowStockProduct.body.data?.id,
        quantity: 2,
        reason: "Saldo baixo para relatorio",
      },
    });
    await request("/stock-adjustments", {
      method: "POST",
      body: {
        productId: soldProduct.body.data?.id,
        quantity: 5,
        reason: "Saldo para giro",
      },
    });
    await request("/cash-register/open", {
      method: "POST",
      body: { openingBalance: 0 },
    });
    await request("/sales", {
      method: "POST",
      body: {
        items: [{ productId: soldProduct.body.data?.id, quantity: 3 }],
        paymentMethodId: pix?.id,
      },
    });

    const report = await request<StockReport>("/reports/stock");

    assert.equal(report.status, 200);
    assert.equal(report.body.data?.summary.activeProductsCount, 3);
    assert.equal(report.body.data?.summary.lowStockProductsCount, 1);
    assert.equal(report.body.data?.summary.productsWithoutMovementCount, 1);
    assert.equal(report.body.data?.summary.soldQuantity, "3.000");
    assert.equal(
      report.body.data?.lowStockProducts[0]?.productName,
      lowStockProduct.body.data?.name,
    );
    assert.equal(
      report.body.data?.productsWithoutMovement[0]?.productId,
      withoutMovementProduct.body.data?.id,
    );
    assert.equal(
      report.body.data?.turnoverProducts[0]?.productId,
      soldProduct.body.data?.id,
    );
    assert.equal(report.body.data?.turnoverProducts[0]?.soldQuantity, "3.000");
  });

  it("returns inventory reports with stock values and product filters", async () => {
    const availableProduct = await request<Product>("/products", {
      method: "POST",
      body: {
        name: "Inventario produto disponivel",
        internalCode: "INV-DISP",
        costPrice: 4,
        salePrice: 10,
        currentStock: 10,
        minimumStock: 1,
      },
    });
    const lowStockProduct = await request<Product>("/products", {
      method: "POST",
      body: {
        name: "Inventario produto baixo",
        internalCode: "INV-BAIXO",
        costPrice: 10,
        salePrice: 20,
        currentStock: 2,
        minimumStock: 5,
      },
    });
    const negativeStockProduct = await request<Product>("/products", {
      method: "POST",
      body: {
        name: "Inventario produto negativo",
        internalCode: "INV-NEG",
        costPrice: 8,
        salePrice: 12,
        currentStock: -2,
      },
    });

    await request(`/products/${lowStockProduct.body.data?.id}/status`, {
      method: "PATCH",
      body: { active: false },
    });

    const activeReport = await request<InventoryReport>(
      "/reports/inventory?active=true",
    );
    const allReport = await request<InventoryReport>("/reports/inventory");
    const searchReport = await request<InventoryReport>(
      "/reports/inventory?search=INV-BAIXO",
    );
    const negativeReport = await request<InventoryReport>(
      "/reports/inventory?stockStatus=NEGATIVE",
    );

    assert.equal(activeReport.status, 200);
    assert.equal(activeReport.body.data?.summary.productsCount, 2);
    assert.equal(activeReport.body.data?.summary.returnedProductsCount, 2);
    assert.equal(activeReport.body.data?.summary.totalCurrentStock, "8.000");
    assert.equal(activeReport.body.data?.summary.totalReservedStock, "0.000");
    assert.equal(activeReport.body.data?.summary.totalAvailableStock, "8.000");
    assert.equal(activeReport.body.data?.summary.totalCostAmount, "24.00");
    assert.equal(activeReport.body.data?.summary.totalSaleAmount, "76.00");
    assert.equal(activeReport.body.data?.summary.potentialProfitAmount, "52.00");
    assert.equal(activeReport.body.data?.summary.lowStockProductsCount, 0);
    assert.equal(activeReport.body.data?.summary.negativeStockProductsCount, 1);
    assert.equal(
      activeReport.body.data?.items.find(
        (item) => item.productId === availableProduct.body.data?.id,
      )?.stockStatus,
      "AVAILABLE",
    );
    assert.equal(
      activeReport.body.data?.items.find(
        (item) => item.productId === negativeStockProduct.body.data?.id,
      )?.stockStatus,
      "NEGATIVE",
    );
    assert.equal(allReport.body.data?.summary.productsCount, 3);
    assert.equal(searchReport.body.data?.items[0]?.productId, lowStockProduct.body.data?.id);
    assert.equal(negativeReport.body.data?.summary.productsCount, 1);
    assert.equal(negativeReport.body.data?.items[0]?.productId, negativeStockProduct.body.data?.id);
  });

  it("returns purchase spending reports from manual entries and posted XML purchases", async () => {
    const manualProduct = await request<Product>("/products", {
      method: "POST",
      body: { name: "Filtro compra manual", salePrice: 70 },
    });
    const xmlProduct = await request<Product>("/products", {
      method: "POST",
      body: { name: "Filtro compra XML", salePrice: 90 },
    });
    const manualSupplier = await request<NamedEntity>("/suppliers", {
      method: "POST",
      body: { name: "Fornecedor entrada manual" },
    });
    const xmlSupplier = await request<NamedEntity>("/suppliers", {
      method: "POST",
      body: { name: "Fornecedor XML" },
    });

    await request("/stock-entries", {
      method: "POST",
      body: {
        productId: manualProduct.body.data?.id,
        supplierId: manualSupplier.body.data?.id,
        quantity: 2,
        unitCost: 30,
      },
    });

    const invoice = await request<PurchaseInvoice>("/purchase-invoices", {
      method: "POST",
      body: {
        accessKey: "1".repeat(44),
        supplierId: xmlSupplier.body.data?.id,
        supplierName: xmlSupplier.body.data?.name,
        totalAmount: 80,
        items: [
          {
            description: "Filtro compra XML",
            position: 1,
            productId: xmlProduct.body.data?.id,
            quantity: 4,
            totalAmount: 80,
            unitCost: 20,
          },
        ],
      },
    });

    await request(`/purchase-invoices/${invoice.body.data?.id}/post`, {
      method: "POST",
    });

    const report = await request<PurchaseReport>("/reports/purchases");

    assert.equal(report.status, 200);
    assert.equal(report.body.data?.summary.entriesCount, 2);
    assert.equal(report.body.data?.summary.totalQuantity, "6.000");
    assert.equal(report.body.data?.summary.totalAmount, "140.00");
    assert.equal(report.body.data?.summary.manualAmount, "60.00");
    assert.equal(report.body.data?.summary.xmlAmount, "80.00");
    assert.deepEqual(
      report.body.data?.bySource.map((source) => source.source).sort(),
      ["MANUAL", "XML"],
    );
    assert.equal(
      report.body.data?.bySupplier.find(
        (supplier) => supplier.supplierId === xmlSupplier.body.data?.id,
      )?.totalAmount,
      "80.00",
    );
    assert.equal(
      report.body.data?.byProduct.find(
        (product) => product.productId === manualProduct.body.data?.id,
      )?.quantity,
      "2.000",
    );
  });

  it("returns cash reports with sales, movements, and closing differences", async () => {
    const product = await request<Product>("/products", {
      method: "POST",
      body: { name: "Filtro relatorio caixa", salePrice: 50 },
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
        reason: "Saldo para relatorio de caixa",
      },
    });
    await request("/cash-register/open", {
      method: "POST",
      body: { openingBalance: 100 },
    });
    await request("/sales", {
      method: "POST",
      body: {
        items: [{ productId: product.body.data?.id, quantity: 2 }],
        paymentMethodId: pix?.id,
      },
    });
    await request("/cash-register/movements", {
      method: "POST",
      body: {
        type: "SUPPLY",
        amount: 30,
        reason: "Suprimento para relatorio",
      },
    });
    await request("/cash-register/movements", {
      method: "POST",
      body: {
        type: "WITHDRAWAL",
        amount: 10,
        reason: "Sangria para relatorio",
      },
    });
    await request("/cash-register/close", {
      method: "PATCH",
      body: {
        closingBalance: 221,
        closingPayments: [{ paymentMethodId: pix?.id, amount: 100 }],
      },
    });

    const report = await request<CashReport>("/reports/cash");

    assert.equal(report.status, 200);
    assert.equal(report.body.data?.summary.sessionsCount, 1);
    assert.equal(report.body.data?.summary.openSessionsCount, 0);
    assert.equal(report.body.data?.summary.closedSessionsCount, 1);
    assert.equal(report.body.data?.summary.openingAmount, "100.00");
    assert.equal(report.body.data?.summary.grossSalesAmount, "100.00");
    assert.equal(report.body.data?.summary.netSalesAmount, "100.00");
    assert.equal(report.body.data?.summary.supplyAmount, "30.00");
    assert.equal(report.body.data?.summary.withdrawalAmount, "10.00");
    assert.equal(report.body.data?.summary.expectedClosingAmount, "220.00");
    assert.equal(report.body.data?.summary.closingAmount, "221.00");
    assert.equal(report.body.data?.summary.closedDifferenceAmount, "1.00");
    assert.equal(report.body.data?.byPaymentMethod[0]?.paymentMethodName, "PIX");
    assert.equal(report.body.data?.byPaymentMethod[0]?.netAmount, "100.00");
    assert.equal(report.body.data?.sessions[0]?.status, "CLOSED");
    assert.equal(report.body.data?.sessions[0]?.expectedClosingBalance, "220.00");
    assert.equal(report.body.data?.sessions[0]?.difference, "1.00");
  });

  it("returns user performance reports with sales and operational actions", async () => {
    const product = await request<Product>("/products", {
      method: "POST",
      body: { name: "Filtro desempenho usuario", salePrice: 100 },
    });
    const client = await request<Client>("/clients", {
      method: "POST",
      body: { personType: "PF", name: "Cliente desempenho usuario" },
    });
    const paymentMethod = await activePaymentMethod();

    await request("/stock-adjustments", {
      method: "POST",
      body: {
        productId: product.body.data?.id,
        quantity: 5,
        reason: "Saldo para desempenho por usuario",
      },
    });
    await request<Quote>("/quotes", {
      method: "POST",
      body: {
        clientId: client.body.data?.id,
        paymentMethodId: paymentMethod.id,
        items: [{ productId: product.body.data?.id, quantity: 1 }],
      },
    });
    await request("/cash-register/open", {
      method: "POST",
      body: { openingBalance: 0 },
    });
    const sale = await request<Sale>("/sales", {
      method: "POST",
      body: {
        clientId: client.body.data?.id,
        items: [{ productId: product.body.data?.id, quantity: 2 }],
        paymentMethodId: paymentMethod.id,
      },
    });

    await request(`/sales/${sale.body.data?.id}/fiscal-documents`, {
      method: "POST",
      body: { documentType: "NFE" },
    });

    const report = await request<UserPerformanceReport>("/reports/users");

    assert.equal(report.status, 200);
    assert.equal(report.body.data?.summary.usersCount, 1);
    assert.equal(report.body.data?.summary.salesCount, 1);
    assert.equal(report.body.data?.summary.grossAmount, "200.00");
    assert.equal(report.body.data?.summary.refundAmount, "0.00");
    assert.equal(report.body.data?.summary.netAmount, "200.00");
    assert.equal(report.body.data?.summary.quotesCreatedCount, 1);
    assert.equal(report.body.data?.summary.stockMovementsCount, 2);
    assert.equal(report.body.data?.summary.fiscalDocumentsIssuedCount, 1);
    assert.equal(report.body.data?.users[0]?.userName, "Administrador de teste");
    assert.equal(report.body.data?.users[0]?.salesCount, 1);
    assert.equal(report.body.data?.users[0]?.quotesCreatedCount, 1);
    assert.equal(report.body.data?.users[0]?.stockMovementsCount, 2);
    assert.equal(report.body.data?.users[0]?.fiscalDocumentsIssuedCount, 1);
    assert.equal(report.body.data?.sales[0]?.saleNumber, sale.body.data?.saleNumber);
    assert.equal(report.body.data?.sales[0]?.clientName, client.body.data?.name);
    assert.equal(report.body.data?.sales[0]?.status, "COMPLETED");
    assert.equal(report.body.data?.sales[0]?.netAmount, "200.00");
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
    const linkedSaleReturnAfterFiscal = await request(
      `/sales/${sales.body.data?.[0]?.id}/returns`,
      {
        method: "POST",
        body: {
          saleItemId: sales.body.data?.[0]?.items[0]?.id,
          quantity: 1,
          reason: "Tentativa com fiscal ativo",
        },
      },
    );

    assert.equal(updatedProduct.body.data?.currentStock, "2.000");
    assert.equal(updatedProduct.body.data?.reservedStock, "0.000");
    assert.equal(updatedProduct.body.data?.availableStock, "2.000");
    assert.equal(saleMovement?.quantity, "-2.000");
    assert.equal(fiscalDocument.status, 201);
    assert.equal(fiscalDocument.body.data?.sourceType, "SHIPPING_ORDER");
    assert.equal(fiscalDocument.body.data?.sourceId, completed.body.data?.id);
    assert.equal(linkedSaleReturnAfterFiscal.status, 409);
    assert.equal(
      linkedSaleReturnAfterFiscal.body.message,
      "Cancele a NF-e antes de devolver itens desta venda.",
    );
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

    const quotePaymentMethod = await activePaymentMethod("BOLETO");
    const quote = await request<Quote>("/quotes", {
      method: "POST",
      body: {
        clientId: client.body.data?.id,
        paymentMethodId: quotePaymentMethod.id,
        discountPercentage: 10,
        items: [
          {
            productId: firstProduct.body.data?.id,
            quantity: 2,
            discountPercentage: 10,
          },
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
    assert.equal(completed.body.data?.totalAmount, "132.30");
    assert.equal(sales.body.data?.length, 1);
    assert.equal(sales.body.data?.[0]?.items.length, 2);
    assert.equal(sales.body.data?.[0]?.subtotalAmount, "147.00");
    assert.equal(sales.body.data?.[0]?.discountAmount, "14.70");
    assert.equal(sales.body.data?.[0]?.totalAmount, "132.30");
    assert.equal(
      sales.body.data?.[0]?.items[0]?.productName,
      "Filtro envio multi A",
    );
    assert.equal(sales.body.data?.[0]?.items[0]?.quantity, "2.000");
    assert.equal(sales.body.data?.[0]?.items[0]?.discountAmount, "8.00");
    assert.equal(sales.body.data?.[0]?.items[0]?.totalAmount, "72.00");
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

  it("completes a quoted shipping order directly as a sale", async () => {
    const product = await request<Product>("/products", {
      method: "POST",
      body: { name: "Filtro envio direto", salePrice: 90 },
    });
    const client = await request<Client>("/clients", {
      method: "POST",
      body: { personType: "PF", name: "Cliente envio direto" },
    });

    await request("/stock-adjustments", {
      method: "POST",
      body: {
        productId: product.body.data?.id,
        quantity: 2,
        reason: "Saldo para envio direto",
      },
    });

    const quotePaymentMethod = await activePaymentMethod("BOLETO");
    const quote = await request<Quote>("/quotes", {
      method: "POST",
      body: {
        clientId: client.body.data?.id,
        paymentMethodId: quotePaymentMethod.id,
        billingIssueDate: "2026-07-10",
        billingDueDate: "2026-07-25",
        items: [{ productId: product.body.data?.id, quantity: 1 }],
      },
    });
    const shippingOrder = await request<ShippingOrder>(
      `/quotes/${quote.body.data?.id}/shipping-order`,
      {
        method: "POST",
        body: {},
      },
    );

    await request("/cash-register/open", {
      method: "POST",
      body: { openingBalance: 0 },
    });

    const completed = await request<ShippingOrder>(
      `/shipping-orders/${shippingOrder.body.data?.id}/complete`,
      {
        method: "PATCH",
        body: {},
      },
    );
    const updatedProduct = await request<Product>(
      `/products/${product.body.data?.id}`,
    );
    const sales = await request<Sale[]>("/sales");

    assert.equal(completed.status, 200);
    assert.equal(completed.body.data?.status, "COMPLETED");
    assert.ok(completed.body.data?.saleId);
    assert.equal(updatedProduct.body.data?.currentStock, "1.000");
    assert.equal(updatedProduct.body.data?.reservedStock, "0.000");
    assert.equal(sales.body.data?.[0]?.totalAmount, "90.00");
    assert.equal(
      sales.body.data?.[0]?.paymentMethodName,
      quotePaymentMethod.name,
    );
    assert.ok(
      sales.body.data?.[0]?.billingIssueDate?.startsWith("2026-07-10"),
    );
    assert.ok(sales.body.data?.[0]?.billingDueDate?.startsWith("2026-07-25"));
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

    const quotePaymentMethod = await activePaymentMethod();
    const created = await request<Quote>("/quotes", {
      method: "POST",
      body: {
        clientId: client.body.data?.id,
        paymentMethodId: quotePaymentMethod.id,
        billingIssueDate: "2026-06-10",
        billingDueDate: "2026-06-25",
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
    assert.equal(created.body.data?.quoteNumber, 1);
    assert.equal(created.body.data?.status, "DRAFT");
    assert.equal(created.body.data?.clientName, "Cliente orcamento");
    assert.equal(created.body.data?.paymentMethodName, "PIX");
    assert.equal(created.body.data?.showBrand, false);
    assert.equal(created.body.data?.totalAmount, "170.00");
    assert.ok(created.body.data?.billingIssueDate?.startsWith("2026-06-10"));
    assert.ok(created.body.data?.billingDueDate?.startsWith("2026-06-25"));
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
    assert.equal(shown.body.data?.paymentMethodName, "PIX");
    assert.equal(shown.body.data?.showBrand, false);
    assert.ok(shown.body.data?.billingIssueDate?.startsWith("2026-06-10"));
    assert.ok(shown.body.data?.billingDueDate?.startsWith("2026-06-25"));
    assert.equal(shown.body.data?.shippingOrderId, null);
    assert.equal(shown.body.data?.shippingOrderStatus, null);
    assert.equal(listed.body.data?.length, 1);
    assert.equal(listed.body.data?.[0]?.paymentMethodName, "PIX");
    assert.equal(listed.body.data?.[0]?.showBrand, false);
    assert.ok(
      listed.body.data?.[0]?.billingIssueDate?.startsWith("2026-06-10"),
    );
    assert.ok(
      listed.body.data?.[0]?.billingDueDate?.startsWith("2026-06-25"),
    );
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
      "Este orçamento ja foi enviado para pedidos de envio.",
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
    const pix = await activePaymentMethod();
    const boleto = await activePaymentMethod("BOLETO");
    const created = await request<Quote>("/quotes", {
      method: "POST",
      body: {
        clientId: client.body.data?.id,
        paymentMethodId: pix.id,
        items: [{ productId: firstProduct.body.data?.id, quantity: 1 }],
      },
    });

    const updated = await request<Quote>(`/quotes/${created.body.data?.id}`, {
      method: "PUT",
      body: {
        clientId: client.body.data?.id,
        paymentMethodId: boleto.id,
        billingIssueDate: "2026-07-01",
        billingDueDate: "2026-07-20",
        validUntil: "2026-07-15",
        notes: "Orcamento revisado pelo cliente",
        showBrand: false,
        discountPercentage: 10,
        items: [
          {
            productId: secondProduct.body.data?.id,
            quantity: 2,
            unitPrice: 85,
            discountPercentage: 5,
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
          paymentMethodId: pix.id,
          items: [{ productId: firstProduct.body.data?.id, quantity: 1 }],
        },
      },
    );

    assert.equal(updated.status, 200);
    assert.equal(updated.body.data?.id, created.body.data?.id);
    assert.equal(updated.body.data?.paymentMethodName, "Boleto");
    assert.equal(updated.body.data?.subtotalAmount, "170.00");
    assert.equal(updated.body.data?.discountPercentage, "10.00");
    assert.equal(updated.body.data?.discountAmount, "16.15");
    assert.equal(updated.body.data?.totalAmount, "145.35");
    assert.equal(updated.body.data?.showBrand, false);
    assert.ok(updated.body.data?.billingIssueDate?.startsWith("2026-07-01"));
    assert.ok(updated.body.data?.billingDueDate?.startsWith("2026-07-20"));
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
    assert.equal(updated.body.data?.items[0]?.discountPercentage, "5.00");
    assert.equal(updated.body.data?.items[0]?.discountAmount, "8.50");
    assert.equal(updated.body.data?.items[0]?.totalAmount, "161.50");
    assert.equal(shown.body.data?.totalAmount, "145.35");
    assert.ok(shown.body.data?.billingIssueDate?.startsWith("2026-07-01"));
    assert.ok(shown.body.data?.billingDueDate?.startsWith("2026-07-20"));
    assert.equal(shown.body.data?.items.length, 1);
    assert.equal(updateAfterShippingOrder.status, 409);
    assert.equal(
      updateAfterShippingOrder.body.message,
      "Orçamento enviado para pedido de envio deve seguir o fluxo do pedido.",
    );
  });

  it("stores boleto installments for a quote", async () => {
    const product = await request<Product>("/products", {
      method: "POST",
      body: { name: "Filtro quote boleto parcelado", salePrice: 100 },
    });
    const client = await request<Client>("/clients", {
      method: "POST",
      body: { personType: "PF", name: "Cliente boleto parcelado" },
    });
    const boleto = await activePaymentMethod("BOLETO");

    const created = await request<Quote>("/quotes", {
      method: "POST",
      body: {
        clientId: client.body.data?.id,
        paymentMethodId: boleto.id,
        billingIssueDate: "2026-08-06",
        billingDueDate: "2026-09-06",
        paymentInstallments: [
          { position: 1, dueDate: "2026-09-06", amount: 50 },
          { position: 2, dueDate: "2026-10-06", amount: 50 },
        ],
        items: [{ productId: product.body.data?.id, quantity: 1 }],
      },
    });
    const shown = await request<Quote>(`/quotes/${created.body.data?.id}`);

    assert.equal(created.status, 201);
    assert.equal(created.body.data?.paymentMethodName, "Boleto");
    assert.equal(created.body.data?.paymentInstallments.length, 2);
    assert.equal(created.body.data?.paymentInstallments[0]?.position, 1);
    assert.ok(
      created.body.data?.paymentInstallments[0]?.dueDate.startsWith(
        "2026-09-06",
      ),
    );
    assert.equal(created.body.data?.paymentInstallments[0]?.amount, "50.00");
    assert.equal(shown.body.data?.paymentInstallments.length, 2);
    assert.equal(shown.body.data?.paymentInstallments[1]?.position, 2);
    assert.equal(shown.body.data?.paymentInstallments[1]?.amount, "50.00");
  });

  it("keeps multiple quote payments and boleto installments when completing a quoted shipping order", async () => {
    const product = await request<Product>("/products", {
      method: "POST",
      body: { name: "Filtro quote pagamentos multiplos", salePrice: 100 },
    });
    const client = await request<Client>("/clients", {
      method: "POST",
      body: { personType: "PF", name: "Cliente quote pagamento misto" },
    });
    const boleto = await activePaymentMethod("BOLETO");
    const credit = await activePaymentMethod("CREDIT");

    await request("/stock-adjustments", {
      method: "POST",
      body: {
        productId: product.body.data?.id,
        quantity: 2,
        reason: "Saldo inicial para quote pagamentos multiplos",
      },
    });
    await request("/cash-register/open", {
      method: "POST",
      body: { openingBalance: 0 },
    });

    const quote = await request<Quote>("/quotes", {
      method: "POST",
      body: {
        clientId: client.body.data?.id,
        paymentMethodId: boleto.id,
        payments: [
          { paymentMethodId: boleto.id, amount: 40, position: 1 },
          { paymentMethodId: credit.id, amount: 60, position: 2 },
        ],
        paymentInstallments: [
          { position: 1, dueDate: "2026-09-01", amount: 40 },
        ],
        billingIssueDate: "2026-08-01",
        billingDueDate: "2026-09-01",
        items: [{ productId: product.body.data?.id, quantity: 1 }],
      },
    });
    const shippingOrder = await request<ShippingOrder>(
      `/quotes/${quote.body.data?.id}/shipping-order`,
      {
        method: "POST",
        body: {},
      },
    );
    const completed = await request<ShippingOrder>(
      `/shipping-orders/${shippingOrder.body.data?.id}/complete`,
      {
        method: "PATCH",
        body: {},
      },
    );
    const sales = await request<Sale[]>("/sales");
    const linkedSale = sales.body.data?.find(
      (sale) => sale.id === completed.body.data?.saleId,
    );

    assert.equal(quote.status, 201);
    assert.equal(quote.body.data?.payments.length, 2);
    assert.equal(quote.body.data?.paymentInstallments[0]?.amount, "40.00");
    assert.deepEqual(
      quote.body.data?.payments.map((payment) => payment.amount),
      ["40.00", "60.00"],
    );
    assert.equal(shippingOrder.body.data?.payments.length, 2);
    assert.equal(completed.status, 200);
    assert.equal(linkedSale?.payments.length, 2);
    assert.equal(linkedSale?.paymentInstallments[0]?.amount, "40.00");
    assert.deepEqual(
      linkedSale?.payments.map((payment) => payment.amount),
      ["40.00", "60.00"],
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
    const quotePaymentMethod = await activePaymentMethod();
    const draft = await request<Quote>("/quotes", {
      method: "POST",
      body: {
        clientId: client.body.data?.id,
        paymentMethodId: quotePaymentMethod.id,
        items: [{ productId: product.body.data?.id, quantity: 1 }],
      },
    });
    const sentQuote = await request<Quote>("/quotes", {
      method: "POST",
      body: {
        clientId: client.body.data?.id,
        paymentMethodId: quotePaymentMethod.id,
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
      "Este orçamento ja foi cancelado.",
    );
    assert.equal(shippingOrderAfterCancellation.status, 409);
    assert.equal(
      shippingOrderAfterCancellation.body.message,
      "Orçamento cancelado nao pode gerar pedido de envio.",
    );
    assert.equal(cancellationAfterShippingOrder.status, 409);
    assert.equal(
      cancellationAfterShippingOrder.body.message,
      "Orçamento enviado para pedido de envio deve seguir o fluxo do pedido.",
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

    const quotePaymentMethod = await activePaymentMethod();
    const withoutItems = await request("/quotes", {
      method: "POST",
      body: {
        clientId: client.body.data?.id,
        paymentMethodId: quotePaymentMethod.id,
        items: [],
      },
    });
    const inactiveProduct = await request("/quotes", {
      method: "POST",
      body: {
        clientId: client.body.data?.id,
        paymentMethodId: quotePaymentMethod.id,
        items: [{ productId: product.body.data?.id, quantity: 1 }],
      },
    });
    const invalidBillingDates = await request("/quotes", {
      method: "POST",
      body: {
        clientId: client.body.data?.id,
        paymentMethodId: quotePaymentMethod.id,
        billingIssueDate: "2026-07-10",
        billingDueDate: "2026-07-09",
        items: [{ productId: product.body.data?.id, quantity: 1 }],
      },
    });

    assert.equal(withoutItems.status, 422);
    assert.equal(withoutItems.body.errors?.[0]?.field, "items");
    assert.equal(invalidBillingDates.status, 422);
    assert.equal(
      invalidBillingDates.body.errors?.[0]?.message,
      "Vencimento nao pode ser anterior a data da fatura.",
    );
    assert.equal(inactiveProduct.status, 422);
    assert.equal(
      inactiveProduct.body.message,
      "Um ou mais produtos informados nao estao disponiveis para orçamento.",
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
    assert.equal(blockedQuote.body.message, "Quantidade indisponivel para este orçamento.");
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
    const created = await request<Supplier>("/suppliers", {
      method: "POST",
      body: {
        name: "Distribuidora Central",
        document: "12345678000190",
        email: "comercial@example.com",
        phone: "85999990000",
      },
    });

    const listed = await request<Supplier[]>("/suppliers?search=Central");

    assert.equal(created.status, 201);
    assert.equal(created.body.data?.branchId, defaultBranchId);
    assert.equal(created.body.data?.branchName, "Matriz Teste");
    assert.equal(created.body.data?.name, "Distribuidora Central");
    assert.equal(listed.status, 200);
    assert.equal(listed.body.data?.length, 1);
  });

  it("keeps suppliers scoped to the active branch", async () => {
    const branch = await request<Branch>("/branches", {
      method: "POST",
      body: {
        name: "Filial Fornecedores Isolada",
        code: "FORNECEDORES",
      },
    });
    assert.ok(branch.body.data?.id);

    const defaultSupplier = await request<Supplier>("/suppliers", {
      method: "POST",
      body: {
        name: "Fornecedor Matriz",
        document: "11111111000111",
      },
    });
    const isolatedSupplier = await request<Supplier>("/suppliers", {
      method: "POST",
      headers: { "x-active-branch-id": branch.body.data.id },
      body: {
        name: "Fornecedor Filial",
        document: "22222222000122",
      },
    });
    const defaultList = await request<Supplier[]>("/suppliers");
    const isolatedList = await request<Supplier[]>("/suppliers", {
      headers: { "x-active-branch-id": branch.body.data.id },
    });

    assert.equal(defaultSupplier.status, 201);
    assert.equal(defaultSupplier.body.data?.branchId, defaultBranchId);
    assert.equal(isolatedSupplier.status, 201);
    assert.equal(isolatedSupplier.body.data?.branchId, branch.body.data.id);
    assert.deepEqual(
      defaultList.body.data?.map((supplier) => supplier.name),
      ["Fornecedor Matriz"],
    );
    assert.deepEqual(
      isolatedList.body.data?.map((supplier) => supplier.name),
      ["Fornecedor Filial"],
    );
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
      ["CASH", "PIX", "DEBIT", "CREDIT", "BOLETO"],
    );
    assert.equal(deactivated.status, 200);
    assert.equal(deactivated.body.data?.active, false);
    assert.deepEqual(
      active.body.data?.map((paymentMethod) => paymentMethod.code),
      ["CASH", "PIX", "CREDIT", "BOLETO"],
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
    assert.equal(created.body.data?.branchId, defaultBranchId);
    assert.equal(created.body.data?.branchName, "Matriz Teste");
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

  it("normalizes individual clients as non ICMS taxpayers", async () => {
    const created = await request<Client>("/clients", {
      method: "POST",
      body: {
        personType: "PF",
        name: "Cliente pessoa fisica",
        document: "12345678900",
        stateRegistration: "123456789",
        stateRegistrationIndicator: "1",
      },
    });

    assert.equal(created.status, 201);
    assert.equal(created.body.data?.personType, "PF");
    assert.equal(created.body.data?.stateRegistration, null);
    assert.equal(created.body.data?.stateRegistrationIndicator, "9");
  });

  it("keeps clients scoped to the active branch", async () => {
    const branch = await request<Branch>("/branches", {
      method: "POST",
      body: {
        name: "Filial Clientes Isolada",
        code: "CLIENTES",
      },
    });
    assert.ok(branch.body.data?.id);

    const defaultClient = await request<Client>("/clients", {
      method: "POST",
      body: {
        personType: "PF",
        name: "Cliente Matriz",
        document: "11122233344",
      },
    });
    const isolatedClient = await request<Client>("/clients", {
      method: "POST",
      headers: { "x-active-branch-id": branch.body.data.id },
      body: {
        personType: "PF",
        name: "Cliente Filial",
        document: "55566677788",
      },
    });
    const defaultList = await request<Client[]>("/clients");
    const isolatedList = await request<Client[]>("/clients", {
      headers: { "x-active-branch-id": branch.body.data.id },
    });
    const blockedUpdate = await request(
      `/clients/${defaultClient.body.data?.id}`,
      {
        method: "PUT",
        headers: { "x-active-branch-id": branch.body.data.id },
        body: {
          personType: "PF",
          name: "Cliente Matriz Alterado",
          document: "11122233344",
        },
      },
    );
    const blockedStatus = await request(
      `/clients/${defaultClient.body.data?.id}/status`,
      {
        method: "PATCH",
        headers: { "x-active-branch-id": branch.body.data.id },
        body: { active: false },
      },
    );

    assert.equal(defaultClient.status, 201);
    assert.equal(defaultClient.body.data?.branchId, defaultBranchId);
    assert.equal(isolatedClient.status, 201);
    assert.equal(isolatedClient.body.data?.branchId, branch.body.data.id);
    assert.deepEqual(
      defaultList.body.data?.map((client) => client.name),
      ["Cliente Matriz"],
    );
    assert.deepEqual(
      isolatedList.body.data?.map((client) => client.name),
      ["Cliente Filial"],
    );
    assert.equal(blockedUpdate.status, 404);
    assert.equal(blockedStatus.status, 404);
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

  it("looks up company fiscal data by CNPJ", async () => {
    const originalFetch = globalThis.fetch;

    globalThis.fetch = (async (input, init) => {
      const url = String(input);

      if (url.startsWith("https://brasilapi.com.br/api/cnpj/v1/")) {
        return new Response(
          JSON.stringify({
            bairro: "CENTRO",
            cep: "77800000",
            cnpj: "12345678000190",
            complemento: "SALA 10",
            ddd_telefone_1: "63999990000",
            email: "fiscal@cliente.com.br",
            logradouro: "AVENIDA COMERCIAL",
            municipio: "ARAGUAINA",
            numero: "100",
            razao_social: "CLIENTE TESTE LTDA",
            uf: "TO",
          }),
          { status: 200 },
        );
      }

      return originalFetch(input, init);
    }) as typeof fetch;

    try {
      const lookup = await request<Client>(
        `/clients/cnpj/${encodeURIComponent("12.345.678/0001-90")}`,
      );

      assert.equal(lookup.status, 200);
      assert.equal(lookup.body.data?.personType, "PJ");
      assert.equal(lookup.body.data?.name, "CLIENTE TESTE LTDA");
      assert.equal(lookup.body.data?.document, "12345678000190");
      assert.equal(lookup.body.data?.email, "fiscal@cliente.com.br");
      assert.equal(lookup.body.data?.phone, "63999990000");
      assert.equal(lookup.body.data?.stateRegistrationIndicator, "9");
      assert.equal(lookup.body.data?.addressStreet, "AVENIDA COMERCIAL");
      assert.equal(lookup.body.data?.addressNumber, "100");
      assert.equal(lookup.body.data?.addressComplement, "SALA 10");
      assert.equal(lookup.body.data?.addressDistrict, "CENTRO");
      assert.equal(lookup.body.data?.addressCity, "ARAGUAINA");
      assert.equal(lookup.body.data?.addressState, "TO");
      assert.equal(lookup.body.data?.addressZipCode, "77800000");
    } finally {
      globalThis.fetch = originalFetch;
    }
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
        accessoryExpenses: 1.5,
        otherExpenses: 2,
        salePrice: 29.9,
        profitMarginPercentage: 61.62,
        minimumStock: 3,
        currentStock: 4.5,
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
    const listedPage = await request<ProductListPage>(
      "/products?search=Wega&includeMeta=true&page=1&limit=1",
    );
    const shown = await request<Product>(`/products/${created.body.data?.id}`);
    const stockAdjustments = await request<StockAdjustment[]>(
      "/stock-adjustments",
    );
    const updated = await request<Product>(
      `/products/${created.body.data?.id}`,
      {
        method: "PUT",
        body: {
          name: "Filtro Wega FAP4040 Atualizado",
          accessoryExpenses: 3.75,
          salePrice: 31.9,
          profitMarginPercentage: 72.43,
          currentStock: 2.75,
          location: "",
        },
      },
    );
    const updatedStockAdjustments = await request<StockAdjustment[]>(
      "/stock-adjustments",
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
    assert.equal(created.body.data?.currentStock, "4.500");
    assert.equal(created.body.data?.reservedStock, "0.000");
    assert.equal(created.body.data?.availableStock, "4.500");
    assert.equal(created.body.data?.accessoryExpenses, "1.50");
    assert.equal(created.body.data?.otherExpenses, "2.00");
    assert.equal(created.body.data?.profitMarginPercentage, "61.62");
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
    assert.equal(listedPage.status, 200);
    assert.equal(listedPage.body.data?.total, 1);
    assert.equal(listedPage.body.data?.page, 1);
    assert.equal(listedPage.body.data?.limit, 1);
    assert.equal(listedPage.body.data?.items[0]?.id, created.body.data?.id);
    assert.equal(shown.status, 200);
    assert.equal(shown.body.data?.internalCode, "FAP4040");
    assert.equal(shown.body.data?.currentStock, "4.500");
    assert.equal(
      shown.body.data?.description,
      "Descricao comercial do filtro para orcamento",
    );
    assert.equal(stockAdjustments.status, 200);
    assert.equal(stockAdjustments.body.data?.[0]?.productName, "Filtro Wega FAP4040");
    assert.equal(stockAdjustments.body.data?.[0]?.quantity, "4.500");
    assert.equal(
      stockAdjustments.body.data?.[0]?.reason,
      "Estoque atual informado no cadastro do produto.",
    );
    assert.equal(updated.status, 200);
    assert.equal(updated.body.data?.name, "Filtro Wega FAP4040 Atualizado");
    assert.equal(updated.body.data?.accessoryExpenses, "3.75");
    assert.equal(updated.body.data?.profitMarginPercentage, "72.43");
    assert.equal(updated.body.data?.currentStock, "2.750");
    assert.equal(updated.body.data?.location, null);
    assert.equal(
      updatedStockAdjustments.body.data?.[0]?.productName,
      "Filtro Wega FAP4040 Atualizado",
    );
    assert.equal(updatedStockAdjustments.body.data?.[0]?.quantity, "-1.750");
    assert.equal(
      updatedStockAdjustments.body.data?.[0]?.reason,
      "Estoque atual corrigido na edicao do produto.",
    );
    assert.equal(deactivated.status, 200);
    assert.equal(deactivated.body.data?.active, false);
  });

  it("filters products by active admin branch context", async () => {
    const norte = await request<Branch>("/branches", {
      method: "POST",
      body: {
        name: "Filial Estoque Norte",
        code: "ESTOQUE_NORTE",
      },
    });
    const sul = await request<Branch>("/branches", {
      method: "POST",
      body: {
        name: "Filial Estoque Sul",
        code: "ESTOQUE_SUL",
      },
    });

    assert.ok(norte.body.data?.id);
    assert.ok(sul.body.data?.id);

    const northProduct = await request<Product>("/products", {
      method: "POST",
      headers: { "x-active-branch-id": norte.body.data.id },
      body: { name: "Filtro Norte" },
    });
    const southProduct = await request<Product>("/products", {
      method: "POST",
      headers: { "x-active-branch-id": sul.body.data.id },
      body: { name: "Filtro Sul" },
    });
    const missingBranch = await request<Product[]>("/products", {
      headers: { "x-active-branch-id": "" },
    });
    const northProducts = await request<Product[]>("/products", {
      headers: { "x-active-branch-id": norte.body.data.id },
    });

    assert.equal(northProduct.status, 201);
    assert.equal(northProduct.body.data?.branchName, "Filial Estoque Norte");
    assert.equal(southProduct.status, 201);
    assert.equal(southProduct.body.data?.branchName, "Filial Estoque Sul");
    assert.equal(missingBranch.status, 400);
    assert.equal(
      missingBranch.body.message,
      "Selecione uma filial ativa para operar.",
    );
    assert.equal(northProducts.body.data?.length, 1);
    assert.equal(northProducts.body.data?.[0]?.name, "Filtro Norte");
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
    const monitored = await request<Product>("/products", {
      method: "POST",
      body: { name: "Filtro monitorado", minimumStock: 5 },
    });
    const monitoredWithStock = await request<Product>("/products", {
      method: "POST",
      body: { name: "Filtro monitorado com estoque", minimumStock: 2 },
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
    await request("/stock-entries", {
      method: "POST",
      body: {
        productId: monitoredWithStock.body.data?.id,
        supplierId: supplier.body.data?.id,
        quantity: 5,
        unitCost: 10,
      },
    });
    await request(`/products/${inactive.body.data?.id}/status`, {
      method: "PATCH",
      body: { active: false },
    });
    const monitoredUpdate = await request<Product>(
      `/products/${monitored.body.data?.id}/replenishment-monitor`,
      {
        method: "PATCH",
        body: { enabled: true },
      },
    );
    const monitoredWithStockUpdate = await request<Product>(
      `/products/${monitoredWithStock.body.data?.id}/replenishment-monitor`,
      {
        method: "PATCH",
        body: { enabled: true },
      },
    );

    const response = await request<Product[]>("/products/low-stock");

    assert.equal(monitoredUpdate.status, 200);
    assert.equal(monitoredUpdate.body.data?.replenishmentMonitorEnabled, true);
    assert.equal(monitoredWithStockUpdate.status, 200);
    assert.equal(response.status, 200);
    assert.equal(response.body.data?.length, 3);
    assert.equal(response.body.data?.[0]?.id, monitored.body.data?.id);
    assert.equal(response.body.data?.[0]?.replenishmentMonitorEnabled, true);
    assert.equal(response.body.data?.[1]?.id, monitoredWithStock.body.data?.id);
    assert.equal(response.body.data?.[1]?.replenishmentMonitorEnabled, true);
    assert.equal(response.body.data?.[1]?.availableStock, "5.000");
    assert.equal(response.body.data?.[2]?.id, lowStock.body.data?.id);
    assert.equal(response.body.data?.[2]?.currentStock, "0.000");
    assert.equal(response.body.data?.[2]?.minimumStock, "5.000");
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

  it("keeps stock entries and adjustments scoped to the active branch", async () => {
    const branch = await request<Branch>("/branches", {
      method: "POST",
      body: {
        name: "Filial Estoque Isolado",
        code: "ESTOQUE_ISOLADO",
      },
    });
    const supplier = await request<NamedEntity>("/suppliers", {
      method: "POST",
      body: { name: "Fornecedor filial ativa" },
    });
    const product = await request<Product>("/products", {
      method: "POST",
      body: { name: "Filtro filial padrao" },
    });

    assert.ok(branch.body.data?.id);

    const blockedEntry = await request("/stock-entries", {
      method: "POST",
      headers: { "x-active-branch-id": branch.body.data.id },
      body: {
        productId: product.body.data?.id,
        supplierId: supplier.body.data?.id,
        quantity: 3,
        unitCost: 9,
      },
    });
    const createdEntry = await request<StockEntry>("/stock-entries", {
      method: "POST",
      body: {
        productId: product.body.data?.id,
        supplierId: supplier.body.data?.id,
        quantity: 5,
        unitCost: 12,
      },
    });
    const blockedAdjustment = await request("/stock-adjustments", {
      method: "POST",
      headers: { "x-active-branch-id": branch.body.data.id },
      body: {
        productId: product.body.data?.id,
        quantity: 1,
        reason: "Ajuste em filial incorreta",
      },
    });
    const createdAdjustment = await request<StockAdjustment>(
      "/stock-adjustments",
      {
        method: "POST",
        body: {
          productId: product.body.data?.id,
          quantity: 1,
          reason: "Ajuste em filial correta",
        },
      },
    );
    const defaultEntries = await request<StockEntry[]>("/stock-entries");
    const isolatedEntries = await request<StockEntry[]>("/stock-entries", {
      headers: { "x-active-branch-id": branch.body.data.id },
    });
    const defaultMovements =
      await request<StockMovement[]>("/stock-movements");
    const isolatedMovements = await request<StockMovement[]>(
      "/stock-movements",
      {
        headers: { "x-active-branch-id": branch.body.data.id },
      },
    );

    assert.equal(blockedEntry.status, 422);
    assert.equal(
      blockedEntry.body.message,
      "Produto informado nao pertence a filial ativa.",
    );
    assert.equal(createdEntry.status, 201);
    assert.equal(blockedAdjustment.status, 422);
    assert.equal(
      blockedAdjustment.body.message,
      "Produto informado nao pertence a filial ativa.",
    );
    assert.equal(createdAdjustment.status, 201);
    assert.equal(defaultEntries.body.data?.length, 1);
    assert.equal(isolatedEntries.body.data?.length, 0);
    assert.equal(defaultMovements.body.data?.length, 2);
    assert.equal(isolatedMovements.body.data?.length, 0);
  });

  it("keeps shipping orders and pickup reservations scoped to the active branch", async () => {
    const branch = await request<Branch>("/branches", {
      method: "POST",
      body: {
        name: "Filial Atendimento Isolado",
        code: "ATENDIMENTO_ISOLADO",
      },
    });
    const client = await request<Client>("/clients", {
      method: "POST",
      body: { personType: "PF", name: "Cliente atendimento filial" },
    });
    const isolatedClient = await request<Client>("/clients", {
      method: "POST",
      headers: { "x-active-branch-id": branch.body.data?.id ?? "" },
      body: { personType: "PF", name: "Cliente atendimento isolado" },
    });
    const product = await request<Product>("/products", {
      method: "POST",
      body: {
        name: "Filtro atendimento filial",
        salePrice: 120,
      },
    });

    assert.ok(branch.body.data?.id);

    const shippingOrder = await request<ShippingOrder>("/shipping-orders", {
      method: "POST",
      body: {
        clientId: client.body.data?.id,
        productId: product.body.data?.id,
        quantity: 1,
        allowInsufficientStock: true,
      },
    });
    const pickupReservation = await request<PickupReservation>(
      "/pickup-reservations",
      {
        method: "POST",
        body: {
          clientId: client.body.data?.id,
          items: [{ productId: product.body.data?.id, quantity: 1 }],
          allowInsufficientStock: true,
        },
      },
    );
    const blockedShippingOrder = await request("/shipping-orders", {
      method: "POST",
      headers: { "x-active-branch-id": branch.body.data.id },
      body: {
        clientId: isolatedClient.body.data?.id,
        productId: product.body.data?.id,
        quantity: 1,
        allowInsufficientStock: true,
      },
    });
    const blockedPickupReservation = await request("/pickup-reservations", {
      method: "POST",
      headers: { "x-active-branch-id": branch.body.data.id },
      body: {
        clientId: isolatedClient.body.data?.id,
        items: [{ productId: product.body.data?.id, quantity: 1 }],
        allowInsufficientStock: true,
      },
    });
    const defaultShippingOrders =
      await request<ShippingOrder[]>("/shipping-orders");
    const isolatedShippingOrders = await request<ShippingOrder[]>(
      "/shipping-orders",
      {
        headers: { "x-active-branch-id": branch.body.data.id },
      },
    );
    const defaultPickupReservations =
      await request<PickupReservation[]>("/pickup-reservations");
    const isolatedPickupReservations = await request<PickupReservation[]>(
      "/pickup-reservations",
      {
        headers: { "x-active-branch-id": branch.body.data.id },
      },
    );

    assert.equal(shippingOrder.status, 201, JSON.stringify(shippingOrder.body));
    assert.equal(shippingOrder.body.data?.branchName, "Matriz Teste");
    assert.equal(
      pickupReservation.status,
      201,
      JSON.stringify(pickupReservation.body),
    );
    assert.equal(pickupReservation.body.data?.branchName, "Matriz Teste");
    assert.equal(blockedShippingOrder.status, 422);
    assert.equal(
      blockedShippingOrder.body.message,
      "Produto informado nao disponivel para orçamento.",
    );
    assert.equal(blockedPickupReservation.status, 422);
    assert.equal(
      blockedPickupReservation.body.message,
      "Produto informado nao disponivel para reserva.",
    );
    assert.equal(defaultShippingOrders.body.data?.length, 1);
    assert.equal(isolatedShippingOrders.body.data?.length, 0);
    assert.equal(defaultPickupReservations.body.data?.length, 1);
    assert.equal(isolatedPickupReservations.body.data?.length, 0);
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

  it("parses a purchase invoice XML preview", async () => {
    const accessKey = "2".repeat(44);
    const parsed = await request<ParsedPurchaseInvoice>(
      "/purchase-invoices/parse-xml",
      {
        method: "POST",
        body: { xmlContent: purchaseInvoiceXml(accessKey) },
      },
    );
    const invalid = await request("/purchase-invoices/parse-xml", {
      method: "POST",
      body: { xmlContent: "<NFe><infNFe></infNFe></NFe>" },
    });

    assert.equal(parsed.status, 200);
    assert.equal(parsed.body.data?.accessKey, accessKey);
    assert.equal(parsed.body.data?.supplierName, "FORNECEDOR XML LTDA");
    assert.equal(parsed.body.data?.supplierDocument, "12345678000199");
    assert.equal(parsed.body.data?.number, "321");
    assert.equal(parsed.body.data?.series, "1");
    assert.equal(parsed.body.data?.issueDate, "2026-07-13");
    assert.equal(parsed.body.data?.totalAmount, 84.5);
    assert.equal(parsed.body.data?.transporterName, "TRANSPORTADORA XML LTDA");
    assert.equal(parsed.body.data?.transporterDocument, "99887766000155");
    assert.equal(parsed.body.data?.installments.length, 2);
    assert.equal(parsed.body.data?.installments[0]?.number, "001");
    assert.equal(parsed.body.data?.installments[0]?.dueDate, "2026-08-13");
    assert.equal(parsed.body.data?.installments[0]?.value, 42.25);
    assert.equal(parsed.body.data?.items.length, 2);
    assert.equal(parsed.body.data?.items[0]?.position, 1);
    assert.equal(parsed.body.data?.items[0]?.supplierProductCode, "FX-1");
    assert.equal(parsed.body.data?.items[0]?.description, "Filtro & oleo");
    assert.equal(parsed.body.data?.items[0]?.cest, "0100100");
    assert.equal(parsed.body.data?.items[0]?.quantity, 2);
    assert.equal(parsed.body.data?.items[0]?.unitCost, 21.25);
    assert.equal(parsed.body.data?.items[1]?.position, 2);
    assert.equal(invalid.status, 422);
    assert.equal(
      invalid.body.message,
      "XML de compra sem chave de acesso valida.",
    );
  });

  it("imports a purchase invoice directly from XML without posting stock", async () => {
    const accessKey = "3".repeat(44);

    const created = await request<PurchaseInvoice>(
      "/purchase-invoices/import-xml",
      {
        method: "POST",
        body: { xmlContent: purchaseInvoiceXml(accessKey) },
      },
    );
    const duplicated = await request("/purchase-invoices/import-xml", {
      method: "POST",
      body: { xmlContent: purchaseInvoiceXml(accessKey) },
    });
    const listed = await request<PurchaseInvoice[]>("/purchase-invoices");

    assert.equal(created.status, 201);
    assert.equal(created.body.data?.accessKey, accessKey);
    assert.equal(created.body.data?.supplierName, "FORNECEDOR XML LTDA");
    assert.equal(
      created.body.data?.createdByUserName,
      "Administrador de teste",
    );
    assert.equal(created.body.data?.totalAmount, "84.50");
    assert.equal(created.body.data?.transporterName, "TRANSPORTADORA XML LTDA");
    assert.equal(created.body.data?.installments.length, 2);
    assert.equal(created.body.data?.installments[1]?.value, "42.25");
    assert.equal(created.body.data?.items.length, 2);
    assert.equal(created.body.data?.items[0]?.productId, null);
    assert.equal(created.body.data?.items[0]?.description, "Filtro & oleo");
    assert.equal(created.body.data?.items[0]?.cest, "0100100");
    assert.equal(created.body.data?.items[1]?.totalAmount, "42.00");
    assert.equal(duplicated.status, 409);
    assert.equal(listed.body.data?.length, 1);
  });

  it("cancels an imported purchase invoice before stock posting", async () => {
    const created = await request<PurchaseInvoice>(
      "/purchase-invoices/import-xml",
      {
        method: "POST",
        body: { xmlContent: purchaseInvoiceXml("8".repeat(44)) },
      },
    );

    const cancelled = await request<PurchaseInvoice>(
      `/purchase-invoices/${created.body.data?.id}/cancel`,
      { method: "POST" },
    );
    const postCancelled = await request(
      `/purchase-invoices/${created.body.data?.id}/post`,
      { method: "POST" },
    );
    const listed = await request<PurchaseInvoice[]>("/purchase-invoices");

    assert.equal(cancelled.status, 200);
    assert.equal(cancelled.body.data?.status, "CANCELLED");
    assert.equal(postCancelled.status, 409);
    assert.ok(
      listed.body.data?.some(
        (invoice) =>
          invoice.id === created.body.data?.id && invoice.status === "CANCELLED",
      ),
    );
  });

  it("reviews an imported purchase invoice before posting stock", async () => {
    const product = await request<Product>("/products", {
      method: "POST",
      body: { name: "Filtro correto do XML", costPrice: 30 },
    });
    const accessKey = "4".repeat(44);
    const imported = await request<PurchaseInvoice>(
      "/purchase-invoices/import-xml",
      {
        method: "POST",
        body: { xmlContent: purchaseInvoiceXml(accessKey) },
      },
    );

    const reviewed = await request<PurchaseInvoice>(
      `/purchase-invoices/${imported.body.data?.id}`,
      {
        method: "PUT",
        body: {
          issueDate: "2026-07-13",
          number: "321",
          series: "1",
          supplierDocument: "12345678000199",
          supplierName: "FORNECEDOR XML LTDA",
          totalAmount: 84.5,
          transporterDocument: "11222333000144",
          transporterName: "TRANSPORTADORA REVISADA LTDA",
          installments: [
            {
              dueDate: "2026-08-13",
              number: "001",
              value: 50,
            },
            {
              dueDate: "2026-09-13",
              number: "002",
              value: 34.5,
            },
          ],
          items: [
            {
              cest: "0100100",
              cfop: "5102",
              description: "Filtro revisado",
              ncm: "84212300",
              position: 1,
              productId: product.body.data?.id,
              quantity: 2,
              supplierProductCode: "FX-1",
              totalAmount: 42.5,
              unit: "UN",
              unitCost: 21.25,
            },
            {
              cest: "0100200",
              cfop: "5102",
              description: "Filtro combustivel",
              ncm: "84212300",
              position: 2,
              quantity: 1,
              supplierProductCode: "FX-2",
              totalAmount: 42,
              unit: "UN",
              unitCost: 42,
            },
          ],
        },
      },
    );
    const listed = await request<PurchaseInvoice[]>("/purchase-invoices");
    const unchangedProduct = await request<Product>(
      `/products/${product.body.data?.id}`,
    );

    assert.equal(reviewed.status, 200);
    assert.equal(reviewed.body.data?.status, "IMPORTED");
    assert.equal(reviewed.body.data?.accessKey, accessKey);
    assert.equal(
      reviewed.body.data?.transporterName,
      "TRANSPORTADORA REVISADA LTDA",
    );
    assert.equal(reviewed.body.data?.installments.length, 2);
    assert.equal(reviewed.body.data?.installments[0]?.value, "50.00");
    assert.equal(reviewed.body.data?.items.length, 2);
    assert.equal(
      reviewed.body.data?.items[0]?.productName,
      "Filtro correto do XML",
    );
    assert.equal(reviewed.body.data?.items[0]?.description, "Filtro revisado");
    assert.equal(reviewed.body.data?.items[0]?.cest, "0100100");
    assert.equal(reviewed.body.data?.items[1]?.productId, null);
    assert.equal(
      listed.body.data?.[0]?.items[0]?.productId,
      product.body.data?.id,
    );
    assert.equal(
      listed.body.data?.[0]?.installments[1]?.dueDate,
      "2026-09-13",
    );
    assert.equal(unchangedProduct.body.data?.currentStock, "0.000");
    assert.equal(unchangedProduct.body.data?.costPrice, "30.00");
  });

  it("posts a reviewed purchase invoice to stock", async () => {
    const supplier = await request<NamedEntity>("/suppliers", {
      method: "POST",
      body: { name: "Fornecedor para XML" },
    });
    const firstProduct = await request<Product>("/products", {
      method: "POST",
      body: { name: "Filtro XML estoque A", costPrice: 10 },
    });
    const secondProduct = await request<Product>("/products", {
      method: "POST",
      body: { name: "Filtro XML estoque B", costPrice: 15 },
    });
    const imported = await request<PurchaseInvoice>(
      "/purchase-invoices/import-xml",
      {
        method: "POST",
        body: { xmlContent: purchaseInvoiceXml("5".repeat(44)) },
      },
    );
    const reviewed = await request<PurchaseInvoice>(
      `/purchase-invoices/${imported.body.data?.id}`,
      {
        method: "PUT",
        body: {
          issueDate: "2026-07-13",
          number: "321",
          series: "1",
          supplierDocument: "12345678000199",
          supplierId: supplier.body.data?.id,
          supplierName: "FORNECEDOR XML LTDA",
          totalAmount: 84.5,
          items: [
            {
              cest: "0100100",
              cfop: "5102",
              description: "Filtro XML estoque A",
              ncm: "84212300",
              position: 1,
              productId: firstProduct.body.data?.id,
              quantity: 2,
              supplierProductCode: "FX-1",
              totalAmount: 42.5,
              unit: "UN",
              unitCost: 21.25,
            },
            {
              cest: "0100200",
              cfop: "5102",
              description: "Filtro XML estoque B",
              ncm: "84212300",
              position: 2,
              productId: secondProduct.body.data?.id,
              quantity: 1,
              supplierProductCode: "FX-2",
              totalAmount: 42,
              unit: "UN",
              unitCost: 42,
            },
          ],
        },
      },
    );

    const posted = await request<PurchaseInvoice>(
      `/purchase-invoices/${reviewed.body.data?.id}/post`,
      { method: "POST" },
    );
    const firstUpdatedProduct = await request<Product>(
      `/products/${firstProduct.body.data?.id}`,
    );
    const secondUpdatedProduct = await request<Product>(
      `/products/${secondProduct.body.data?.id}`,
    );
    const entries = await request<StockEntry[]>("/stock-entries");
    const repost = await request(
      `/purchase-invoices/${reviewed.body.data?.id}/post`,
      { method: "POST" },
    );
    const cancelPosted = await request(
      `/purchase-invoices/${reviewed.body.data?.id}/cancel`,
      { method: "POST" },
    );

    assert.equal(posted.status, 200);
    assert.equal(posted.body.data?.status, "POSTED");
    assert.equal(firstUpdatedProduct.body.data?.currentStock, "2.000");
    assert.equal(firstUpdatedProduct.body.data?.costPrice, "21.25");
    assert.equal(secondUpdatedProduct.body.data?.currentStock, "1.000");
    assert.equal(secondUpdatedProduct.body.data?.costPrice, "42.00");
    assert.equal(entries.body.data?.length, 2);
    assert.equal(entries.body.data?.[0]?.supplierName, "Fornecedor para XML");
    assert.equal(repost.status, 409);
    assert.equal(cancelPosted.status, 409);
  });

  it("imports a structured purchase invoice without posting stock", async () => {
    const supplier = await request<NamedEntity>("/suppliers", {
      method: "POST",
      body: { name: "Fornecedor XML" },
    });
    const product = await request<Product>("/products", {
      method: "POST",
      body: { name: "Filtro XML", costPrice: 20 },
    });
    const accessKey = "1".repeat(44);

    const created = await request<PurchaseInvoice>("/purchase-invoices", {
      method: "POST",
      body: {
        accessKey,
        issueDate: "2026-07-13",
        number: "123",
        series: "1",
        supplierDocument: "12345678000199",
        supplierId: supplier.body.data?.id,
        supplierName: "Fornecedor XML",
        totalAmount: 42.5,
        xmlContent: "<nfe>teste</nfe>",
        items: [
          {
            cfop: "5102",
            description: "Filtro vindo do XML",
            ncm: "84212300",
            position: 1,
            productId: product.body.data?.id,
            quantity: 2,
            supplierProductCode: "FX-1",
            totalAmount: 42.5,
            unit: "UN",
            unitCost: 21.25,
          },
        ],
      },
    });
    const duplicated = await request("/purchase-invoices", {
      method: "POST",
      body: {
        accessKey,
        supplierName: "Fornecedor XML",
        totalAmount: 42.5,
        items: [
          {
            description: "Filtro vindo do XML",
            position: 1,
            quantity: 2,
            totalAmount: 42.5,
            unitCost: 21.25,
          },
        ],
      },
    });
    const listed = await request<PurchaseInvoice[]>("/purchase-invoices");
    const unchangedProduct = await request<Product>(
      `/products/${product.body.data?.id}`,
    );

    assert.equal(created.status, 201);
    assert.equal(created.body.data?.accessKey, accessKey);
    assert.equal(created.body.data?.status, "IMPORTED");
    assert.equal(created.body.data?.supplierName, "Fornecedor XML");
    assert.equal(
      created.body.data?.createdByUserName,
      "Administrador de teste",
    );
    assert.equal(created.body.data?.totalAmount, "42.50");
    assert.equal(created.body.data?.items[0]?.productName, "Filtro XML");
    assert.equal(created.body.data?.items[0]?.quantity, "2.000");
    assert.equal(created.body.data?.items[0]?.unitCost, "21.25");
    assert.equal(duplicated.status, 409);
    assert.equal(listed.status, 200);
    assert.equal(listed.body.data?.length, 1);
    assert.equal(listed.body.data?.[0]?.items.length, 1);
    assert.equal(unchangedProduct.body.data?.currentStock, "0.000");
    assert.equal(unchangedProduct.body.data?.costPrice, "20.00");
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

function purchaseInvoiceXml(accessKey: string) {
  return `
    <nfeProc>
      <NFe>
        <infNFe Id="NFe${accessKey}">
          <ide>
            <serie>1</serie>
            <nNF>321</nNF>
            <dhEmi>2026-07-13T08:30:00-03:00</dhEmi>
          </ide>
          <emit>
            <CNPJ>12345678000199</CNPJ>
            <xNome>FORNECEDOR XML LTDA</xNome>
          </emit>
          <det nItem="1">
            <prod>
              <cProd>FX-1</cProd>
              <xProd>Filtro &amp; oleo</xProd>
              <NCM>84212300</NCM>
              <CFOP>5102</CFOP>
              <uCom>UN</uCom>
              <qCom>2.0000</qCom>
              <vUnCom>21.2500</vUnCom>
              <vProd>42.50</vProd>
            </prod>
            <imposto>
              <ICMS>
                <ICMS00>
                  <CEST>0100100</CEST>
                </ICMS00>
              </ICMS>
            </imposto>
          </det>
          <det nItem="2">
            <prod>
              <cProd>FX-2</cProd>
              <xProd>Filtro combustivel</xProd>
              <NCM>84212300</NCM>
              <CFOP>5102</CFOP>
              <uCom>UN</uCom>
              <qCom>1.0000</qCom>
              <vUnCom>42.0000</vUnCom>
              <vProd>42.00</vProd>
            </prod>
          </det>
          <total>
            <ICMSTot>
              <vNF>84.50</vNF>
            </ICMSTot>
          </total>
          <transp>
            <transporta>
              <CNPJ>99887766000155</CNPJ>
              <xNome>TRANSPORTADORA XML LTDA</xNome>
            </transporta>
          </transp>
          <cobr>
            <dup>
              <nDup>001</nDup>
              <dVenc>2026-08-13</dVenc>
              <vDup>42.25</vDup>
            </dup>
            <dup>
              <nDup>002</nDup>
              <dVenc>2026-09-13</dVenc>
              <vDup>42.25</vDup>
            </dup>
          </cobr>
        </infNFe>
      </NFe>
    </nfeProc>
  `;
}

function testBrazilDate(date = new Date()) {
  const brazilOffsetHours = 3;

  return new Date(date.getTime() - brazilOffsetHours * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

function focusIssueRequest(): FiscalIssueRequest {
  return {
    reference: "SALEfocusprovidertest",
    documentType: "NFE",
    environment: "HOMOLOGATION",
    companyCnpj: "12345678000199",
    defaultNatureOperation: "Venda de mercadoria",
    additionalInformation: null,
    defaultSaleCfop: "5102",
    defaultIcmsCst: "102",
    defaultPisCst: "49",
    defaultCofinsCst: "49",
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
      paymentMethodCode: "PIX",
      paymentMethodName: "PIX",
      payments: [
        {
          paymentMethodCode: "PIX",
          paymentMethodName: "PIX",
          amount: "35.00",
        },
      ],
      paymentInstallments: [],
      totalAmount: "35.00",
      discountAmount: "0.00",
      billingIssueDate: null,
      billingDueDate: null,
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
          discountAmount: "0.00",
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

async function activePaymentMethod(code = "PIX") {
  const paymentMethods = await request<PaymentMethod[]>(
    "/payment-methods?active=true",
  );
  const paymentMethod = paymentMethods.body.data?.find(
    (currentPaymentMethod) => currentPaymentMethod.code === code,
  );

  assert.ok(paymentMethod);

  return paymentMethod;
}

async function request<T = unknown>(
  path: string,
  options: {
    method?: string;
    body?: unknown;
    authenticated?: boolean;
    cookie?: string;
    headers?: Record<string, string>;
  } = {},
) {
  const headers: Record<string, string> = {
    ...(defaultBranchId ? { "x-active-branch-id": defaultBranchId } : {}),
    ...options.headers,
  };

  if (options.body) {
    headers["content-type"] = "application/json";
  }

  if (options.cookie) {
    headers.cookie = options.cookie;
  }

  if (!options.cookie && options.authenticated !== false && authCookie) {
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
    headers?: Record<string, string>;
  } = {},
) {
  const headers: Record<string, string> = {
    ...(defaultBranchId ? { "x-active-branch-id": defaultBranchId } : {}),
    ...options.headers,
  };

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
    contentDisposition: response.headers.get("content-disposition"),
  };
}
