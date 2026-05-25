import {
  CircleDollarSign,
  Filter,
  List,
  PackagePlus,
  Pencil,
  Plus,
  Power,
  PowerOff,
  RefreshCcw,
  Tags,
  Truck,
  X,
} from "lucide-react";
import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import {
  apiGet,
  apiPatch,
  apiPost,
  apiPut,
  type ApiResult,
  type NamedEntity,
  type Product,
  type Supplier,
} from "./api";

type LoadState = "idle" | "loading" | "ready" | "error";
type View = "products" | "new-product" | "edit-product" | "brands" | "suppliers";

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
  brands: {
    title: "Fabricantes",
    description: "Cadastre os fabricantes usados no catalogo de produtos.",
  },
  suppliers: {
    title: "Fornecedores",
    description: "Mantenha fornecedores disponiveis para compras e produtos.",
  },
};

export function App() {
  const [view, setView] = useState<View>("products");
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<NamedEntity[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [state, setState] = useState<LoadState>("idle");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product>();

  async function loadCatalog() {
    setState("loading");
    setMessage("");

    try {
      const [productsResult, brandsResult, suppliersResult] =
        await Promise.all([
          apiGet<ApiResult<Product[]>>("/products"),
          apiGet<ApiResult<NamedEntity[]>>("/brands"),
          apiGet<ApiResult<Supplier[]>>("/suppliers"),
        ]);

      setProducts(productsResult.data);
      setBrands(brandsResult.data);
      setSuppliers(suppliersResult.data);
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

  async function changeProductStatus(product: Product) {
    await runAction(async () => {
      await apiPatch(`/products/${product.id}/status`, { active: !product.active });
      await loadCatalog();
    });
  }

  function editProduct(product: Product) {
    setSelectedProduct(product);
    setView("edit-product");
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
          <NavSection title="Produtos">
            <NavButton active={view === "products"} icon={<List size={18} />} onClick={() => setView("products")}>
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

          <NavSection title="Cadastros">
            <NavButton active={view === "brands"} icon={<Tags size={18} />} onClick={() => setView("brands")}>
              Fabricantes
            </NavButton>
          </NavSection>

          <NavSection title="Fornecedores">
            <NavButton active={view === "suppliers"} icon={<Truck size={18} />} onClick={() => setView("suppliers")}>
              Cadastro
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
          <button className="icon-button" onClick={() => void loadCatalog()} title="Atualizar">
            <RefreshCcw size={18} />
          </button>
        </header>

        {message ? <div className={state === "error" ? "alert" : "notice"}>{message}</div> : null}

        <section className="summary-grid">
          <Metric label="Produtos" value={products.length} />
          <Metric label="Fabricantes" value={brands.length} />
          <Metric label="Fornecedores" value={suppliers.length} />
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

        {view === "brands" ? (
          <NamedEntityPage
            title="Fabricantes"
            fieldName="brandName"
            items={brands}
            onSubmit={(event) => void createNamedEntity(event, "/brands", "brandName")}
          />
        ) : null}

        {view === "suppliers" ? (
          <SuppliersPage suppliers={suppliers} onSubmit={createSupplier} />
        ) : null}
      </section>
    </main>
  );
}

function NavSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="nav-section">
      <span>{title}</span>
      {children}
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
    <button className={active ? "nav-item active" : "nav-item"} type="button" onClick={onClick}>
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
              <td colSpan={8}>Nenhum produto encontrado.</td>
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

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="metric">
      <CircleDollarSign size={18} />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
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
