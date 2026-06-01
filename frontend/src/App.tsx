import {
  ArrowDownToLine,
  AlertTriangle,
  ArrowLeftRight,
  Banknote,
  ChevronDown,
  ChevronRight,
  CreditCard,
  Filter,
  List as ListIcon,
  LogOut,
  PackagePlus,
  Pencil,
  Plus,
  Power,
  PowerOff,
  RefreshCcw,
  SlidersHorizontal,
  Tags,
  Truck,
  UserRound,
  ShieldCheck,
  ShoppingCart,
  Send,
  X,
} from "lucide-react";
import ButtonBase from "@mui/material/ButtonBase";
import Collapse from "@mui/material/Collapse";
import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import {
  apiGet,
  apiPatch,
  apiPost,
  apiPut,
  type ApiResult,
  type AuthUser,
  type CashRegisterSession,
  type Client,
  type NamedEntity,
  type PaymentMethod,
  type Product,
  type Sale,
  type ShippingOrder,
  type StockAdjustment,
  type StockEntry,
  type StockMovement,
  type Supplier,
} from "./api";
import { useAuth } from "./auth/AuthContext";

type LoadState = "idle" | "loading" | "ready" | "error";
type View =
  | "products"
  | "new-product"
  | "edit-product"
  | "stock-entries"
  | "stock-adjustments"
  | "stock-movements"
  | "low-stock"
  | "payment-methods"
  | "cash-register"
  | "sales"
  | "shipping-orders"
  | "brands"
  | "clients"
  | "suppliers";
type NavSectionKey =
  | "products"
  | "catalog"
  | "stock"
  | "suppliers"
  | "finance"
  | "cash"
  | "sales";

const navSectionViews: Record<NavSectionKey, View[]> = {
  products: ["products", "new-product", "edit-product"],
  catalog: ["brands", "clients"],
  stock: ["stock-entries", "stock-adjustments", "stock-movements", "low-stock"],
  suppliers: ["suppliers"],
  finance: ["payment-methods"],
  cash: ["cash-register"],
  sales: ["sales", "shipping-orders"],
};

const initialOpenNavSections: Record<NavSectionKey, boolean> = {
  products: true,
  catalog: true,
  stock: true,
  suppliers: true,
  finance: true,
  cash: true,
  sales: true,
};
const navSectionsStorageKey = "loja-filtros.nav-sections";

function findActiveNavSection(view: View) {
  return (Object.keys(navSectionViews) as NavSectionKey[]).find((section) =>
    navSectionViews[section].includes(view),
  );
}

function readInitialOpenNavSections() {
  if (typeof window === "undefined") {
    return initialOpenNavSections;
  }

  const storedValue = window.localStorage.getItem(navSectionsStorageKey);

  if (!storedValue) {
    return initialOpenNavSections;
  }

  try {
    const parsedValue = JSON.parse(storedValue) as Partial<Record<NavSectionKey, boolean>>;

    return (Object.keys(initialOpenNavSections) as NavSectionKey[]).reduce(
      (sections, section) => ({
        ...sections,
        [section]: typeof parsedValue[section] === "boolean" ? parsedValue[section] : sections[section],
      }),
      { ...initialOpenNavSections },
    );
  } catch {
    return initialOpenNavSections;
  }
}

const viewTitles: Record<View, { title: string; description: string }> = {
  products: {
    title: "Produtos",
    description: "Consulte e acompanhe o catalogo da filial.",
  },
  "new-product": {
    title: "Novo produto",
    description: "Cadastre filtros com codigos, fabricante, locacao e dados fiscais.",
  },
  "edit-product": {
    title: "Editar produto",
    description: "Atualize os dados cadastrais do produto selecionado.",
  },
  "stock-entries": {
    title: "Entrada de mercadoria",
    description: "Registre produtos recebidos e atualize o estoque da filial.",
  },
  "stock-adjustments": {
    title: "Ajuste de estoque",
    description: "Corrija divergencias de saldo com motivo registrado.",
  },
  "stock-movements": {
    title: "Historico de estoque",
    description: "Acompanhe entradas e ajustes que alteraram o saldo da filial.",
  },
  "low-stock": {
    title: "Reposicao",
    description: "Consulte produtos ativos que atingiram o estoque minimo.",
  },
  "payment-methods": {
    title: "Formas de pagamento",
    description: "Configure as formas disponiveis para o futuro fechamento de vendas.",
  },
  "cash-register": {
    title: "Caixa",
    description: "Abra o caixa da filial antes de iniciar operacoes de venda.",
  },
  sales: {
    title: "Venda de balcao",
    description: "Registre a venda imediata de um produto com baixa de estoque.",
  },
  "shipping-orders": {
    title: "Pedidos para envio",
    description: "Registre orcamentos aprovados pelo cliente e separe os produtos para envio.",
  },
  brands: {
    title: "Fabricantes",
    description: "Cadastre os fabricantes usados no catalogo de produtos.",
  },
  clients: {
    title: "Clientes",
    description: "Cadastre clientes para reservas e futuros documentos fiscais.",
  },
  suppliers: {
    title: "Fornecedores",
    description: "Mantenha fornecedores disponiveis para compras e produtos.",
  },
};

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
  const [sales, setSales] = useState<Sale[]>([]);
  const [shippingOrders, setShippingOrders] = useState<ShippingOrder[]>([]);
  const [state, setState] = useState<LoadState>("idle");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product>();
  const [selectedClient, setSelectedClient] = useState<Client>();
  const [openNavSections, setOpenNavSections] =
    useState<Record<NavSectionKey, boolean>>(readInitialOpenNavSections);

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
        salesResult,
        shippingOrdersResult,
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
          apiGet<ApiResult<Sale[]>>("/sales"),
          apiGet<ApiResult<ShippingOrder[]>>("/shipping-orders"),
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
      setSales(salesResult.data);
      setShippingOrders(shippingOrdersResult.data);
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

  async function runAction(action: () => Promise<void>) {
    setMessage("");

    try {
      await action();
      setState("ready");
      setMessage("Registro salvo com sucesso.");
    } catch (error) {
      setState("error");
      setMessage(error instanceof Error ? error.message : "Erro inesperado");
    }
  }

  async function createNamedEntity(
    event: FormEvent<HTMLFormElement>,
    path: string,
    fieldName: string,
  ) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const name = String(form.get(fieldName) ?? "").trim();

    if (!name) {
      return;
    }

    await runAction(async () => {
      await apiPost(path, { name });
      formElement.reset();
      await loadCatalog();
    });
  }

  async function createSupplier(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    await runAction(async () => {
      await apiPost("/suppliers", {
        name: String(form.get("supplierName") ?? "").trim(),
        document: optionalFormValue(form, "supplierDocument"),
        phone: optionalFormValue(form, "supplierPhone"),
        email: optionalFormValue(form, "supplierEmail"),
      });

      formElement.reset();
      await loadCatalog();
    });
  }

  async function saveClient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const body = {
      personType: String(form.get("clientPersonType") ?? "PF"),
      name: String(form.get("clientName") ?? "").trim(),
      document: nullableFormValue(form, "clientDocument"),
      phone: nullableFormValue(form, "clientPhone"),
      email: nullableFormValue(form, "clientEmail"),
    };

    await runAction(async () => {
      if (selectedClient) {
        await apiPut(`/clients/${selectedClient.id}`, body);
      } else {
        await apiPost("/clients", body);
      }

      formElement.reset();
      setSelectedClient(undefined);
      await loadCatalog();
    });
  }

  async function createProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    await runAction(async () => {
      await apiPost("/products", {
        ...productFormBody(form),
      });

      formElement.reset();
      await loadCatalog();
      setView("products");
    });
  }

  async function updateProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedProduct) {
      return;
    }

    const form = new FormData(event.currentTarget);

    await runAction(async () => {
      await apiPut(`/products/${selectedProduct.id}`, productFormBody(form));
      await loadCatalog();
      setSelectedProduct(undefined);
      setView("products");
    });
  }

  async function createStockEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    await runAction(async () => {
      await apiPost("/stock-entries", {
        productId: String(form.get("entryProductId") ?? ""),
        supplierId: String(form.get("entrySupplierId") ?? ""),
        quantity: Number(form.get("entryQuantity")),
        unitCost: Number(form.get("entryUnitCost")),
        notes: nullableFormValue(form, "entryNotes"),
      });

      formElement.reset();
      await loadCatalog();
    });
  }

  async function createStockAdjustment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    await runAction(async () => {
      await apiPost("/stock-adjustments", {
        productId: String(form.get("adjustmentProductId") ?? ""),
        quantity: Number(form.get("adjustmentQuantity")),
        reason: String(form.get("adjustmentReason") ?? "").trim(),
      });

      formElement.reset();
      await loadCatalog();
    });
  }

  async function openCashRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    await runAction(async () => {
      await apiPost("/cash-register/open", {
        openingBalance: Number(form.get("openingBalance") || 0),
      });

      formElement.reset();
      await loadCatalog();
    });
  }

  async function closeCashRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    await runAction(async () => {
      await apiPatch("/cash-register/close", {
        closingBalance: Number(form.get("closingBalance") || 0),
      });

      formElement.reset();
      await loadCatalog();
    });
  }

  async function createSale(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    await runAction(async () => {
      await apiPost("/sales", {
        productId: String(form.get("saleProductId") ?? ""),
        clientId: nullableFormValue(form, "saleClientId"),
        paymentMethodId: String(form.get("salePaymentMethodId") ?? ""),
        quantity: Number(form.get("saleQuantity")),
      });

      formElement.reset();
      await loadCatalog();
    });
  }

  async function createShippingOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);

    await runAction(async () => {
      await apiPost("/shipping-orders", {
        clientId: String(form.get("shippingClientId") ?? ""),
        productId: String(form.get("shippingProductId") ?? ""),
        quantity: Number(form.get("shippingQuantity")),
      });

      formElement.reset();
      await loadCatalog();
    });
  }

  async function approveShippingOrder(order: ShippingOrder) {
    await runAction(async () => {
      await apiPatch(`/shipping-orders/${order.id}/approve`, {});
      await loadCatalog();
    });
  }

  async function cancelShippingOrder(event: FormEvent<HTMLFormElement>, order: ShippingOrder) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    await runAction(async () => {
      await apiPatch(`/shipping-orders/${order.id}/cancel`, {
        reason: String(form.get("shippingCancellationReason") ?? "").trim(),
      });
      await loadCatalog();
    });
  }

  async function separateShippingOrder(order: ShippingOrder) {
    await runAction(async () => {
      await apiPatch(`/shipping-orders/${order.id}/separate`, {});
      await loadCatalog();
    });
  }

  async function completeShippingOrder(event: FormEvent<HTMLFormElement>, order: ShippingOrder) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    await runAction(async () => {
      await apiPatch(`/shipping-orders/${order.id}/complete`, {
        paymentMethodId: String(form.get("shippingPaymentMethodId") ?? ""),
      });
      await loadCatalog();
    });
  }

  async function changeProductStatus(product: Product) {
    await runAction(async () => {
      await apiPatch(`/products/${product.id}/status`, { active: !product.active });
      await loadCatalog();
    });
  }

  async function changePaymentMethodStatus(paymentMethod: PaymentMethod) {
    await runAction(async () => {
      await apiPatch(`/payment-methods/${paymentMethod.id}/status`, {
        active: !paymentMethod.active,
      });
      await loadCatalog();
    });
  }

  async function changeClientStatus(client: Client) {
    await runAction(async () => {
      await apiPatch(`/clients/${client.id}/status`, { active: !client.active });
      await loadCatalog();
    });
  }

  function editProduct(product: Product) {
    setSelectedProduct(product);
    setView("edit-product");
  }

  function toggleNavSection(section: NavSectionKey) {
    setOpenNavSections((current) => ({ ...current, [section]: !current[section] }));
  }

  function isNavSectionActive(section: NavSectionKey) {
    return navSectionViews[section].includes(view);
  }

  const activeTitle = viewTitles[view];

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
            active={isNavSectionActive("sales")}
            icon={<ShoppingCart size={17} />}
            open={openNavSections.sales}
            title="Vendas"
            onToggle={() => toggleNavSection("sales")}
          >
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
            <div className="signed-user">
              <ShieldCheck size={17} />
              <div>
                <strong>{user.name}</strong>
                <span>{user.email}</span>
              </div>
            </div>
            <button className="icon-button" onClick={() => void loadCatalog()} title="Atualizar">
              <RefreshCcw size={18} />
            </button>
            <button className="secondary-button" type="button" onClick={onLogout}>
              <LogOut size={17} />
              Sair
            </button>
          </div>
        </header>

        {message ? <div className={state === "error" ? "alert" : "notice"}>{message}</div> : null}

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
            onEdit={editProduct}
            onChangeStatus={(product) => void changeProductStatus(product)}
          />
        ) : null}

        {view === "new-product" ? (
          <ProductForm brands={brands} onSubmit={createProduct} submitLabel="Cadastrar produto" />
        ) : null}

        {view === "edit-product" && selectedProduct ? (
          <ProductForm
            key={selectedProduct.id}
            brands={brands}
            product={selectedProduct}
            onSubmit={updateProduct}
            onCancel={() => setView("products")}
            submitLabel="Salvar alteracoes"
          />
        ) : null}

        {view === "stock-entries" ? (
          <StockEntriesPage
            entries={stockEntries}
            products={products}
            suppliers={suppliers}
            onSubmit={createStockEntry}
          />
        ) : null}

        {view === "stock-adjustments" ? (
          <StockAdjustmentsPage
            adjustments={stockAdjustments}
            products={products}
            onSubmit={createStockAdjustment}
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
            onChangeStatus={(paymentMethod) => void changePaymentMethodStatus(paymentMethod)}
          />
        ) : null}

        {view === "cash-register" ? (
          <CashRegisterPage
            session={cashRegister}
            user={user}
            onOpen={openCashRegister}
            onClose={closeCashRegister}
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
            clients={clients}
            cashRegister={cashRegister}
            paymentMethods={paymentMethods}
            products={products}
            orders={shippingOrders}
            onSubmit={createShippingOrder}
            onApprove={(order) => void approveShippingOrder(order)}
            onSeparate={(order) => void separateShippingOrder(order)}
            onComplete={(event, order) => void completeShippingOrder(event, order)}
            onCancel={(event, order) => void cancelShippingOrder(event, order)}
          />
        ) : null}

        {view === "brands" ? (
          <NamedEntityPage
            title="Fabricantes"
            fieldName="brandName"
            items={brands}
            onSubmit={(event) => void createNamedEntity(event, "/brands", "brandName")}
          />
        ) : null}

        {view === "clients" ? (
          <ClientsPage
            clients={clients}
            selectedClient={selectedClient}
            onSubmit={saveClient}
            onEdit={setSelectedClient}
            onCancel={() => setSelectedClient(undefined)}
            onChangeStatus={(client) => void changeClientStatus(client)}
          />
        ) : null}

        {view === "suppliers" ? (
          <SuppliersPage suppliers={suppliers} onSubmit={createSupplier} />
        ) : null}
      </section>
    </main>
  );
}

function LoginPage({
  requiresSetup,
  onLogin,
  onSetup,
}: {
  requiresSetup: boolean;
  onLogin: (credentials: { email: string; password: string }) => Promise<void>;
  onSetup: (input: { name: string; email: string; password: string }) => Promise<void>;
}) {
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const credentials = {
      email: String(form.get("email") ?? "").trim(),
      password: String(form.get("password") ?? ""),
    };

    setSubmitting(true);
    setMessage("");

    try {
      if (requiresSetup) {
        await onSetup({
          ...credentials,
          name: String(form.get("name") ?? "").trim(),
        });
      } else {
        await onLogin(credentials);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Erro inesperado");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-panel">
        <div className="login-brand">
          <Filter size={32} />
          <div>
            <strong>Filtros MG</strong>
            <span>Operacao da filial</span>
          </div>
        </div>
        <h1>{requiresSetup ? "Primeiro acesso" : "Entrar"}</h1>
        <p>
          {requiresSetup
            ? "Crie o administrador inicial para proteger a operacao."
            : "Informe seus dados para acessar o sistema."}
        </p>
        {message ? <div className="alert">{message}</div> : null}
        <form className="login-form" onSubmit={submit}>
          {requiresSetup ? <input name="name" placeholder="Nome do administrador" required /> : null}
          <input name="email" type="email" placeholder="Email" required />
          <input name="password" type="password" minLength={12} placeholder="Senha" required />
          <button className="primary-button" type="submit" disabled={submitting}>
            <ShieldCheck size={17} />
            {submitting ? "Aguarde..." : requiresSetup ? "Criar administrador" : "Entrar"}
          </button>
        </form>
        {requiresSetup ? <small>A senha deve conter pelo menos 12 caracteres.</small> : null}
      </section>
    </main>
  );
}

function NavSection({
  active,
  children,
  icon,
  open,
  title,
  onToggle,
}: {
  active: boolean;
  children: ReactNode;
  icon: ReactNode;
  open: boolean;
  title: string;
  onToggle: () => void;
}) {
  return (
    <div className="nav-section">
      <button
        aria-expanded={open}
        className={active ? "nav-section-trigger active" : "nav-section-trigger"}
        type="button"
        onClick={onToggle}
      >
        <span className="nav-section-title">
          {icon}
          {title}
        </span>
        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </button>
      <Collapse in={open} timeout="auto" unmountOnExit>
        <div className="nav-section-items">{children}</div>
      </Collapse>
    </div>
  );
}

function NavButton({
  active,
  children,
  icon,
  onClick,
}: {
  active: boolean;
  children: ReactNode;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      aria-current={active ? "page" : undefined}
      className={active ? "nav-item active" : "nav-item"}
      type="button"
      onClick={onClick}
    >
      {icon}
      {children}
    </button>
  );
}

function ProductsPage({
  products,
  search,
  state,
  onSearchChange,
  onEdit,
  onChangeStatus,
}: {
  products: Product[];
  search: string;
  state: LoadState;
  onSearchChange: (value: string) => void;
  onEdit: (product: Product) => void;
  onChangeStatus: (product: Product) => void;
}) {
  return (
    <div className="panel wide">
      <div className="panel-header">
        <div>
          <h2>Lista de produtos</h2>
          <span>{state === "loading" ? "Carregando..." : "Dados do backend"}</span>
        </div>
        <input
          className="search"
          placeholder="Buscar por nome, codigo, fabricante ou locacao"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </div>

      <ProductTable products={products} onEdit={onEdit} onChangeStatus={onChangeStatus} />
    </div>
  );
}

function ProductTable({
  products,
  onEdit,
  onChangeStatus,
}: {
  products: Product[];
  onEdit: (product: Product) => void;
  onChangeStatus: (product: Product) => void;
}) {
  return (
    <div className="table-shell">
      <table>
        <thead>
          <tr>
            <th>Produto</th>
            <th>Codigo</th>
            <th>Fabricante</th>
            <th>Un.</th>
            <th>Locacao</th>
            <th>Fisico</th>
            <th>Reservado</th>
            <th>Disponivel</th>
            <th>Venda</th>
            <th>Status</th>
            <th>Acoes</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id}>
              <td>{product.name}</td>
              <td>{product.internalCode ?? "-"}</td>
              <td>{product.brandName ?? "-"}</td>
              <td>{product.unit}</td>
              <td>{product.location ?? "-"}</td>
              <td>{formatQuantity(product.currentStock)}</td>
              <td>{formatQuantity(product.reservedStock)}</td>
              <td>{formatQuantity(product.availableStock)}</td>
              <td>R$ {product.salePrice}</td>
              <td>
                <span className={product.active ? "status-tag active" : "status-tag inactive"}>
                  {product.active ? "Ativo" : "Inativo"}
                </span>
              </td>
              <td>
                <div className="table-actions">
                  <button className="action-button" type="button" onClick={() => onEdit(product)}>
                    <Pencil size={15} />
                    Editar
                  </button>
                  <button className="action-button" type="button" onClick={() => onChangeStatus(product)}>
                    {product.active ? <PowerOff size={15} /> : <Power size={15} />}
                    {product.active ? "Inativar" : "Ativar"}
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {products.length === 0 ? (
            <tr>
              <td colSpan={11}>Nenhum produto encontrado.</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function ProductForm({
  brands,
  product,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  brands: NamedEntity[];
  product?: Product;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel?: () => void;
  submitLabel: string;
}) {
  return (
    <form className="panel form-panel single-column" onSubmit={onSubmit}>
      <div className="panel-header compact">
        <h2>{product ? "Editar produto" : "Dados do produto"}</h2>
        {product ? <Pencil size={18} /> : <PackagePlus size={18} />}
      </div>
      <input name="productName" placeholder="Nome do produto" defaultValue={product?.name} required />
      <div className="two-columns">
        <input name="internalCode" placeholder="Codigo interno" defaultValue={product?.internalCode ?? ""} />
        <input name="barcode" placeholder="Codigo de barras" defaultValue={product?.barcode ?? ""} />
      </div>
      <div className="two-columns">
        <select name="brandId" defaultValue={product?.brandId ?? ""}>
          <option value="">Fabricante</option>
          {brands.map((brand) => (
            <option key={brand.id} value={brand.id}>
              {brand.name}
            </option>
          ))}
        </select>
        <input name="location" placeholder="Locacao" defaultValue={product?.location ?? ""} />
      </div>
      <div className="three-columns">
        <select name="unit" defaultValue={product?.unit ?? "UN"}>
          <option value="UN">UN - Unidade</option>
          <option value="KIT">KIT - Kit</option>
          <option value="CJ">CJ - Conjunto</option>
        </select>
        <input name="costPrice" type="number" step="0.01" placeholder="Custo" defaultValue={product?.costPrice} />
        <input name="salePrice" type="number" step="0.01" placeholder="Venda" defaultValue={product?.salePrice} />
      </div>
      <div className="three-columns">
        <input name="minimumStock" type="number" step="0.001" placeholder="Estoque min." defaultValue={product?.minimumStock} />
        <input name="ncm" placeholder="NCM" defaultValue={product?.ncm ?? ""} />
        <input name="cest" placeholder="CEST" defaultValue={product?.cest ?? ""} />
      </div>
      <div className="form-actions">
        {onCancel ? (
          <button className="secondary-button" type="button" onClick={onCancel}>
            <X size={17} />
            Cancelar
          </button>
        ) : null}
        <button className="primary-button" type="submit">
          {product ? <Pencil size={17} /> : <Plus size={17} />}
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

function NamedEntityPage({
  title,
  fieldName,
  items,
  onSubmit,
}: {
  title: string;
  fieldName: string;
  items: NamedEntity[];
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section className="layout-grid">
      <form className="panel form-panel" onSubmit={onSubmit}>
        <div className="panel-header compact">
          <h2>Novo registro</h2>
          <Tags size={18} />
        </div>
        <input name={fieldName} placeholder="Nome" required />
        <button className="primary-button" type="submit">
          <Plus size={17} />
          Cadastrar
        </button>
      </form>

      <EntityList title={title} items={items} />
    </section>
  );
}

function EntityList({ title, items }: { title: string; items: NamedEntity[] }) {
  return (
    <div className="panel entity-list">
      <div className="panel-header compact">
        <h2>{title} cadastrados</h2>
        <span>{items.length} registros</span>
      </div>
      {items.map((item) => (
        <div className="entity-row" key={item.id}>
          <strong>{item.name}</strong>
          <span>{item.active ? "Ativo" : "Inativo"}</span>
        </div>
      ))}
      {items.length === 0 ? <p className="empty-text">Nenhum registro cadastrado.</p> : null}
    </div>
  );
}

function SuppliersPage({
  suppliers,
  onSubmit,
}: {
  suppliers: Supplier[];
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section className="layout-grid">
      <form className="panel form-panel" onSubmit={onSubmit}>
        <div className="panel-header compact">
          <h2>Novo fornecedor</h2>
          <Truck size={18} />
        </div>
        <input name="supplierName" placeholder="Nome" required />
        <input name="supplierDocument" placeholder="CPF/CNPJ" />
        <div className="two-columns">
          <input name="supplierPhone" placeholder="Telefone" />
          <input name="supplierEmail" type="email" placeholder="Email" />
        </div>
        <button className="primary-button" type="submit">
          <Plus size={17} />
          Cadastrar fornecedor
        </button>
      </form>

      <div className="panel wide">
        <div className="panel-header compact">
          <h2>Fornecedores cadastrados</h2>
          <span>{suppliers.length} registros</span>
        </div>
        <div className="table-shell">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Documento</th>
                <th>Telefone</th>
                <th>Email</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((supplier) => (
                <tr key={supplier.id}>
                  <td>{supplier.name}</td>
                  <td>{supplier.document ?? "-"}</td>
                  <td>{supplier.phone ?? "-"}</td>
                  <td>{supplier.email ?? "-"}</td>
                </tr>
              ))}
              {suppliers.length === 0 ? (
                <tr>
                  <td colSpan={4}>Nenhum fornecedor cadastrado.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function ClientsPage({
  clients,
  selectedClient,
  onSubmit,
  onEdit,
  onCancel,
  onChangeStatus,
}: {
  clients: Client[];
  selectedClient?: Client;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onEdit: (client: Client) => void;
  onCancel: () => void;
  onChangeStatus: (client: Client) => void;
}) {
  return (
    <section className="layout-grid">
      <form key={selectedClient?.id ?? "new"} className="panel form-panel" onSubmit={onSubmit}>
        <div className="panel-header compact">
          <h2>{selectedClient ? "Editar cliente" : "Novo cliente"}</h2>
          <UserRound size={18} />
        </div>
        <select name="clientPersonType" defaultValue={selectedClient?.personType ?? "PF"} required>
          <option value="PF">Pessoa fisica</option>
          <option value="PJ">Pessoa juridica</option>
          <option value="ES">Estrangeiro</option>
        </select>
        <input name="clientName" placeholder="Nome" defaultValue={selectedClient?.name} required />
        <input name="clientDocument" placeholder="CPF/CNPJ" defaultValue={selectedClient?.document ?? ""} />
        <div className="two-columns">
          <input name="clientPhone" placeholder="Telefone" defaultValue={selectedClient?.phone ?? ""} />
          <input
            name="clientEmail"
            type="email"
            placeholder="Email"
            defaultValue={selectedClient?.email ?? ""}
          />
        </div>
        <div className="form-actions">
          {selectedClient ? (
            <button className="secondary-button" type="button" onClick={onCancel}>
              Cancelar
            </button>
          ) : null}
          <button className="primary-button" type="submit">
            <Plus size={17} />
            {selectedClient ? "Salvar alteracoes" : "Cadastrar cliente"}
          </button>
        </div>
      </form>

      <div className="panel wide">
        <div className="panel-header compact">
          <h2>Clientes cadastrados</h2>
          <span>{clients.length} registros</span>
        </div>
        <div className="table-shell">
          <table>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Tipo</th>
                <th>Documento</th>
                <th>Telefone</th>
                <th>Status</th>
                <th>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.id}>
                  <td>{client.name}</td>
                  <td>{client.personType}</td>
                  <td>{client.document ?? "-"}</td>
                  <td>{client.phone ?? "-"}</td>
                  <td>
                    <span className={client.active ? "status-tag active" : "status-tag inactive"}>
                      {client.active ? "Ativo" : "Inativo"}
                    </span>
                  </td>
                  <td className="table-actions">
                    <button className="action-button" type="button" onClick={() => onEdit(client)}>
                      <Pencil size={14} /> Editar
                    </button>
                    <button className="action-button" type="button" onClick={() => onChangeStatus(client)}>
                      {client.active ? <PowerOff size={14} /> : <Power size={14} />}
                      {client.active ? " Inativar" : " Ativar"}
                    </button>
                  </td>
                </tr>
              ))}
              {clients.length === 0 ? (
                <tr>
                  <td colSpan={6}>Nenhum cliente cadastrado.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function StockEntriesPage({
  entries,
  products,
  suppliers,
  onSubmit,
}: {
  entries: StockEntry[];
  products: Product[];
  suppliers: Supplier[];
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section className="layout-grid stock-entry-layout">
      <form className="panel form-panel" onSubmit={onSubmit}>
        <div className="panel-header compact">
          <h2>Nova entrada</h2>
          <ArrowDownToLine size={18} />
        </div>
        <select name="entryProductId" defaultValue="" required>
          <option value="" disabled>
            Produto
          </option>
          {products.filter((product) => product.active).map((product) => (
            <option key={product.id} value={product.id}>
              {product.name} - estoque {formatQuantity(product.currentStock)}
            </option>
          ))}
        </select>
        <select name="entrySupplierId" defaultValue="" required>
          <option value="" disabled>
            Fornecedor
          </option>
          {suppliers.filter((supplier) => supplier.active).map((supplier) => (
            <option key={supplier.id} value={supplier.id}>
              {supplier.name}
            </option>
          ))}
        </select>
        <div className="two-columns">
          <input name="entryQuantity" type="number" min="0.001" step="0.001" placeholder="Quantidade" required />
          <input name="entryUnitCost" type="number" min="0" step="0.01" placeholder="Custo unitario" required />
        </div>
        <textarea name="entryNotes" maxLength={500} placeholder="Observacao (opcional)" rows={3} />
        <button className="primary-button" type="submit">
          <Plus size={17} />
          Registrar entrada
        </button>
      </form>

      <div className="panel wide stock-entry-history">
        <div className="panel-header compact">
          <h2>Entradas registradas</h2>
          <span>{entries.length} registros</span>
        </div>
        <div className="table-shell">
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Produto</th>
                <th>Fornecedor</th>
                <th>Qtd.</th>
                <th>Custo un.</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td>{formatDateTime(entry.createdAt)}</td>
                  <td>{entry.productName}</td>
                  <td>{entry.supplierName}</td>
                  <td>{formatQuantity(entry.quantity)}</td>
                  <td>{formatCurrency(entry.unitCost)}</td>
                </tr>
              ))}
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={5}>Nenhuma entrada registrada.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function StockAdjustmentsPage({
  adjustments,
  products,
  onSubmit,
}: {
  adjustments: StockAdjustment[];
  products: Product[];
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section className="layout-grid stock-entry-layout">
      <form className="panel form-panel" onSubmit={onSubmit}>
        <div className="panel-header compact">
          <h2>Novo ajuste</h2>
          <SlidersHorizontal size={18} />
        </div>
        <select name="adjustmentProductId" defaultValue="" required>
          <option value="" disabled>
            Produto
          </option>
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name} - fisico {formatQuantity(product.currentStock)} - reservado {formatQuantity(product.reservedStock)}
              {product.active ? "" : " (inativo)"}
            </option>
          ))}
        </select>
        <input
          name="adjustmentQuantity"
          type="number"
          step="0.001"
          placeholder="Variacao de estoque (+ ou -)"
          required
        />
        <p className="field-help">Use valor positivo para acrescentar ou negativo para retirar itens.</p>
        <textarea name="adjustmentReason" maxLength={500} placeholder="Motivo do ajuste" rows={3} required />
        <button className="primary-button" type="submit">
          <Plus size={17} />
          Registrar ajuste
        </button>
      </form>

      <div className="panel wide stock-entry-history">
        <div className="panel-header compact">
          <h2>Ajustes registrados</h2>
          <span>{adjustments.length} registros</span>
        </div>
        <div className="table-shell">
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Produto</th>
                <th>Variacao</th>
                <th>Motivo</th>
              </tr>
            </thead>
            <tbody>
              {adjustments.map((adjustment) => (
                <tr key={adjustment.id}>
                  <td>{formatDateTime(adjustment.createdAt)}</td>
                  <td>{adjustment.productName}</td>
                  <td>{formatSignedQuantity(adjustment.quantity)}</td>
                  <td>{adjustment.reason}</td>
                </tr>
              ))}
              {adjustments.length === 0 ? (
                <tr>
                  <td colSpan={4}>Nenhum ajuste registrado.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function LowStockPage({ products }: { products: Product[] }) {
  return (
    <div className="panel wide">
      <div className="panel-header compact">
        <div>
          <h2>Produtos para reposicao</h2>
          <span>Produtos ativos com saldo disponivel igual ou menor que o minimo definido.</span>
        </div>
        <AlertTriangle size={18} />
      </div>
      <div className="table-shell">
        <table>
          <thead>
            <tr>
              <th>Produto</th>
              <th>Fabricante</th>
              <th>Locacao</th>
              <th>Disponivel</th>
              <th>Minimo</th>
              <th>Faltam p/ minimo</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product) => (
              <tr key={product.id}>
                <td>{product.name}</td>
                <td>{product.brandName ?? "-"}</td>
                <td>{product.location ?? "-"}</td>
                <td className="stock-warning">{formatQuantity(product.availableStock)}</td>
                <td>{formatQuantity(product.minimumStock)}</td>
                <td>{formatQuantity(String(Number(product.minimumStock) - Number(product.availableStock)))}</td>
              </tr>
            ))}
            {products.length === 0 ? (
              <tr>
                <td colSpan={6}>Nenhum produto requer reposicao.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StockMovementsPage({ movements }: { movements: StockMovement[] }) {
  return (
    <div className="panel wide">
      <div className="panel-header compact">
        <div>
          <h2>Movimentacoes registradas</h2>
          <span>Entradas e ajustes que modificaram o estoque atual.</span>
        </div>
        <ArrowLeftRight size={18} />
      </div>
      <div className="table-shell">
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Tipo</th>
              <th>Produto</th>
              <th>Quantidade</th>
              <th>Fornecedor</th>
              <th>Custo un.</th>
              <th>Observacao</th>
            </tr>
          </thead>
          <tbody>
            {movements.map((movement) => (
              <tr key={movement.id}>
                <td>{formatDateTime(movement.createdAt)}</td>
                <td>{movementTypeLabel(movement.type)}</td>
                <td>{movement.productName}</td>
                <td>{formatSignedQuantity(movement.quantity)}</td>
                <td>{movement.supplierName ?? "-"}</td>
                <td>{movement.unitCost ? formatCurrency(movement.unitCost) : "-"}</td>
                <td>{movement.notes ?? "-"}</td>
              </tr>
            ))}
            {movements.length === 0 ? (
              <tr>
                <td colSpan={7}>Nenhuma movimentacao registrada.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PaymentMethodsPage({
  paymentMethods,
  onChangeStatus,
}: {
  paymentMethods: PaymentMethod[];
  onChangeStatus: (paymentMethod: PaymentMethod) => void;
}) {
  return (
    <div className="panel wide">
      <div className="panel-header compact">
        <div>
          <h2>Formas configuradas</h2>
          <span>Credito sera incluido somente depois que suas regras forem definidas.</span>
        </div>
        <CreditCard size={18} />
      </div>
      <div className="table-shell">
        <table>
          <thead>
            <tr>
              <th>Forma de pagamento</th>
              <th>Codigo</th>
              <th>Status</th>
              <th>Acoes</th>
            </tr>
          </thead>
          <tbody>
            {paymentMethods.map((paymentMethod) => (
              <tr key={paymentMethod.id}>
                <td>{paymentMethod.name}</td>
                <td>{paymentMethod.code}</td>
                <td>
                  <span className={paymentMethod.active ? "status-tag active" : "status-tag inactive"}>
                    {paymentMethod.active ? "Ativa" : "Inativa"}
                  </span>
                </td>
                <td>
                  <button className="action-button" type="button" onClick={() => onChangeStatus(paymentMethod)}>
                    {paymentMethod.active ? <PowerOff size={14} /> : <Power size={14} />}
                    {paymentMethod.active ? " Inativar" : " Ativar"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CashRegisterPage({
  session,
  user,
  onOpen,
  onClose,
}: {
  session: CashRegisterSession | null;
  user: AuthUser;
  onOpen: (event: FormEvent<HTMLFormElement>) => void;
  onClose: (event: FormEvent<HTMLFormElement>) => void;
}) {
  if (session) {
    return (
      <section className="layout-grid stock-entry-layout">
        <div className="panel">
        <div className="panel-header compact">
          <div>
            <h2>Caixa aberto</h2>
            <span>Confira os recebimentos antes de fechar o caixa.</span>
          </div>
          <span className="status-tag active">Aberto</span>
        </div>
        <div className="cash-register-details">
          <div>
            <span>Aberto por</span>
            <strong>{session.openedByUserName}</strong>
          </div>
          <div>
            <span>Data de abertura</span>
            <strong>{formatDateTime(session.openedAt)}</strong>
          </div>
          <div>
            <span>Saldo inicial</span>
            <strong>{formatCurrency(session.openingBalance)}</strong>
          </div>
          <div>
            <span>Vendas</span>
            <strong>{formatCurrency(session.salesTotal)}</strong>
          </div>
          <div>
            <span>Esperado</span>
            <strong>{formatCurrency(session.expectedClosingBalance)}</strong>
          </div>
        </div>
        </div>

        <form className="panel form-panel" onSubmit={onClose}>
          <div className="panel-header compact">
            <div>
              <h2>Fechamento</h2>
              <span>Informe o total conferido no caixa.</span>
            </div>
            <Banknote size={18} />
          </div>
          <div className="entity-list">
            {session.paymentSummary.map((payment) => (
              <div className="entity-row" key={payment.paymentMethodId}>
                <strong>{payment.paymentMethodName}</strong>
                <span>{formatCurrency(payment.amount)}</span>
              </div>
            ))}
            {session.paymentSummary.length === 0 ? <span className="empty-text">Nenhuma venda registrada.</span> : null}
          </div>
          <label className="field-label">
            Saldo esperado
            <input value={formatCurrency(session.expectedClosingBalance)} disabled />
          </label>
          <label className="field-label">
            Valor conferido
            <input
              name="closingBalance"
              type="number"
              min="0"
              step="0.01"
              defaultValue={session.expectedClosingBalance}
              required
            />
          </label>
          <button className="primary-button" type="submit">
            <Plus size={17} />
            Fechar caixa
          </button>
        </form>
      </section>
    );
  }

  return (
    <form className="panel form-panel single-column" onSubmit={onOpen}>
      <div className="panel-header compact">
        <div>
          <h2>Abrir caixa</h2>
          <span>A abertura ficara registrada no usuario autenticado.</span>
        </div>
        <Banknote size={18} />
      </div>
      <label className="field-label">
        Responsavel
        <input value={user.name} disabled />
      </label>
      <label className="field-label">
        Saldo inicial
        <input name="openingBalance" type="number" min="0" step="0.01" defaultValue="0.00" required />
      </label>
      <button className="primary-button" type="submit">
        <Plus size={17} />
        Abrir caixa
      </button>
    </form>
  );
}

function SalesPage({
  cashRegister,
  clients,
  paymentMethods,
  products,
  sales,
  onSubmit,
}: {
  cashRegister: CashRegisterSession | null;
  clients: Client[];
  paymentMethods: PaymentMethod[];
  products: Product[];
  sales: Sale[];
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section className="layout-grid stock-entry-layout">
      <form className="panel form-panel" onSubmit={onSubmit}>
        <div className="panel-header compact">
          <div>
            <h2>Nova venda</h2>
            <span>Esta etapa aceita um produto e um pagamento por venda.</span>
          </div>
          <ShoppingCart size={18} />
        </div>
        {!cashRegister ? <div className="alert">Abra o caixa antes de registrar vendas.</div> : null}
        <select name="saleProductId" defaultValue="" required disabled={!cashRegister}>
          <option value="" disabled>
            Produto
          </option>
          {products
            .filter((product) => product.active && Number(product.availableStock) > 0)
            .map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} - {formatCurrency(product.salePrice)} - disponivel {formatQuantity(product.availableStock)}
              </option>
            ))}
        </select>
        <div className="two-columns">
          <input
            name="saleQuantity"
            type="number"
            min="0.001"
            step="0.001"
            placeholder="Quantidade"
            required
            disabled={!cashRegister}
          />
          <select name="salePaymentMethodId" defaultValue="" required disabled={!cashRegister}>
            <option value="" disabled>
              Pagamento
            </option>
            {paymentMethods.filter((method) => method.active).map((method) => (
              <option key={method.id} value={method.id}>
                {method.name}
              </option>
            ))}
          </select>
        </div>
        <select name="saleClientId" defaultValue="" disabled={!cashRegister}>
          <option value="">Cliente nao identificado</option>
          {clients.filter((client) => client.active).map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </select>
        <button className="primary-button" type="submit" disabled={!cashRegister}>
          <Plus size={17} />
          Concluir venda
        </button>
      </form>

      <div className="panel wide">
        <div className="panel-header compact">
          <h2>Vendas registradas</h2>
          <span>{sales.length} registros</span>
        </div>
        <div className="table-shell">
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Produto</th>
                <th>Qtd.</th>
                <th>Total</th>
                <th>Pagamento</th>
                <th>Cliente</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr key={sale.id}>
                  <td>{formatDateTime(sale.createdAt)}</td>
                  <td>{sale.productName}</td>
                  <td>{formatQuantity(sale.quantity)}</td>
                  <td>{formatCurrency(sale.totalAmount)}</td>
                  <td>{sale.paymentMethodName}</td>
                  <td>{sale.clientName ?? "Nao identificado"}</td>
                </tr>
              ))}
              {sales.length === 0 ? (
                <tr>
                  <td colSpan={6}>Nenhuma venda registrada.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function ShippingOrdersPage({
  clients,
  cashRegister,
  paymentMethods,
  products,
  orders,
  onSubmit,
  onApprove,
  onSeparate,
  onComplete,
  onCancel,
}: {
  clients: Client[];
  cashRegister: CashRegisterSession | null;
  paymentMethods: PaymentMethod[];
  products: Product[];
  orders: ShippingOrder[];
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onApprove: (order: ShippingOrder) => void;
  onSeparate: (order: ShippingOrder) => void;
  onComplete: (event: FormEvent<HTMLFormElement>, order: ShippingOrder) => void;
  onCancel: (event: FormEvent<HTMLFormElement>, order: ShippingOrder) => void;
}) {
  return (
    <section className="layout-grid stock-entry-layout">
      <form className="panel form-panel" onSubmit={onSubmit}>
        <div className="panel-header compact">
          <div>
            <h2>Novo orcamento</h2>
            <span>Atendimento remoto com um produto nesta etapa.</span>
          </div>
          <Send size={18} />
        </div>
        <p className="field-help">
          Informe o cliente contatado. A peca sera reservada somente quando o orcamento for aprovado.
        </p>
        <select name="shippingClientId" defaultValue="" required>
          <option value="" disabled>
            Cliente
          </option>
          {clients.filter((client) => client.active).map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}{client.phone ? ` - ${client.phone}` : ""}
            </option>
          ))}
        </select>
        <select name="shippingProductId" defaultValue="" required>
          <option value="" disabled>
            Produto
          </option>
          {products
            .filter((product) => product.active && Number(product.availableStock) > 0)
            .map((product) => (
              <option key={product.id} value={product.id}>
                {product.name} - {formatCurrency(product.salePrice)} - disponivel {formatQuantity(product.availableStock)}
              </option>
            ))}
        </select>
        <input
          name="shippingQuantity"
          type="number"
          min="0.001"
          step="0.001"
          placeholder="Quantidade"
          required
        />
        <button className="primary-button" type="submit">
          <Plus size={17} />
          Registrar orcamento
        </button>
      </form>

      <div className="panel wide">
        <div className="panel-header compact">
          <div>
            <h2>Pedidos para envio</h2>
            <span>Reserve, separe e conclua a venda quando o pedido sair para envio.</span>
          </div>
          <span>{orders.length} registros</span>
        </div>
        <div className="table-shell">
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Cliente</th>
                <th>Produto</th>
                <th>Qtd.</th>
                <th>Total</th>
                <th>Status</th>
                <th>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>{formatDateTime(order.createdAt)}</td>
                  <td>{order.clientName}</td>
                  <td>{order.productName}</td>
                  <td>{formatQuantity(order.quantity)}</td>
                  <td>{formatCurrency(order.totalAmount)}</td>
                  <td>
                    <span className={shippingOrderStatusClassName(order.status)}>
                      {shippingOrderStatusLabel(order.status)}
                    </span>
                    {order.cancellationReason ? <div className="table-note">{order.cancellationReason}</div> : null}
                  </td>
                  <td>
                    {order.status !== "CANCELLED" && order.status !== "COMPLETED" ? (
                      <div className="shipping-order-actions">
                        {order.status === "QUOTED" ? (
                          <button className="action-button" type="button" onClick={() => onApprove(order)}>
                            Aprovar e reservar
                          </button>
                        ) : order.status === "APPROVED" ? (
                          <button className="action-button" type="button" onClick={() => onSeparate(order)}>
                            Confirmar separacao
                          </button>
                        ) : (
                          <form className="cancel-order-form" onSubmit={(event) => onComplete(event, order)}>
                            {!cashRegister ? <span className="table-note">Abra o caixa para concluir.</span> : null}
                            <select name="shippingPaymentMethodId" defaultValue="" required disabled={!cashRegister}>
                              <option value="" disabled>
                                Pagamento
                              </option>
                              {paymentMethods.filter((method) => method.active).map((method) => (
                                <option key={method.id} value={method.id}>
                                  {method.name}
                                </option>
                              ))}
                            </select>
                            <button className="action-button" type="submit" disabled={!cashRegister}>
                              Concluir venda e saida
                            </button>
                          </form>
                        )}
                        <form className="cancel-order-form" onSubmit={(event) => onCancel(event, order)}>
                          <input
                            name="shippingCancellationReason"
                            maxLength={500}
                            placeholder="Motivo do cancelamento"
                            required
                          />
                          <button className="action-button" type="submit">
                            Cancelar
                          </button>
                        </form>
                      </div>
                    ) : order.status === "COMPLETED" ? (
                      "Venda concluida"
                    ) : (
                      "-"
                    )}
                  </td>
                </tr>
              ))}
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={7}>Nenhum orcamento para envio registrado.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function Metric({
  active,
  icon,
  label,
  value,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  value: number;
  onClick: () => void;
}) {
  return (
    <ButtonBase
      className={active ? "metric metric-button active" : "metric metric-button"}
      focusRipple
      onClick={onClick}
    >
      <span className="metric-icon">{icon}</span>
      <span className="metric-label">{label}</span>
      <strong>{value}</strong>
    </ButtonBase>
  );
}

function movementTypeLabel(type: StockMovement["type"]) {
  if (type === "ENTRY") {
    return "Entrada";
  }

  if (type === "SALE") {
    return "Venda";
  }

  return "Ajuste";
}

function shippingOrderStatusLabel(status: ShippingOrder["status"]) {
  if (status === "APPROVED") {
    return "Aprovado - separar";
  }

  if (status === "SEPARATED") {
    return "Separado para envio";
  }

  if (status === "COMPLETED") {
    return "Venda concluida";
  }

  return status === "CANCELLED" ? "Cancelado" : "Orcamento enviado";
}

function shippingOrderStatusClassName(status: ShippingOrder["status"]) {
  if (status === "APPROVED" || status === "SEPARATED" || status === "COMPLETED") {
    return "status-tag active";
  }

  return status === "CANCELLED" ? "status-tag inactive" : "status-tag pending";
}

function optionalFormValue(form: FormData, key: string): string | undefined {
  const value = String(form.get(key) ?? "").trim();
  return value ? value : undefined;
}

function nullableFormValue(form: FormData, key: string): string | null {
  return optionalFormValue(form, key) ?? null;
}

function productFormBody(form: FormData) {
  return {
    name: String(form.get("productName") ?? "").trim(),
    internalCode: nullableFormValue(form, "internalCode"),
    barcode: nullableFormValue(form, "barcode"),
    brandId: nullableFormValue(form, "brandId"),
    unit: String(form.get("unit") ?? "UN").trim(),
    location: nullableFormValue(form, "location"),
    costPrice: Number(form.get("costPrice") || 0),
    salePrice: Number(form.get("salePrice") || 0),
    minimumStock: Number(form.get("minimumStock") || 0),
    ncm: nullableFormValue(form, "ncm"),
    cest: nullableFormValue(form, "cest"),
  };
}

function formatQuantity(value: string) {
  return Number(value).toLocaleString("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  });
}

function formatSignedQuantity(value: string) {
  const quantity = Number(value);
  const prefix = quantity > 0 ? "+" : "";
  return `${prefix}${formatQuantity(value)}`;
}

function formatCurrency(value: string) {
  return Number(value).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("pt-BR");
}
