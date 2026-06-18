export type ApiResult<T> = {
  code: number;
  status: "success";
  data: T;
};

export type Product = {
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

export type NamedEntity = {
  id: string;
  name: string;
  active: boolean;
};

export type Supplier = NamedEntity & {
  document: string | null;
  email: string | null;
  phone: string | null;
};

export type Client = NamedEntity & {
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
  type: "ENTRY" | "ADJUSTMENT" | "SALE" | "SALE_CANCEL";
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
  role: "ADMIN";
  active: boolean;
};

export type CashRegisterSession = {
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
  expectedClosingBalance: string;
  difference: string | null;
  paymentSummary: Array<{
    paymentMethodId: string;
    paymentMethodName: string;
    paymentMethodCode: string;
    amount: string;
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
  provider: "MOCK" | "FOCUS";
  environment: "HOMOLOGATION" | "PRODUCTION";
  companyCnpj: string | null;
  allowProduction: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ShippingOrder = {
  id: string;
  quoteId: string | null;
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
  clientId: string;
  clientName: string;
  clientPhone: string | null;
  clientDocument: string | null;
  clientEmail: string | null;
  status: "DRAFT" | "CANCELLED";
  showBrand: boolean;
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
    totalAmount: string;
    position: number;
  }>;
};

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`/api${path}`, {
    credentials: "same-origin",
  });
  return parseResponse<T>(response);
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

async function apiWrite<T>(
  path: string,
  method: "POST" | "PUT" | "PATCH",
  body: unknown,
): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method,
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  return parseResponse<T>(response);
}

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(errorMessage(payload));
  }

  return payload;
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
