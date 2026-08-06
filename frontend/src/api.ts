export type ApiResult<T> = {
  code: number;
  status: "success";
  data: T;
};

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, "") ?? "";

type UnauthorizedHandler = () => void;

let unauthorizedHandler: UnauthorizedHandler | undefined;
let activeBranchId: string | undefined;

const ignoredUnauthorizedPaths = [
  "/auth/login",
  "/auth/logout",
  "/auth/password",
  "/auth/session",
  "/auth/setup",
];

export function setUnauthorizedHandler(handler?: UnauthorizedHandler) {
  unauthorizedHandler = handler;
}

export function setActiveBranchHeader(branchId?: string | null) {
  activeBranchId = branchId ?? undefined;
}

export function apiUrl(path: string) {
  return apiBaseUrl ? `${apiBaseUrl}${path}` : `/api${path}`;
}

export type Product = {
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
  salePrice: string;
  profitMarginPercentage: string | null;
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

export type NamedEntity = {
  id: string;
  name: string;
  active: boolean;
};

export type Supplier = NamedEntity & {
  branchId: string | null;
  branchName: string | null;
  document: string | null;
  email: string | null;
  phone: string | null;
};

export type Client = NamedEntity & {
  branchId: string | null;
  branchName: string | null;
  personType: "PF" | "PJ" | "ES";
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
};

export type ClientCompanyLookup = {
  personType: "PJ";
  name: string;
  document: string;
  email: string | null;
  phone: string | null;
  stateRegistration: string | null;
  stateRegistrationIndicator: "9";
  addressStreet: string | null;
  addressNumber: string | null;
  addressComplement: string | null;
  addressDistrict: string | null;
  addressCity: string | null;
  addressState: string | null;
  addressZipCode: string | null;
};

export type StockEntry = {
  id: string;
  productId: string;
  productName: string;
  supplierId: string;
  supplierName: string;
  createdByUserName: string | null;
  quantity: string;
  unitCost: string;
  notes: string | null;
  createdAt: string;
};

export type StockAdjustment = {
  id: string;
  productId: string;
  productName: string;
  createdByUserName: string | null;
  quantity: string;
  reason: string;
  createdAt: string;
};

export type StockMovement = {
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
  createdAt: string;
};

export type PurchaseInvoiceItemDraft = {
  cfop: string | null;
  description: string;
  ncm: string | null;
  position: number;
  productId?: string | null;
  quantity: number;
  supplierProductCode: string | null;
  totalAmount: number;
  unit: string | null;
  unitCost: number;
};

export type PurchaseInvoiceDraft = {
  accessKey: string;
  createSupplierFromXml?: boolean;
  installments?: Array<{
    dueDate: string | null;
    number: string | null;
    value: number;
  }>;
  issueDate?: string | null;
  items: PurchaseInvoiceItemDraft[];
  number?: string | null;
  series?: string | null;
  supplierDocument?: string | null;
  supplierId?: string | null;
  supplierName: string;
  totalAmount: number;
  transporterDocument?: string | null;
  transporterName?: string | null;
  xmlContent?: string | null;
};

export type PurchaseInvoice = {
  id: string;
  branchId: string | null;
  branchName: string | null;
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
    ncm: string | null;
    cfop: string | null;
    unit: string | null;
    quantity: string;
    unitCost: string;
    totalAmount: string;
  }>;
  createdAt: string;
  updatedAt: string;
};

export type PaymentMethod = {
  id: string;
  code: string;
  name: string;
  active: boolean;
};

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: "ADMIN" | "EMPLOYEE";
  branchId: string | null;
  branchName: string | null;
  active: boolean;
  permissions: EmployeePermission[];
  lastLoginAt?: string | null;
  mustChangePassword: boolean;
};

export type AuthEvent = {
  id: string;
  userId: string | null;
  email: string;
  eventType:
    | "SETUP_SUCCESS"
    | "LOGIN_SUCCESS"
    | "LOGIN_FAILURE"
    | "LOGOUT"
    | "PASSWORD_CHANGED"
    | "PASSWORD_RESET"
    | "EMPLOYEE_CREATED"
    | "EMPLOYEE_UPDATED"
    | "EMPLOYEE_STATUS_CHANGED";
  ipAddress: string | null;
  userAgent: string | null;
  reason: string | null;
  createdAt: string;
};

export type AuthEventPage = {
  items: AuthEvent[];
  pagination: {
    total: number;
    page: number;
    limit: number;
  };
};

export type EmployeePermission =
  | "MANAGE_COMMERCIAL_SETTINGS"
  | "IMPORT_PURCHASE_INVOICES"
  | "MANAGE_STOCK_ADJUSTMENTS"
  | "MANAGE_PAYMENT_METHODS"
  | "MANAGE_FISCAL_SETTINGS"
  | "MANAGE_FISCAL_DOCUMENTS"
  | "MANAGE_CASH_REGISTER"
  | "VIEW_REPORTS";

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

export type CashRegisterSession = {
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
    cashRegisterSessionId: string;
    type: "SUPPLY" | "WITHDRAWAL";
    amount: string;
    reason: string;
    createdByUserId: string;
    createdByUserName: string;
    createdAt: string;
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

export type ReportsOverview = {
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

export type Sale = {
  id: string;
  branchId: string | null;
  branchName: string | null;
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
  clientId: string | null;
  clientName: string | null;
  paymentMethodName: string;
  createdByUserName: string;
  createdAt: string;
  cancelledByUserName: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  status: "COMPLETED" | "CANCELLED";
};

export type FiscalDocument = {
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
  issuedByUserName: string;
  issuedAt: string | null;
  cancelledByUserName: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  createdAt: string;
};

export type FiscalSettings = {
  id: string;
  branchId: string | null;
  branchName: string | null;
  provider: "MOCK" | "FOCUS";
  environment: "HOMOLOGATION" | "PRODUCTION";
  companyCnpj: string | null;
  allowProduction: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CommercialSettings = {
  id: string;
  branchId: string | null;
  branchName: string | null;
  defaultProfitMarginPercentage: string;
  defaultQuoteDueDays: number;
  defaultQuoteValidityDays: number;
  createdAt: string;
  updatedAt: string;
};

export type SalesReport = {
  summary: {
    salesCount: number;
    itemsQuantity: string;
    grossAmount: string;
    discountAmount: string;
    netAmount: string;
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
};

export type StockReport = {
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

export type PurchaseReport = {
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

export type CashReport = {
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

export type ShippingOrder = {
  id: string;
  quoteId: string | null;
  branchId: string | null;
  branchName: string | null;
  clientId: string;
  clientName: string;
  clientPhone: string | null;
  productId: string;
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
  createdByUserName: string;
  createdAt: string;
  approvedByUserName: string | null;
  approvedAt: string | null;
  separatedByUserName: string | null;
  separatedAt: string | null;
  saleId: string | null;
  completedByUserName: string | null;
  completedAt: string | null;
  cancelledByUserName: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  status: "QUOTED" | "APPROVED" | "SEPARATED" | "CANCELLED" | "COMPLETED";
};

export type PickupReservation = {
  id: string;
  branchId: string | null;
  branchName: string | null;
  clientId: string;
  clientName: string;
  clientPhone: string | null;
  productId: string;
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
  createdByUserName: string;
  createdAt: string;
  saleId: string | null;
  completedByUserName: string | null;
  completedAt: string | null;
  cancelledByUserName: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  status: "RESERVED" | "CANCELLED" | "COMPLETED";
};

export type Quote = {
  id: string;
  branchId: string | null;
  branchName: string | null;
  clientId: string;
  clientName: string;
  clientPhone: string | null;
  clientDocument: string | null;
  clientEmail: string | null;
  paymentMethodId: string | null;
  paymentMethodName: string | null;
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
  createdByUserEmail: string;
  createdByUserPhone: string | null;
  createdAt: string;
  updatedAt: string;
  items: Array<{
    id: string;
    productId: string;
    productInternalCode: string | null;
    productName: string;
    productBrandName: string | null;
    productNcm: string | null;
    productAvailableStock: string;
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

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(apiUrl(path), {
    credentials: "include",
    headers: apiHeaders(),
  });
  return parseResponse<T>(response, path);
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  return apiWrite<T>(path, "POST", body);
}

export async function apiPut<T>(path: string, body: unknown): Promise<T> {
  return apiWrite<T>(path, "PUT", body);
}

export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  return apiWrite<T>(path, "PATCH", body);
}

export async function downloadApiFile(path: string, filename: string) {
  const response = await fetch(apiUrl(path), {
    credentials: "include",
    headers: apiHeaders(),
  });
  const file = await parseFileResponse(response, path);
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function apiWrite<T>(
  path: string,
  method: "POST" | "PUT" | "PATCH",
  body: unknown,
): Promise<T> {
  const response = await fetch(apiUrl(path), {
    method,
    credentials: "include",
    headers: apiHeaders({ "content-type": "application/json" }),
    body: JSON.stringify(body),
  });

  return parseResponse<T>(response, path);
}

function apiHeaders(extraHeaders: HeadersInit = {}) {
  return {
    ...extraHeaders,
    ...(activeBranchId ? { "x-active-branch-id": activeBranchId } : {}),
  };
}

async function parseResponse<T>(response: Response, path: string): Promise<T> {
  const payload = await response.json();

  if (!response.ok) {
    notifyUnauthorizedResponse(response, path);
    throw new Error(errorMessage(payload));
  }

  return payload;
}

async function parseFileResponse(
  response: Response,
  path: string,
): Promise<Blob> {
  if (response.ok) {
    return response.blob();
  }

  const payload = await response.json();
  notifyUnauthorizedResponse(response, path);
  throw new Error(errorMessage(payload));
}

function notifyUnauthorizedResponse(response: Response, path: string) {
  const shouldNotify =
    response.status === 401 &&
    !ignoredUnauthorizedPaths.some((ignoredPath) =>
      path.startsWith(ignoredPath),
    );

  if (!shouldNotify) {
    return;
  }

  unauthorizedHandler?.();
}

function errorMessage(payload: {
  message?: string;
  errors?: Array<{ message: string }>;
}) {
  const details = payload.errors?.map((error) => error.message).join(" ");
  return [payload.message ?? "Erro ao comunicar com o backend", details]
    .filter(Boolean)
    .join(" ");
}
