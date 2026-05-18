import {
  CircleDollarSign,
  Filter,
  PackagePlus,
  Plus,
  RefreshCcw,
  Tags,
  Truck,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  apiGet,
  apiPost,
  type ApiResult,
  type NamedEntity,
  type Product,
  type Supplier,
} from "./api";

type LoadState = "idle" | "loading" | "ready" | "error";

export function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<NamedEntity[]>([]);
  const [groups, setGroups] = useState<NamedEntity[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [state, setState] = useState<LoadState>("idle");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");

  async function loadCatalog() {
    setState("loading");
    setMessage("");

    try {
      const [productsResult, brandsResult, groupsResult, suppliersResult] =
        await Promise.all([
          apiGet<ApiResult<Product[]>>("/products"),
          apiGet<ApiResult<NamedEntity[]>>("/brands"),
          apiGet<ApiResult<NamedEntity[]>>("/product-groups"),
          apiGet<ApiResult<Supplier[]>>("/suppliers"),
        ]);

      setProducts(productsResult.data);
      setBrands(brandsResult.data);
      setGroups(groupsResult.data);
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
      return [product.name, product.internalCode, product.barcode, product.brandName]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(term));
    });
  }, [products, search]);

  async function createNamedEntity(
    event: FormEvent<HTMLFormElement>,
    path: string,
    fieldName: string,
  ) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get(fieldName) ?? "").trim();

    if (!name) {
      return;
    }

    await apiPost(path, { name });
    event.currentTarget.reset();
    await loadCatalog();
  }

  async function createSupplier(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    await apiPost("/suppliers", {
      name: String(form.get("supplierName") ?? "").trim(),
      document: optionalFormValue(form, "supplierDocument"),
      phone: optionalFormValue(form, "supplierPhone"),
      email: optionalFormValue(form, "supplierEmail"),
    });

    event.currentTarget.reset();
    await loadCatalog();
  }

  async function createProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    await apiPost("/products", {
      name: String(form.get("productName") ?? "").trim(),
      internalCode: optionalFormValue(form, "internalCode"),
      barcode: optionalFormValue(form, "barcode"),
      brandId: optionalFormValue(form, "brandId"),
      groupId: optionalFormValue(form, "groupId"),
      unit: String(form.get("unit") ?? "UN").trim(),
      costPrice: Number(form.get("costPrice") || 0),
      salePrice: Number(form.get("salePrice") || 0),
      minimumStock: Number(form.get("minimumStock") || 0),
      ncm: optionalFormValue(form, "ncm"),
      cest: optionalFormValue(form, "cest"),
    });

    event.currentTarget.reset();
    await loadCatalog();
  }

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
          <a className="nav-item active" href="#products">
            <PackagePlus size={18} />
            Produtos
          </a>
          <a className="nav-item" href="#support">
            <Tags size={18} />
            Cadastros
          </a>
          <a className="nav-item" href="#suppliers">
            <Truck size={18} />
            Fornecedores
          </a>
        </nav>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <h1>Catalogo de filtros</h1>
            <p>Primeiro ponto de integracao com o backend.</p>
          </div>
          <button className="icon-button" onClick={() => void loadCatalog()} title="Atualizar">
            <RefreshCcw size={18} />
          </button>
        </header>

        {state === "error" ? <div className="alert">{message}</div> : null}

        <section className="summary-grid">
          <Metric label="Produtos" value={products.length} />
          <Metric label="Marcas" value={brands.length} />
          <Metric label="Grupos" value={groups.length} />
          <Metric label="Fornecedores" value={suppliers.length} />
        </section>

        <section className="layout-grid">
          <div className="panel wide" id="products">
            <div className="panel-header">
              <div>
                <h2>Produtos</h2>
                <span>{state === "loading" ? "Carregando..." : "Dados do backend"}</span>
              </div>
              <input
                className="search"
                placeholder="Buscar por nome, codigo ou marca"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>

            <div className="table-shell">
              <table>
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th>Codigo</th>
                    <th>Marca</th>
                    <th>Grupo</th>
                    <th>Venda</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => (
                    <tr key={product.id}>
                      <td>{product.name}</td>
                      <td>{product.internalCode ?? "-"}</td>
                      <td>{product.brandName ?? "-"}</td>
                      <td>{product.groupName ?? "-"}</td>
                      <td>R$ {product.salePrice}</td>
                    </tr>
                  ))}
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={5}>Nenhum produto encontrado.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>

          <form className="panel form-panel" onSubmit={(event) => void createProduct(event)}>
            <div className="panel-header compact">
              <h2>Novo produto</h2>
              <PackagePlus size={18} />
            </div>
            <input name="productName" placeholder="Nome do produto" required />
            <div className="two-columns">
              <input name="internalCode" placeholder="Codigo interno" />
              <input name="barcode" placeholder="Codigo de barras" />
            </div>
            <div className="two-columns">
              <select name="brandId" defaultValue="">
                <option value="">Marca</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
              <select name="groupId" defaultValue="">
                <option value="">Grupo</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="three-columns">
              <input name="unit" placeholder="UN" defaultValue="UN" />
              <input name="costPrice" type="number" step="0.01" placeholder="Custo" />
              <input name="salePrice" type="number" step="0.01" placeholder="Venda" />
            </div>
            <div className="three-columns">
              <input name="minimumStock" type="number" step="0.001" placeholder="Estoque min." />
              <input name="ncm" placeholder="NCM" />
              <input name="cest" placeholder="CEST" />
            </div>
            <button className="primary-button" type="submit">
              <Plus size={17} />
              Cadastrar produto
            </button>
          </form>
        </section>

        <section className="layout-grid" id="support">
          <QuickCreate
            title="Marcas"
            fieldName="brandName"
            items={brands}
            onSubmit={(event) => void createNamedEntity(event, "/brands", "brandName")}
          />
          <QuickCreate
            title="Grupos"
            fieldName="groupName"
            items={groups}
            onSubmit={(event) => void createNamedEntity(event, "/product-groups", "groupName")}
          />
          <form className="panel form-panel" id="suppliers" onSubmit={(event) => void createSupplier(event)}>
            <div className="panel-header compact">
              <h2>Fornecedor</h2>
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
        </section>
      </section>
    </main>
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

function QuickCreate({
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
    <form className="panel form-panel" onSubmit={onSubmit}>
      <div className="panel-header compact">
        <h2>{title}</h2>
        <Tags size={18} />
      </div>
      <input name={fieldName} placeholder="Nome" required />
      <button className="primary-button" type="submit">
        <Plus size={17} />
        Cadastrar
      </button>
      <div className="chips">
        {items.slice(0, 8).map((item) => (
          <span key={item.id}>{item.name}</span>
        ))}
      </div>
    </form>
  );
}

function optionalFormValue(form: FormData, key: string): string | undefined {
  const value = String(form.get(key) ?? "").trim();
  return value ? value : undefined;
}
