import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import {
  PackagePlus,
  Pencil,
  Plus,
  Power,
  PowerOff,
  Tags,
  Truck,
  UserRound,
  X,
} from "lucide-react";
import type { FormEvent } from "react";
import type { Client, NamedEntity, Product, Supplier } from "../../api";
import {
  PrimaryButton,
  SecondaryButton,
  StatusChip,
  TableActionButton,
} from "../../components/ui";
import { formatQuantity } from "../../utils/format";
import { productDisplayName } from "../../utils/productDisplay";

type LoadState = "idle" | "loading" | "ready" | "error";

export function ProductsPage({
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
          <span>
            {state === "loading" ? "Carregando..." : "Dados do backend"}
          </span>
        </div>
        <input
          className="search"
          placeholder="Buscar por nome, codigo, fabricante ou locacao"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </div>

      <ProductTable
        products={products}
        onEdit={onEdit}
        onChangeStatus={onChangeStatus}
      />
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
              <td>{productDisplayName(product)}</td>
              <td>{product.internalCode ?? "-"}</td>
              <td>{product.brandName ?? "-"}</td>
              <td>{product.unit}</td>
              <td>{product.location ?? "-"}</td>
              <td>{formatQuantity(product.currentStock)}</td>
              <td>{formatQuantity(product.reservedStock)}</td>
              <td>{formatQuantity(product.availableStock)}</td>
              <td>R$ {product.salePrice}</td>
              <td>
                <StatusChip
                  label={product.active ? "Ativo" : "Inativo"}
                  tone={product.active ? "success" : "neutral"}
                />
              </td>
              <td>
                <div className="table-actions">
                  <TableActionButton
                    icon={<Pencil size={15} />}
                    type="button"
                    onClick={() => onEdit(product)}
                  >
                    Editar
                  </TableActionButton>
                  <TableActionButton
                    icon={
                      product.active ? (
                        <PowerOff size={15} />
                      ) : (
                        <Power size={15} />
                      )
                    }
                    type="button"
                    onClick={() => onChangeStatus(product)}
                  >
                    {product.active ? "Inativar" : "Ativar"}
                  </TableActionButton>
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

export function ProductForm({
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
      <input
        name="productName"
        placeholder="Nome do produto"
        defaultValue={product?.name}
        required
      />
      <div className="two-columns">
        <input
          name="internalCode"
          placeholder="Codigo interno"
          defaultValue={product?.internalCode ?? ""}
        />
        <input
          name="barcode"
          placeholder="Codigo de barras"
          defaultValue={product?.barcode ?? ""}
        />
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
        <input
          name="location"
          placeholder="Locacao"
          defaultValue={product?.location ?? ""}
        />
      </div>
      <div className="three-columns">
        <select name="unit" defaultValue={product?.unit ?? "UN"}>
          <option value="UN">UN - Unidade</option>
          <option value="KIT">KIT - Kit</option>
          <option value="CJ">CJ - Conjunto</option>
        </select>
        <input
          name="costPrice"
          type="number"
          step="0.01"
          placeholder="Custo"
          defaultValue={product?.costPrice}
        />
        <input
          name="salePrice"
          type="number"
          step="0.01"
          placeholder="Venda"
          defaultValue={product?.salePrice}
        />
      </div>
      <div className="three-columns">
        <input
          name="minimumStock"
          type="number"
          step="0.001"
          placeholder="Estoque min."
          defaultValue={product?.minimumStock}
        />
        <input name="ncm" placeholder="NCM" defaultValue={product?.ncm ?? ""} />
        <input
          name="cest"
          placeholder="CEST"
          defaultValue={product?.cest ?? ""}
        />
      </div>
      <div className="three-columns">
        <input
          name="cfop"
          maxLength={4}
          placeholder="CFOP"
          defaultValue={product?.cfop ?? ""}
        />
        <input
          name="origin"
          maxLength={2}
          placeholder="Origem fiscal"
          defaultValue={product?.origin ?? ""}
        />
        <input
          name="description"
          maxLength={1000}
          placeholder="Descricao comercial para orcamento"
          defaultValue={product?.description ?? ""}
        />
      </div>
      <div className="form-actions">
        {onCancel ? (
          <SecondaryButton
            icon={<X size={17} />}
            type="button"
            onClick={onCancel}
          >
            Cancelar
          </SecondaryButton>
        ) : null}
        <PrimaryButton
          icon={product ? <Pencil size={17} /> : <Plus size={17} />}
          type="submit"
        >
          {submitLabel}
        </PrimaryButton>
      </div>
    </form>
  );
}

export function NamedEntityPage({
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
        <PrimaryButton icon={<Plus size={17} />} type="submit">
          Cadastrar
        </PrimaryButton>
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
      {items.length === 0 ? (
        <p className="empty-text">Nenhum registro cadastrado.</p>
      ) : null}
    </div>
  );
}

export function SuppliersPage({
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
        <PrimaryButton icon={<Plus size={17} />} type="submit">
          Cadastrar fornecedor
        </PrimaryButton>
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

export function ClientsPage({
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
      <form
        key={selectedClient?.id ?? "new"}
        className="panel form-panel"
        onSubmit={onSubmit}
      >
        <div className="panel-header compact">
          <h2>{selectedClient ? "Editar cliente" : "Novo cliente"}</h2>
          <UserRound size={18} />
        </div>
        <select
          name="clientPersonType"
          defaultValue={selectedClient?.personType ?? "PF"}
          required
        >
          <option value="PF">Pessoa fisica</option>
          <option value="PJ">Pessoa juridica</option>
          <option value="ES">Estrangeiro</option>
        </select>
        <input
          name="clientName"
          placeholder="Nome"
          defaultValue={selectedClient?.name}
          required
        />
        <input
          name="clientDocument"
          placeholder="CPF/CNPJ"
          defaultValue={selectedClient?.document ?? ""}
        />
        <div className="two-columns">
          <input
            name="clientPhone"
            placeholder="Telefone"
            defaultValue={selectedClient?.phone ?? ""}
          />
          <input
            name="clientEmail"
            type="email"
            placeholder="Email"
            defaultValue={selectedClient?.email ?? ""}
          />
        </div>
        <div className="form-section">
          <strong>Dados fiscais para NF-e</strong>
          <span className="table-note">
            Preencha quando o cliente solicitar nota fiscal.
          </span>
        </div>
        <div className="two-columns">
          <TextField
            defaultValue={selectedClient?.stateRegistration ?? ""}
            label="Inscricao estadual"
            name="clientStateRegistration"
            size="small"
          />
          <TextField
            defaultValue={selectedClient?.stateRegistrationIndicator ?? "9"}
            label="Indicador IE"
            name="clientStateRegistrationIndicator"
            select
            size="small"
          >
            <MenuItem value="9">Nao contribuinte</MenuItem>
            <MenuItem value="1">Contribuinte ICMS</MenuItem>
            <MenuItem value="2">Contribuinte isento</MenuItem>
          </TextField>
        </div>
        <TextField
          defaultValue={selectedClient?.addressStreet ?? ""}
          label="Logradouro"
          name="clientAddressStreet"
          size="small"
        />
        <div className="two-columns">
          <TextField
            defaultValue={selectedClient?.addressNumber ?? ""}
            label="Numero"
            name="clientAddressNumber"
            size="small"
          />
          <TextField
            defaultValue={selectedClient?.addressComplement ?? ""}
            label="Complemento"
            name="clientAddressComplement"
            size="small"
          />
        </div>
        <div className="two-columns">
          <TextField
            defaultValue={selectedClient?.addressDistrict ?? ""}
            label="Bairro"
            name="clientAddressDistrict"
            size="small"
          />
          <TextField
            defaultValue={selectedClient?.addressCity ?? ""}
            label="Cidade"
            name="clientAddressCity"
            size="small"
          />
        </div>
        <div className="two-columns">
          <TextField
            defaultValue={selectedClient?.addressState ?? ""}
            label="UF"
            name="clientAddressState"
            size="small"
          />
          <TextField
            defaultValue={selectedClient?.addressZipCode ?? ""}
            label="CEP"
            name="clientAddressZipCode"
            size="small"
          />
        </div>
        <div className="form-actions">
          {selectedClient ? (
            <SecondaryButton type="button" onClick={onCancel}>
              Cancelar
            </SecondaryButton>
          ) : null}
          <PrimaryButton icon={<Plus size={17} />} type="submit">
            {selectedClient ? "Salvar alteracoes" : "Cadastrar cliente"}
          </PrimaryButton>
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
                  <td>
                    <strong>{client.name}</strong>
                    <span className="table-note">
                      {client.addressCity && client.addressState
                        ? `${client.addressCity}/${client.addressState}`
                        : "Sem endereco fiscal"}
                    </span>
                  </td>
                  <td>{client.personType}</td>
                  <td>{client.document ?? "-"}</td>
                  <td>{client.phone ?? "-"}</td>
                  <td>
                    <StatusChip
                      label={client.active ? "Ativo" : "Inativo"}
                      tone={client.active ? "success" : "neutral"}
                    />
                  </td>
                  <td className="table-actions">
                    <TableActionButton
                      icon={<Pencil size={14} />}
                      type="button"
                      onClick={() => onEdit(client)}
                    >
                      Editar
                    </TableActionButton>
                    <TableActionButton
                      icon={
                        client.active ? (
                          <PowerOff size={14} />
                        ) : (
                          <Power size={14} />
                        )
                      }
                      type="button"
                      onClick={() => onChangeStatus(client)}
                    >
                      {client.active ? "Inativar" : "Ativar"}
                    </TableActionButton>
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
