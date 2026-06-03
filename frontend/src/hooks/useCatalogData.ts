import { useEffect, useMemo, useState } from "react";
import {
  apiGet,
  type ApiResult,
  type CashRegisterSession,
  type Client,
  type NamedEntity,
  type PaymentMethod,
  type PickupReservation,
  type Product,
  type Quote,
  type ReportsOverview,
  type Sale,
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
  const [stockAdjustments, setStockAdjustments] = useState<StockAdjustment[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [cashRegister, setCashRegister] = useState<CashRegisterSession | null>(null);
  const [reportsOverview, setReportsOverview] = useState<ReportsOverview | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [shippingOrders, setShippingOrders] = useState<ShippingOrder[]>([]);
  const [pickupReservations, setPickupReservations] = useState<PickupReservation[]>([]);
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
        lowStockResult,
        paymentMethodsResult,
        cashRegisterResult,
        reportsOverviewResult,
        quotesResult,
        salesResult,
        shippingOrdersResult,
        pickupReservationsResult,
      ] =
        await Promise.all([
          apiGet<ApiResult<Product[]>>("/products"),
          apiGet<ApiResult<NamedEntity[]>>("/brands"),
          apiGet<ApiResult<Client[]>>("/clients"),
          apiGet<ApiResult<Supplier[]>>("/suppliers"),
          apiGet<ApiResult<StockEntry[]>>("/stock-entries"),
          apiGet<ApiResult<StockAdjustment[]>>("/stock-adjustments"),
          apiGet<ApiResult<StockMovement[]>>("/stock-movements"),
          apiGet<ApiResult<Product[]>>("/products/low-stock"),
          apiGet<ApiResult<PaymentMethod[]>>("/payment-methods"),
          apiGet<ApiResult<CashRegisterSession | null>>("/cash-register/current"),
          apiGet<ApiResult<ReportsOverview>>("/reports/overview"),
          apiGet<ApiResult<Quote[]>>("/quotes"),
          apiGet<ApiResult<Sale[]>>("/sales"),
          apiGet<ApiResult<ShippingOrder[]>>("/shipping-orders"),
          apiGet<ApiResult<PickupReservation[]>>("/pickup-reservations"),
        ]);

      setProducts(productsResult.data);
      setBrands(brandsResult.data);
      setClients(clientsResult.data);
      setSuppliers(suppliersResult.data);
      setStockEntries(stockEntriesResult.data);
      setStockAdjustments(stockAdjustmentsResult.data);
      setStockMovements(stockMovementsResult.data);
      setLowStockProducts(lowStockResult.data);
      setPaymentMethods(paymentMethodsResult.data);
      setCashRegister(cashRegisterResult.data);
      setReportsOverview(reportsOverviewResult.data);
      setQuotes(quotesResult.data);
      setSales(salesResult.data);
      setShippingOrders(shippingOrdersResult.data);
      setPickupReservations(pickupReservationsResult.data);
      setState("ready");
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Erro inesperado");
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
      return [product.name, product.internalCode, product.barcode, product.brandName, product.location]
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
    filteredProducts,
    loadCatalog,
    lowStockProducts,
    message,
    paymentMethods,
    pickupReservations,
    products,
    quotes,
    reportsOverview,
    runAction,
    sales,
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
