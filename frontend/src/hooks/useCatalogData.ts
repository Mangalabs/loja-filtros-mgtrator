import { useEffect, useRef, useState } from "react";
import {
  apiGet,
  setActiveBranchHeader,
  type ApiResult,
  type AuthUser,
  type Branch,
  type CashReport,
  type CashRegisterSession,
  type CestOption,
  type Client,
  type CommercialSettings,
  type FiscalDocument,
  type FiscalSettings,
  type NamedEntity,
  type NcmOption,
  type PaymentMethod,
  type PickupReservation,
  type Product,
  type ProductPage,
  type PurchaseReport,
  type PurchaseInvoice,
  type Quote,
  type ReportsOverview,
  type Sale,
  type SalesReport,
  type ShippingOrder,
  type StockReport,
  type StockAdjustment,
  type StockEntry,
  type StockMovement,
  type Supplier,
} from "../api";
import type { LoadState } from "../navigation";
import { canAccessView } from "../navigation";

const defaultProductPage: ProductPage = {
  items: [],
  total: 0,
  page: 1,
  limit: 15,
  totalPages: 1,
};

export function useCatalogData(user: AuthUser, activeBranchId: string) {
  const [products, setProducts] = useState<Product[]>([]);
  const [productPage, setProductPage] =
    useState<ProductPage>(defaultProductPage);
  const [productPageIndex, setProductPageIndex] = useState(0);
  const [productRowsPerPage, setProductRowsPerPage] = useState(
    defaultProductPage.limit,
  );
  const [branches, setBranches] = useState<Branch[]>([]);
  const [brands, setBrands] = useState<NamedEntity[]>([]);
  const [cestOptions, setCestOptions] = useState<CestOption[]>([]);
  const [ncmOptions, setNcmOptions] = useState<NcmOption[]>([]);
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
  const [stockReport, setStockReport] = useState<StockReport | null>(null);
  const [purchaseReport, setPurchaseReport] = useState<PurchaseReport | null>(
    null,
  );
  const [cashReport, setCashReport] = useState<CashReport | null>(null);
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
  const searchRefreshReadyRef = useRef(false);

  async function loadCatalog() {
    setState("loading");
    setMessage("");

    try {
      const branchesResult = await fetchBranches(user);
      setBranches(branchesResult.data);

      if (requiresBranchSelection(user, activeBranchId)) {
        setState("ready");
        return;
      }

      const [
        productsResult,
        productPageResult,
        brandsResult,
        cestOptionsResult,
        ncmOptionsResult,
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
        stockReportResult,
        purchaseReportResult,
        cashReportResult,
        quotesResult,
        salesResult,
        fiscalDocumentsResult,
        fiscalSettingsResult,
        commercialSettingsResult,
        shippingOrdersResult,
        pickupReservationsResult,
      ] = await Promise.all([
        fetchProductCatalog(),
        fetchProductPage({
          limit: productRowsPerPage,
          page: productPageIndex + 1,
          search,
        }),
        apiGet<ApiResult<NamedEntity[]>>("/brands"),
        fetchCestOptions(),
        fetchNcmOptions(),
        apiGet<ApiResult<Client[]>>("/clients"),
        apiGet<ApiResult<Supplier[]>>("/suppliers"),
        apiGet<ApiResult<StockEntry[]>>("/stock-entries"),
        canAccessView(user, "stock-adjustments")
          ? apiGet<ApiResult<StockAdjustment[]>>("/stock-adjustments")
          : emptyResult<StockAdjustment[]>([]),
        apiGet<ApiResult<StockMovement[]>>("/stock-movements"),
        canAccessView(user, "purchase-invoices")
          ? fetchPurchaseInvoices()
          : emptyResult<PurchaseInvoice[]>([]),
        apiGet<ApiResult<Product[]>>("/products/low-stock"),
        apiGet<ApiResult<PaymentMethod[]>>("/payment-methods"),
        apiGet<ApiResult<CashRegisterSession | null>>("/cash-register/current"),
        apiGet<ApiResult<ReportsOverview>>("/reports/overview"),
        canAccessView(user, "reports")
          ? apiGet<ApiResult<SalesReport>>("/reports/sales")
          : emptyResult<SalesReport | null>(null),
        canAccessView(user, "reports")
          ? apiGet<ApiResult<StockReport>>("/reports/stock")
          : emptyResult<StockReport | null>(null),
        canAccessView(user, "reports")
          ? apiGet<ApiResult<PurchaseReport>>("/reports/purchases")
          : emptyResult<PurchaseReport | null>(null),
        canAccessView(user, "reports")
          ? apiGet<ApiResult<CashReport>>("/reports/cash")
          : emptyResult<CashReport | null>(null),
        apiGet<ApiResult<Quote[]>>("/quotes"),
        apiGet<ApiResult<Sale[]>>("/sales"),
        canAccessView(user, "fiscal-documents")
          ? apiGet<ApiResult<FiscalDocument[]>>("/fiscal-documents")
          : emptyResult<FiscalDocument[]>([]),
        canAccessView(user, "fiscal-settings")
          ? apiGet<ApiResult<FiscalSettings>>("/fiscal-settings")
          : emptyResult<FiscalSettings | null>(null),
        fetchCommercialSettings(),
        apiGet<ApiResult<ShippingOrder[]>>("/shipping-orders"),
        apiGet<ApiResult<PickupReservation[]>>("/pickup-reservations"),
      ]);

      setProducts(productsResult);
      setProductPage(productPageResult);
      setBrands(brandsResult.data);
      setCestOptions(cestOptionsResult.data);
      setNcmOptions(ncmOptionsResult.data);
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
      setStockReport(stockReportResult.data);
      setPurchaseReport(purchaseReportResult.data);
      setCashReport(cashReportResult.data);
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

  async function refreshQuoteFlow() {
    const [quotesResult, shippingOrdersResult] = await Promise.all([
      apiGet<ApiResult<Quote[]>>("/quotes"),
      apiGet<ApiResult<ShippingOrder[]>>("/shipping-orders"),
    ]);

    setQuotes(quotesResult.data);
    setShippingOrders(shippingOrdersResult.data);
  }

  async function refreshSalesFlow() {
    const [
      productsResult,
      productPageResult,
      lowStockResult,
      cashRegisterResult,
      reportsOverviewResult,
      salesResult,
      fiscalDocumentsResult,
      shippingOrdersResult,
      pickupReservationsResult,
    ] = await Promise.all([
      fetchProductCatalog(),
      fetchProductPage({
        limit: productRowsPerPage,
        page: productPageIndex + 1,
        search,
      }),
      apiGet<ApiResult<Product[]>>("/products/low-stock"),
      apiGet<ApiResult<CashRegisterSession | null>>("/cash-register/current"),
      apiGet<ApiResult<ReportsOverview>>("/reports/overview"),
      apiGet<ApiResult<Sale[]>>("/sales"),
      canAccessView(user, "fiscal-documents")
        ? apiGet<ApiResult<FiscalDocument[]>>("/fiscal-documents")
        : emptyResult<FiscalDocument[]>([]),
      apiGet<ApiResult<ShippingOrder[]>>("/shipping-orders"),
      apiGet<ApiResult<PickupReservation[]>>("/pickup-reservations"),
    ]);

    setProducts(productsResult);
    setProductPage(productPageResult);
    setLowStockProducts(lowStockResult.data);
    setCashRegister(cashRegisterResult.data);
    setReportsOverview(reportsOverviewResult.data);
    setSales(salesResult.data);
    setFiscalDocuments(fiscalDocumentsResult.data);
    setShippingOrders(shippingOrdersResult.data);
    setPickupReservations(pickupReservationsResult.data);
  }

  async function refreshStockFlow() {
    const [
      productsResult,
      productPageResult,
      suppliersResult,
      stockEntriesResult,
      stockAdjustmentsResult,
      stockMovementsResult,
      purchaseInvoicesResult,
      lowStockResult,
      reportsOverviewResult,
      stockReportResult,
      purchaseReportResult,
    ] = await Promise.all([
      fetchProductCatalog(),
      fetchProductPage({
        limit: productRowsPerPage,
        page: productPageIndex + 1,
        search,
      }),
      apiGet<ApiResult<Supplier[]>>("/suppliers"),
      apiGet<ApiResult<StockEntry[]>>("/stock-entries"),
      canAccessView(user, "stock-adjustments")
        ? apiGet<ApiResult<StockAdjustment[]>>("/stock-adjustments")
        : emptyResult<StockAdjustment[]>([]),
      apiGet<ApiResult<StockMovement[]>>("/stock-movements"),
      canAccessView(user, "purchase-invoices")
        ? fetchPurchaseInvoices()
        : emptyResult<PurchaseInvoice[]>([]),
      apiGet<ApiResult<Product[]>>("/products/low-stock"),
      apiGet<ApiResult<ReportsOverview>>("/reports/overview"),
      canAccessView(user, "reports")
        ? apiGet<ApiResult<StockReport>>("/reports/stock")
        : emptyResult<StockReport | null>(null),
      canAccessView(user, "reports")
        ? apiGet<ApiResult<PurchaseReport>>("/reports/purchases")
        : emptyResult<PurchaseReport | null>(null),
    ]);

    setProducts(productsResult);
    setProductPage(productPageResult);
    setSuppliers(suppliersResult.data);
    setStockEntries(stockEntriesResult.data);
    setStockAdjustments(stockAdjustmentsResult.data);
    setStockMovements(stockMovementsResult.data);
    setPurchaseInvoices(purchaseInvoicesResult.data);
    setLowStockProducts(lowStockResult.data);
    setReportsOverview(reportsOverviewResult.data);
    setStockReport(stockReportResult.data);
    setPurchaseReport(purchaseReportResult.data);
  }

  async function refreshReplenishmentFlow() {
    const [productsResult, productPageResult, lowStockResult] =
      await Promise.all([
        fetchProductCatalog(),
        fetchProductPage({
          limit: productRowsPerPage,
          page: productPageIndex + 1,
          search,
        }),
        apiGet<ApiResult<Product[]>>("/products/low-stock"),
      ]);

    setProducts(productsResult);
    setProductPage(productPageResult);
    setLowStockProducts(lowStockResult.data);
  }

  async function refreshCashFlow() {
    const [cashRegisterResult, reportsOverviewResult, cashReportResult] =
      await Promise.all([
        apiGet<ApiResult<CashRegisterSession | null>>(
          "/cash-register/current",
        ),
        apiGet<ApiResult<ReportsOverview>>("/reports/overview"),
        canAccessView(user, "reports")
          ? apiGet<ApiResult<CashReport>>("/reports/cash")
          : emptyResult<CashReport | null>(null),
      ]);

    setCashRegister(cashRegisterResult.data);
    setReportsOverview(reportsOverviewResult.data);
    setCashReport(cashReportResult.data);
  }

  async function refreshFiscalFlow() {
    const [
      fiscalDocumentsResult,
      fiscalSettingsResult,
      reportsOverviewResult,
    ] = await Promise.all([
      canAccessView(user, "fiscal-documents")
        ? apiGet<ApiResult<FiscalDocument[]>>("/fiscal-documents")
        : emptyResult<FiscalDocument[]>([]),
      canAccessView(user, "fiscal-settings")
        ? apiGet<ApiResult<FiscalSettings>>("/fiscal-settings")
        : emptyResult<FiscalSettings | null>(null),
      apiGet<ApiResult<ReportsOverview>>("/reports/overview"),
    ]);

    setFiscalDocuments(fiscalDocumentsResult.data);
    setFiscalSettings(fiscalSettingsResult.data);
    setReportsOverview(reportsOverviewResult.data);
  }

  async function refreshPaymentMethods() {
    const result = await apiGet<ApiResult<PaymentMethod[]>>(
      "/payment-methods",
    );

    setPaymentMethods(result.data);
  }

  async function refreshCatalogFlow() {
    const [
      productsResult,
      productPageResult,
      brandsResult,
      cestOptionsResult,
      ncmOptionsResult,
      clientsResult,
      suppliersResult,
      lowStockResult,
      reportsOverviewResult,
      commercialSettingsResult,
    ] = await Promise.all([
      fetchProductCatalog(),
      fetchProductPage({
        limit: productRowsPerPage,
        page: productPageIndex + 1,
        search,
      }),
      apiGet<ApiResult<NamedEntity[]>>("/brands"),
      fetchCestOptions(),
      fetchNcmOptions(),
      apiGet<ApiResult<Client[]>>("/clients"),
      apiGet<ApiResult<Supplier[]>>("/suppliers"),
      apiGet<ApiResult<Product[]>>("/products/low-stock"),
      apiGet<ApiResult<ReportsOverview>>("/reports/overview"),
      fetchCommercialSettings(),
    ]);

    setProducts(productsResult);
    setProductPage(productPageResult);
    setBrands(brandsResult.data);
    setCestOptions(cestOptionsResult.data);
    setNcmOptions(ncmOptionsResult.data);
    setClients(clientsResult.data);
    setSuppliers(suppliersResult.data);
    setLowStockProducts(lowStockResult.data);
    setReportsOverview(reportsOverviewResult.data);
    setCommercialSettings(commercialSettingsResult);
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

  async function loadStockReport(filters: ReportPeriodFilters = {}) {
    setMessage("");

    try {
      const result = await apiGet<ApiResult<StockReport>>(
        reportPath("/reports/stock", filters),
      );

      setStockReport(result.data);
      setState("ready");
      return true;
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Erro inesperado");
      return false;
    }
  }

  async function loadPurchaseReport(filters: ReportPeriodFilters = {}) {
    setMessage("");

    try {
      const result = await apiGet<ApiResult<PurchaseReport>>(
        reportPath("/reports/purchases", filters),
      );

      setPurchaseReport(result.data);
      setState("ready");
      return true;
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Erro inesperado");
      return false;
    }
  }

  async function loadCashReport(filters: ReportPeriodFilters = {}) {
    setMessage("");

    try {
      const result = await apiGet<ApiResult<CashReport>>(
        reportPath("/reports/cash", filters),
      );

      setCashReport(result.data);
      setState("ready");
      return true;
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Erro inesperado");
      return false;
    }
  }

  useEffect(() => {
    searchRefreshReadyRef.current = false;
    setActiveBranchHeader(activeBranchId);
    void loadCatalog();
  }, [activeBranchId, user.id]);

  useEffect(() => {
    if (requiresBranchSelection(user, activeBranchId)) {
      return;
    }

    if (!searchRefreshReadyRef.current) {
      searchRefreshReadyRef.current = true;
      return;
    }

    const timeout = window.setTimeout(() => {
      void changeProductPage(0, productRowsPerPage);
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [activeBranchId, search, user.role]);

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

  async function changeProductPage(pageIndex: number, rowsPerPage?: number) {
    const nextRowsPerPage = rowsPerPage ?? productRowsPerPage;

    setProductPageIndex(pageIndex);
    setProductRowsPerPage(nextRowsPerPage);

    try {
      setProductPage(
        await fetchProductPage({
          limit: nextRowsPerPage,
          page: pageIndex + 1,
          search,
        }),
      );
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Erro inesperado");
    }
  }

  return {
    brands,
    branches,
    cashRegister,
    cashReport,
    cestOptions,
    clients,
    commercialSettings,
    fiscalDocuments,
    fiscalSettings,
    loadCatalog,
    loadCashReport,
    lowStockProducts,
    loadPurchaseReport,
    loadStockReport,
    message,
    ncmOptions,
    paymentMethods,
    pickupReservations,
    productPage,
    productPageIndex,
    productRowsPerPage,
    products,
    purchaseReport,
    purchaseInvoices,
    quotes,
    refreshCatalogFlow,
    refreshCashFlow,
    refreshFiscalFlow,
    refreshPaymentMethods,
    refreshQuoteFlow,
    refreshReplenishmentFlow,
    refreshSalesFlow,
    refreshStockFlow,
    reportsOverview,
    runAction,
    sales,
    salesReport,
    loadSalesReport,
    search,
    setProductPage: changeProductPage,
    setMessage,
    setSearch,
    shippingOrders,
    state,
    stockAdjustments,
    stockEntries,
    stockMovements,
    stockReport,
    suppliers,
  };
}

type SalesReportFilters = ReportPeriodFilters;

type ReportPeriodFilters = {
  dateFrom?: string;
  dateTo?: string;
};

function salesReportPath(filters: SalesReportFilters) {
  return reportPath("/reports/sales", filters);
}

function reportPath(path: string, filters: ReportPeriodFilters) {
  const params = new URLSearchParams();

  if (filters.dateFrom) {
    params.set("dateFrom", filters.dateFrom);
  }

  if (filters.dateTo) {
    params.set("dateTo", filters.dateTo);
  }

  const query = params.toString();

  return query ? `${path}?${query}` : path;
}

async function fetchProductCatalog(search?: string) {
  const params = new URLSearchParams({
    limit: "100",
    page: "1",
  });
  const term = search?.trim();

  if (term) {
    params.set("search", term);
  }

  const result = await apiGet<ApiResult<Product[]>>(
    `/products?${params.toString()}`,
  );

  return result.data;
}

async function fetchProductPage({
  limit,
  page,
  search,
}: {
  limit: number;
  page: number;
  search?: string;
}) {
  const params = new URLSearchParams({
    includeMeta: "true",
    limit: String(limit),
    page: String(page),
  });
  const term = search?.trim();

  if (term) {
    params.set("search", term);
  }

  const result = await apiGet<ApiResult<ProductPage>>(
    `/products?${params.toString()}`,
  );

  return result.data;
}

async function fetchBranches(user: AuthUser) {
  if (user.role === "ADMIN") {
    return apiGet<ApiResult<Branch[]>>("/branches");
  }

  return emptyResult<Branch[]>(
    employeeBranches(user).map((branch) => ({
      id: branch.id,
      name: branch.name,
      code: null,
      legalName: null,
      tradeName: null,
      document: null,
      stateRegistration: null,
      addressStreet: null,
      addressNumber: null,
      addressComplement: null,
      addressDistrict: null,
      addressCity: null,
      addressState: null,
      addressZipCode: null,
      phone: null,
      email: null,
      active: true,
    })),
  );
}

function employeeBranches(user: AuthUser) {
  if (user.branches.length > 0) {
    return user.branches;
  }

  return user.branchId
    ? [{ id: user.branchId, name: user.branchName ?? "Filial vinculada" }]
    : [];
}

function requiresBranchSelection(_user: AuthUser, activeBranchId: string) {
  return !activeBranchId;
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

async function fetchNcmOptions() {
  try {
    return await apiGet<ApiResult<NcmOption[]>>("/fiscal/ncm-options");
  } catch (error) {
    if (error instanceof Error && error.message.includes("Route not found")) {
      return { code: 200, status: "success", data: [] } as ApiResult<
        NcmOption[]
      >;
    }

    throw error;
  }
}

async function fetchCestOptions() {
  try {
    return await apiGet<ApiResult<CestOption[]>>("/fiscal/cest-options");
  } catch (error) {
    if (error instanceof Error && error.message.includes("Route not found")) {
      return { code: 200, status: "success", data: [] } as ApiResult<
        CestOption[]
      >;
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

function emptyResult<T>(data: T): Promise<ApiResult<T>> {
  return Promise.resolve({
    code: 200,
    status: "success",
    data,
  });
}
