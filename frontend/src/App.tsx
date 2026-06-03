import {
  ArrowDownToLine,
  AlertTriangle,
  ArrowLeftRight,
  Banknote,
  CreditCard,
  Filter,
  List as ListIcon,
  LogOut,
  PackagePlus,
  RefreshCcw,
  SlidersHorizontal,
  Tags,
  Truck,
  UserRound,
  ShieldCheck,
  ShoppingCart,
  Send,
} from "lucide-react";
import IconButton from "@mui/material/IconButton";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  apiGet,
  apiPatch,
  apiPost,
  type ApiResult,
  type AuthUser,
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
} from "./api";
import { useAuth } from "./auth/AuthContext";
import { LoginPage } from "./auth/LoginPage";
import { AppMessage, ConfirmationDialog, Metric, NavButton, NavSection } from "./components/shell";
import { SecondaryButton } from "./components/ui";
import {
  findActiveNavSection,
  navSectionsStorageKey,
  navSectionViews,
  readInitialOpenNavSections,
  viewTitles,
  type LoadState,
  type NavSectionKey,
  type View,
} from "./navigation";
import { formatQuantity } from "./utils/format";
import { nullableFormValue } from "./utils/forms";
import { ClientsPage, NamedEntityPage, ProductForm, ProductsPage, SuppliersPage } from "./views/catalog/CatalogPages";
import { useCatalogActions } from "./views/catalog/useCatalogActions";
import { CashRegisterPage, PaymentMethodsPage } from "./views/finance/FinancePages";
import { useFinanceActions } from "./views/finance/useFinanceActions";
import { QuotesPage } from "./views/quotes/QuotesPage";
import { useQuoteActions } from "./views/quotes/useQuoteActions";
import { ReportsPage } from "./views/reports/ReportsPage";
import {
  PickupReservationsPage,
  SalesPage,
  ShippingOrdersPage,
  type PickupReservationDraftInput,
  type SaleDraftInput,
} from "./views/sales/SalesPages";
import {
  LowStockPage,
  StockAdjustmentsPage,
  StockEntriesPage,
  StockMovementsPage,
} from "./views/stock/StockPages";
import { useStockActions } from "./views/stock/useStockActions";

type ConfirmationState = {
  confirmLabel?: string;
  message: string;
  resolve: (confirmed: boolean) => void;
  title: string;
};

// Entrada da aplicacao: decide entre autenticacao/setup e area autenticada.
export function App() {
  const { loading, login, logout, requiresSetup, setup, user } = useAuth();

  if (loading) {
    return <div className="auth-loading">Validando sessao...</div>;
  }

  if (!user) {
    return <LoginPage requiresSetup={requiresSetup} onLogin={login} onSetup={setup} />;
  }

  return <AuthenticatedApp user={user} onLogout={() => void logout()} />;
}

// Shell autenticado: concentra estado compartilhado, carregamento e orquestracao das telas.
function AuthenticatedApp({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
  const [view, setView] = useState<View>("products");
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
  const [selectedProduct, setSelectedProduct] = useState<Product>();
  const [selectedClient, setSelectedClient] = useState<Client>();
  const [openNavSections, setOpenNavSections] =
    useState<Record<NavSectionKey, boolean>>(readInitialOpenNavSections);
  const [confirmation, setConfirmation] = useState<ConfirmationState | null>(null);

  // Carregamento dos dados usados pelas telas internas.
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

  useEffect(() => {
    window.localStorage.setItem(navSectionsStorageKey, JSON.stringify(openNavSections));
  }, [openNavSections]);

  useEffect(() => {
    const activeSection = findActiveNavSection(view);

    if (!activeSection) {
      return;
    }

    setOpenNavSections((current) => {
      if (current[activeSection]) {
        return current;
      }

      return { ...current, [activeSection]: true };
    });
  }, [view]);

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

  // Utilitarios de fluxo: mensagem global, confirmacao e execucao padronizada de acoes.
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

  function requestConfirmation(message: string, title = "Confirmar acao", confirmLabel = "Confirmar") {
    return new Promise<boolean>((resolve) => {
      setConfirmation({ confirmLabel, message, resolve, title });
    });
  }

  function closeConfirmation(confirmed: boolean) {
    confirmation?.resolve(confirmed);
    setConfirmation(null);
  }

  const catalogActions = useCatalogActions({
    loadCatalog,
    requestConfirmation,
    runAction,
    selectedClient,
    selectedProduct,
    setSelectedClient,
    setSelectedProduct,
    showEditProduct: () => setView("edit-product"),
    showProducts: () => setView("products"),
  });

  const stockActions = useStockActions({ loadCatalog, runAction });

  const financeActions = useFinanceActions({ loadCatalog, requestConfirmation, runAction });

  const quoteActions = useQuoteActions({
    loadCatalog,
    requestConfirmation,
    runAction,
    showShippingOrders: () => setView("shipping-orders"),
  });

  // Acoes de vendas, orcamentos, envio e retirada.
  async function createSale(input: SaleDraftInput) {
    return runAction(async () => {
      await apiPost("/sales", input);
      await loadCatalog();
    });
  }

  async function approveShippingOrder(order: ShippingOrder) {
    const orderQuantity = order.items.reduce((sum, item) => sum + Number(item.quantity), 0);

    if (
      !(await requestConfirmation(
        `Aprovar o pedido de ${order.clientName} e reservar ${formatQuantity(String(orderQuantity))} item(ns)?`,
        "Aprovar pedido?",
        "Aprovar e reservar",
      ))
    ) {
      return;
    }

    await runAction(async () => {
      await apiPatch(`/shipping-orders/${order.id}/approve`, {});
      await loadCatalog();
    });
  }

  async function cancelShippingOrder(event: FormEvent<HTMLFormElement>, order: ShippingOrder) {
    event.preventDefault();
    const formElement = event.currentTarget;

    if (
      !(await requestConfirmation(
        `Cancelar o pedido de ${order.clientName}? A reserva sera liberada, se existir.`,
        "Cancelar pedido?",
        "Cancelar pedido",
      ))
    ) {
      return;
    }

    const form = new FormData(formElement);

    await runAction(async () => {
      await apiPatch(`/shipping-orders/${order.id}/cancel`, {
        reason: String(form.get("shippingCancellationReason") ?? "").trim(),
      });
      await loadCatalog();
    });
  }

  async function separateShippingOrder(order: ShippingOrder) {
    if (
      !(await requestConfirmation(
        `Confirmar separacao do pedido de ${order.clientName}?`,
        "Confirmar separacao?",
        "Confirmar",
      ))
    ) {
      return;
    }

    await runAction(async () => {
      await apiPatch(`/shipping-orders/${order.id}/separate`, {});
      await loadCatalog();
    });
  }

  async function completeShippingOrder(event: FormEvent<HTMLFormElement>, order: ShippingOrder) {
    event.preventDefault();
    const formElement = event.currentTarget;

    if (
      !(await requestConfirmation(
        `Concluir o pedido de ${order.clientName} como venda e baixar o estoque?`,
        "Concluir venda?",
        "Concluir venda",
      ))
    ) {
      return;
    }

    const form = new FormData(formElement);

    await runAction(async () => {
      await apiPatch(`/shipping-orders/${order.id}/complete`, {
        paymentMethodId: String(form.get("shippingPaymentMethodId") ?? ""),
      });
      await loadCatalog();
    });
  }

  async function createPickupReservation(input: PickupReservationDraftInput) {
    return runAction(async () => {
      await apiPost("/pickup-reservations", input);
      await loadCatalog();
    });
  }

  async function cancelPickupReservation(event: FormEvent<HTMLFormElement>, reservation: PickupReservation) {
    event.preventDefault();
    const formElement = event.currentTarget;

    if (
      !(await requestConfirmation(
        `Cancelar a reserva de ${reservation.clientName}? O estoque reservado sera liberado.`,
        "Cancelar reserva?",
        "Cancelar reserva",
      ))
    ) {
      return;
    }

    const form = new FormData(formElement);

    await runAction(async () => {
      await apiPatch(`/pickup-reservations/${reservation.id}/cancel`, {
        reason: String(form.get("pickupCancellationReason") ?? "").trim(),
      });
      await loadCatalog();
    });
  }

  async function completePickupReservation(event: FormEvent<HTMLFormElement>, reservation: PickupReservation) {
    event.preventDefault();
    const formElement = event.currentTarget;

    if (
      !(await requestConfirmation(
        `Concluir a reserva de ${reservation.clientName} como venda e baixar o estoque?`,
        "Concluir retirada?",
        "Concluir venda",
      ))
    ) {
      return;
    }

    const form = new FormData(formElement);

    await runAction(async () => {
      await apiPatch(`/pickup-reservations/${reservation.id}/complete`, {
        paymentMethodId: String(form.get("pickupPaymentMethodId") ?? ""),
      });
      await loadCatalog();
    });
  }

  function toggleNavSection(section: NavSectionKey) {
    setOpenNavSections((current) => ({ ...current, [section]: !current[section] }));
  }

  function isNavSectionActive(section: NavSectionKey) {
    return navSectionViews[section].includes(view);
  }

  const activeTitle = viewTitles[view];

  // Layout principal: sidebar, topo, resumo e selecao da tela ativa.
  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <Filter size={28} />
          <div>
            <strong>Filtros MG</strong>
            <span>Operacao da filial</span>
          </div>
        </div>

        <nav className="nav-list" aria-label="Navegacao principal">
          <NavSection
            active={isNavSectionActive("products")}
            icon={<PackagePlus size={17} />}
            open={openNavSections.products}
            title="Produtos"
            onToggle={() => toggleNavSection("products")}
          >
            <NavButton active={view === "products"} icon={<ListIcon size={18} />} onClick={() => setView("products")}>
              Lista de produtos
            </NavButton>
            <NavButton
              active={view === "new-product"}
              icon={<PackagePlus size={18} />}
              onClick={() => {
                setSelectedProduct(undefined);
                setView("new-product");
              }}
            >
              Novo produto
            </NavButton>
          </NavSection>

          <NavSection
            active={isNavSectionActive("catalog")}
            icon={<Tags size={17} />}
            open={openNavSections.catalog}
            title="Cadastros"
            onToggle={() => toggleNavSection("catalog")}
          >
            <NavButton active={view === "brands"} icon={<Tags size={18} />} onClick={() => setView("brands")}>
              Fabricantes
            </NavButton>
            <NavButton active={view === "clients"} icon={<UserRound size={18} />} onClick={() => setView("clients")}>
              Clientes
            </NavButton>
          </NavSection>

          <NavSection
            active={isNavSectionActive("stock")}
            icon={<ArrowLeftRight size={17} />}
            open={openNavSections.stock}
            title="Estoque"
            onToggle={() => toggleNavSection("stock")}
          >
            <NavButton
              active={view === "stock-entries"}
              icon={<ArrowDownToLine size={18} />}
              onClick={() => setView("stock-entries")}
            >
              Entrada manual
            </NavButton>
            <NavButton
              active={view === "stock-adjustments"}
              icon={<SlidersHorizontal size={18} />}
              onClick={() => setView("stock-adjustments")}
            >
              Ajuste manual
            </NavButton>
            <NavButton
              active={view === "low-stock"}
              icon={<AlertTriangle size={18} />}
              onClick={() => setView("low-stock")}
            >
              Reposicao
            </NavButton>
            <NavButton
              active={view === "stock-movements"}
              icon={<ArrowLeftRight size={18} />}
              onClick={() => setView("stock-movements")}
            >
              Historico
            </NavButton>
          </NavSection>

          <NavSection
            active={isNavSectionActive("suppliers")}
            icon={<Truck size={17} />}
            open={openNavSections.suppliers}
            title="Fornecedores"
            onToggle={() => toggleNavSection("suppliers")}
          >
            <NavButton active={view === "suppliers"} icon={<Truck size={18} />} onClick={() => setView("suppliers")}>
              Cadastro
            </NavButton>
          </NavSection>

          <NavSection
            active={isNavSectionActive("finance")}
            icon={<CreditCard size={17} />}
            open={openNavSections.finance}
            title="Financeiro"
            onToggle={() => toggleNavSection("finance")}
          >
            <NavButton
              active={view === "payment-methods"}
              icon={<CreditCard size={18} />}
              onClick={() => setView("payment-methods")}
            >
              Formas de pagamento
            </NavButton>
          </NavSection>

          <NavSection
            active={isNavSectionActive("cash")}
            icon={<Banknote size={17} />}
            open={openNavSections.cash}
            title="Caixa"
            onToggle={() => toggleNavSection("cash")}
          >
            <NavButton
              active={view === "cash-register"}
              icon={<Banknote size={18} />}
              onClick={() => setView("cash-register")}
            >
              Abertura
            </NavButton>
          </NavSection>

          <NavSection
            active={isNavSectionActive("reports")}
            icon={<SlidersHorizontal size={17} />}
            open={openNavSections.reports}
            title="Relatorios"
            onToggle={() => toggleNavSection("reports")}
          >
            <NavButton
              active={view === "reports"}
              icon={<SlidersHorizontal size={18} />}
              onClick={() => setView("reports")}
            >
              Gerencial
            </NavButton>
          </NavSection>

          <NavSection
            active={isNavSectionActive("sales")}
            icon={<ShoppingCart size={17} />}
            open={openNavSections.sales}
            title="Vendas"
            onToggle={() => toggleNavSection("sales")}
          >
            <NavButton active={view === "quotes"} icon={<ListIcon size={18} />} onClick={() => setView("quotes")}>
              Orcamentos
            </NavButton>
            <NavButton active={view === "sales"} icon={<ShoppingCart size={18} />} onClick={() => setView("sales")}>
              Balcao
            </NavButton>
            <NavButton
              active={view === "shipping-orders"}
              icon={<Send size={18} />}
              onClick={() => setView("shipping-orders")}
            >
              Para envio
            </NavButton>
            <NavButton
              active={view === "pickup-reservations"}
              icon={<PackagePlus size={18} />}
              onClick={() => setView("pickup-reservations")}
            >
              Retirada
            </NavButton>
          </NavSection>
        </nav>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <h1>{activeTitle.title}</h1>
            <p>{activeTitle.description}</p>
          </div>
          <div className="topbar-actions">
            <button
              className={cashRegister ? "cash-status-button open" : "cash-status-button closed"}
              title="Ir para caixa"
              type="button"
              onClick={() => setView("cash-register")}
            >
              <Banknote size={17} />
              <span>Caixa</span>
              <strong>{cashRegister ? "Aberto" : "Fechado"}</strong>
            </button>
            <div className="signed-user">
              <ShieldCheck size={17} />
              <div>
                <strong>{user.name}</strong>
                <span>{user.email}</span>
              </div>
            </div>
            <IconButton color="success" onClick={() => void loadCatalog()} title="Atualizar">
              <RefreshCcw size={18} />
            </IconButton>
            <SecondaryButton icon={<LogOut size={17} />} type="button" onClick={onLogout}>
              Sair
            </SecondaryButton>
          </div>
        </header>

        {message ? (
          <AppMessage
            kind={state === "error" ? "error" : "success"}
            message={message}
            onClose={() => setMessage("")}
          />
        ) : null}

        <ConfirmationDialog
          confirmLabel={confirmation?.confirmLabel ?? "Confirmar"}
          message={confirmation?.message ?? ""}
          open={Boolean(confirmation)}
          title={confirmation?.title ?? "Confirmar acao"}
          onCancel={() => closeConfirmation(false)}
          onConfirm={() => closeConfirmation(true)}
        />

        <section className="summary-grid">
          <Metric
            active={view === "products"}
            icon={<PackagePlus size={18} />}
            label="Produtos"
            value={products.length}
            onClick={() => setView("products")}
          />
          <Metric
            active={view === "brands"}
            icon={<Tags size={18} />}
            label="Fabricantes"
            value={brands.length}
            onClick={() => setView("brands")}
          />
          <Metric
            active={view === "suppliers"}
            icon={<Truck size={18} />}
            label="Fornecedores"
            value={suppliers.length}
            onClick={() => setView("suppliers")}
          />
          <Metric
            active={view === "low-stock"}
            icon={<AlertTriangle size={18} />}
            label="Reposicao"
            value={lowStockProducts.length}
            onClick={() => setView("low-stock")}
          />
        </section>

        {view === "products" ? (
          <ProductsPage
            products={filteredProducts}
            search={search}
            state={state}
            onSearchChange={setSearch}
            onEdit={catalogActions.editProduct}
            onChangeStatus={(product) => void catalogActions.changeProductStatus(product)}
          />
        ) : null}

        {view === "new-product" ? (
          <ProductForm brands={brands} onSubmit={catalogActions.createProduct} submitLabel="Cadastrar produto" />
        ) : null}

        {view === "edit-product" && selectedProduct ? (
          <ProductForm
            key={selectedProduct.id}
            brands={brands}
            product={selectedProduct}
            onSubmit={catalogActions.updateProduct}
            onCancel={() => setView("products")}
            submitLabel="Salvar alteracoes"
          />
        ) : null}

        {view === "stock-entries" ? (
          <StockEntriesPage
            entries={stockEntries}
            products={products}
            suppliers={suppliers}
            onSubmit={stockActions.createStockEntry}
          />
        ) : null}

        {view === "stock-adjustments" ? (
          <StockAdjustmentsPage
            adjustments={stockAdjustments}
            products={products}
            onSubmit={stockActions.createStockAdjustment}
          />
        ) : null}

        {view === "low-stock" ? (
          <LowStockPage products={lowStockProducts} />
        ) : null}

        {view === "stock-movements" ? (
          <StockMovementsPage movements={stockMovements} />
        ) : null}

        {view === "payment-methods" ? (
          <PaymentMethodsPage
            paymentMethods={paymentMethods}
            onChangeStatus={(paymentMethod) => void financeActions.changePaymentMethodStatus(paymentMethod)}
          />
        ) : null}

        {view === "cash-register" ? (
          <CashRegisterPage
            session={cashRegister}
            user={user}
            onOpen={financeActions.openCashRegister}
            onClose={financeActions.closeCashRegister}
          />
        ) : null}

        {view === "reports" ? <ReportsPage overview={reportsOverview} /> : null}

        {view === "quotes" ? (
          <QuotesPage
            clients={clients}
            products={products}
            quotes={quotes}
            onSubmit={quoteActions.createQuote}
            onCreateShippingOrder={(quote) => void quoteActions.createShippingOrderFromQuote(quote)}
          />
        ) : null}

        {view === "sales" ? (
          <SalesPage
            cashRegister={cashRegister}
            clients={clients}
            paymentMethods={paymentMethods}
            products={products}
            sales={sales}
            onSubmit={createSale}
          />
        ) : null}

        {view === "shipping-orders" ? (
          <ShippingOrdersPage
            cashRegister={cashRegister}
            paymentMethods={paymentMethods}
            orders={shippingOrders}
            onOpenQuotes={() => setView("quotes")}
            onApprove={(order) => void approveShippingOrder(order)}
            onSeparate={(order) => void separateShippingOrder(order)}
            onComplete={(event, order) => void completeShippingOrder(event, order)}
            onCancel={(event, order) => void cancelShippingOrder(event, order)}
          />
        ) : null}

        {view === "pickup-reservations" ? (
          <PickupReservationsPage
            cashRegister={cashRegister}
            clients={clients}
            paymentMethods={paymentMethods}
            products={products}
            reservations={pickupReservations}
            onSubmit={createPickupReservation}
            onComplete={(event, reservation) => void completePickupReservation(event, reservation)}
            onCancel={(event, reservation) => void cancelPickupReservation(event, reservation)}
          />
        ) : null}

        {view === "brands" ? (
          <NamedEntityPage
            title="Fabricantes"
            fieldName="brandName"
            items={brands}
            onSubmit={(event) => void catalogActions.createNamedEntity(event, "/brands", "brandName")}
          />
        ) : null}

        {view === "clients" ? (
          <ClientsPage
            clients={clients}
            selectedClient={selectedClient}
            onSubmit={catalogActions.saveClient}
            onEdit={setSelectedClient}
            onCancel={() => setSelectedClient(undefined)}
            onChangeStatus={(client) => void catalogActions.changeClientStatus(client)}
          />
        ) : null}

        {view === "suppliers" ? (
          <SuppliersPage suppliers={suppliers} onSubmit={catalogActions.createSupplier} />
        ) : null}
      </section>
    </main>
  );
}
