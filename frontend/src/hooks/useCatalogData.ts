import { useEffect, useMemo, useState } from "react";
import {
  apiGet,
  type ApiResult,
  type CashRegisterSession,
  type Client,
  type CommercialSettings,
  type FiscalDocument,
  type FiscalSettings,
  type NamedEntity,
  type PaymentMethod,
  type PickupReservation,
  type Product,
  type PurchaseInvoice,
  type Quote,
  type ReportsOverview,
  type Sale,
  type SalesReport,
  type ShippingOrder,
  type StockAdjustment,
  type StockEntry,
  type StockMovement,
  type Supplier,
} from "../api";
import type { LoadState } from "../navigation";

export function useCatalogData() {
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<NamedEntity[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [stockEntries, setStockEntries] = useState<StockEntry[]>([]);
  const [stockAdjustments, setStockAdjustments] = useState<StockAdjustment[]>(
    [],
  );
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [purchaseInvoices, setPurchaseInvoices] = useState<PurchaseInvoice[]>(
    [],
  );
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [cashRegister, setCashRegister] = useState<CashRegisterSession | null>(
    null,
  );
  const [reportsOverview, setReportsOverview] =
    useState<ReportsOverview | null>(null);
  const [salesReport, setSalesReport] = useState<SalesReport | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [fiscalDocuments, setFiscalDocuments] = useState<FiscalDocument[]>([]);
  const [fiscalSettings, setFiscalSettings] = useState<FiscalSettings | null>(
    null,
  );
  const [commercialSettings, setCommercialSettings] =
    useState<CommercialSettings | null>(null);
  const [shippingOrders, setShippingOrders] = useState<ShippingOrder[]>([]);
  const [pickupReservations, setPickupReservations] = useState<
    PickupReservation[]
  >([]);
  const [state, setState] = useState<LoadState>("idle");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");

  async function loadCatalog() {
    setState("loading");
    setMessage("");

    try {
      const [
        productsResult,
        brandsResult,
        clientsResult,
        suppliersResult,
        stockEntriesResult,
        stockAdjustmentsResult,
        stockMovementsResult,
        purchaseInvoicesResult,
        lowStockResult,
        paymentMethodsResult,
        cashRegisterResult,
        reportsOverviewResult,
        salesReportResult,
        quotesResult,
        salesResult,
        fiscalDocumentsResult,
        fiscalSettingsResult,
        commercialSettingsResult,
        shippingOrdersResult,
        pickupReservationsResult,
      ] = await Promise.all([
        fetchProductCatalog(),
        apiGet<ApiResult<NamedEntity[]>>("/brands"),
        apiGet<ApiResult<Client[]>>("/clients"),
        apiGet<ApiResult<Supplier[]>>("/suppliers"),
        apiGet<ApiResult<StockEntry[]>>("/stock-entries"),
        apiGet<ApiResult<StockAdjustment[]>>("/stock-adjustments"),
        apiGet<ApiResult<StockMovement[]>>("/stock-movements"),
        fetchPurchaseInvoices(),
        apiGet<ApiResult<Product[]>>("/products/low-stock"),
        apiGet<ApiResult<PaymentMethod[]>>("/payment-methods"),
        apiGet<ApiResult<CashRegisterSession | null>>("/cash-register/current"),
        apiGet<ApiResult<ReportsOverview>>("/reports/overview"),
        apiGet<ApiResult<SalesReport>>("/reports/sales"),
        apiGet<ApiResult<Quote[]>>("/quotes"),
        apiGet<ApiResult<Sale[]>>("/sales"),
        apiGet<ApiResult<FiscalDocument[]>>("/fiscal-documents"),
        apiGet<ApiResult<FiscalSettings>>("/fiscal-settings"),
        fetchCommercialSettings(),
        apiGet<ApiResult<ShippingOrder[]>>("/shipping-orders"),
        apiGet<ApiResult<PickupReservation[]>>("/pickup-reservations"),
      ]);

      setProducts(productsResult);
      setBrands(brandsResult.data);
      setClients(clientsResult.data);
      setSuppliers(suppliersResult.data);
      setStockEntries(stockEntriesResult.data);
      setStockAdjustments(stockAdjustmentsResult.data);
      setStockMovements(stockMovementsResult.data);
      setPurchaseInvoices(purchaseInvoicesResult.data);
      setLowStockProducts(lowStockResult.data);
      setPaymentMethods(paymentMethodsResult.data);
      setCashRegister(cashRegisterResult.data);
      setReportsOverview(reportsOverviewResult.data);
      setSalesReport(salesReportResult.data);
      setQuotes(quotesResult.data);
      setSales(salesResult.data);
      setFiscalDocuments(fiscalDocumentsResult.data);
      setFiscalSettings(fiscalSettingsResult.data);
      setCommercialSettings(commercialSettingsResult);
      setShippingOrders(shippingOrdersResult.data);
      setPickupReservations(pickupReservationsResult.data);
      setState("ready");
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Erro inesperado");
    }
  }

  async function loadSalesReport(filters: SalesReportFilters = {}) {
    setMessage("");

    try {
      const result = await apiGet<ApiResult<SalesReport>>(
        salesReportPath(filters),
      );

      setSalesReport(result.data);
      setState("ready");
      return true;
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Erro inesperado");
      return false;
    }
  }

  useEffect(() => {
    void loadCatalog();
  }, []);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) {
      return products;
    }

    return products.filter((product) => {
      return [
        product.name,
        product.internalCode,
        product.barcode,
        product.brandName,
        product.location,
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(term));
    });
  }, [products, search]);

  async function runAction(action: () => Promise<void>) {
    setMessage("");

    try {
      await action();
      setState("ready");
      setMessage("Registro salvo com sucesso.");
      return true;
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Erro inesperado");
      return false;
    }
  }

  return {
    brands,
    cashRegister,
    clients,
    commercialSettings,
    filteredProducts,
    fiscalDocuments,
    fiscalSettings,
    loadCatalog,
    lowStockProducts,
    message,
    paymentMethods,
    pickupReservations,
    products,
    purchaseInvoices,
    quotes,
    reportsOverview,
    runAction,
    sales,
    salesReport,
    loadSalesReport,
    search,
    setMessage,
    setSearch,
    shippingOrders,
    state,
    stockAdjustments,
    stockEntries,
    stockMovements,
    suppliers,
  };
}

type SalesReportFilters = {
  dateFrom?: string;
  dateTo?: string;
};

function salesReportPath(filters: SalesReportFilters) {
  const params = new URLSearchParams();

  if (filters.dateFrom) {
    params.set("dateFrom", filters.dateFrom);
  }

  if (filters.dateTo) {
    params.set("dateTo", filters.dateTo);
  }

  const query = params.toString();

  return query ? `/reports/sales?${query}` : "/reports/sales";
}

async function fetchProductCatalog() {
  const limit = 100;
  const products: Product[] = [];
  let page = 1;
  let hasNextPage = true;

  while (hasNextPage) {
    const result = await apiGet<ApiResult<Product[]>>(
      `/products?page=${page}&limit=${limit}`,
    );

    products.push(...result.data);
    hasNextPage = result.data.length === limit;
    page += 1;
  }

  return products;
}

async function fetchCommercialSettings() {
  try {
    const result = await apiGet<ApiResult<CommercialSettings>>(
      "/commercial-settings",
    );

    return result.data;
  } catch (error) {
    if (error instanceof Error && error.message.includes("Route not found")) {
      return null;
    }

    throw error;
  }
}

async function fetchPurchaseInvoices() {
  try {
    const result = await apiGet<ApiResult<PurchaseInvoice[]>>(
      "/purchase-invoices",
    );

    return result;
  } catch (error) {
    if (error instanceof Error && error.message.includes("Route not found")) {
      return { code: 200, status: "success", data: [] } as ApiResult<
        PurchaseInvoice[]
      >;
    }

    throw error;
  }
}
