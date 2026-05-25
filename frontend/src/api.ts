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
  ncm: string | null;
  cest: string | null;
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

export type StockEntry = {
  id: string;
  productId: string;
  productName: string;
  supplierId: string;
  supplierName: string;
  quantity: string;
  unitCost: string;
  notes: string | null;
  createdAt: string;
};

export type StockAdjustment = {
  id: string;
  productId: string;
  productName: string;
  quantity: string;
  reason: string;
  createdAt: string;
};

export type PaymentMethod = {
  id: string;
  code: string;
  name: string;
  active: boolean;
};

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`/api${path}`);
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

async function apiWrite<T>(path: string, method: "POST" | "PUT" | "PATCH", body: unknown): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  return parseResponse<T>(response);
}

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.message ?? "Erro ao comunicar com o backend");
  }

  return payload;
}
