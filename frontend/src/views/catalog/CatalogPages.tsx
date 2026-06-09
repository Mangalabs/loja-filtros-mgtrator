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
import { formatCurrency, formatQuantity } from "../../utils/format";
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
      <div className="panel-header product-list-header">
        <div>
          <h2>Lista de produtos</h2>
          <span>
            {state === "loading" ? "Carregando..." : "Dados do backend"}
          </span>
        </div>
        <TextField
          className="product-search"
          label="Buscar produto"
          placeholder="Nome, codigo, fabricante ou locacao"
          size="small"
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
      <table className="product-table responsive-card-table">
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
              <td data-label="Produto">{productDisplayName(product)}</td>
              <td data-label="Codigo">{product.internalCode ?? "-"}</td>
              <td data-label="Fabricante">{product.brandName ?? "-"}</td>
              <td data-label="Un.">{product.unit}</td>
              <td data-label="Locacao">{product.location ?? "-"}</td>
              <td data-label="Fisico">
                {formatQuantity(product.currentStock)}
              </td>
              <td data-label="Reservado">
                {formatQuantity(product.reservedStock)}
              </td>
              <td data-label="Disponivel">
                {formatQuantity(product.availableStock)}
              </td>
              <td data-label="Venda">{formatCurrency(product.salePrice)}</td>
              <td data-label="Status">
                <StatusChip
                  label={product.active ? "Ativo" : "Inativo"}
                  tone={product.active ? "success" : "neutral"}
                />
              </td>
              <td data-label="Acoes">
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
      <TextField
        label="Nome do produto"
        name="productName"
        defaultValue={product?.name}
        size="small"
        required
      />
      <div className="two-columns">
        <TextField
          label="Codigo interno"
          name="internalCode"
          defaultValue={product?.internalCode ?? ""}
          size="small"
        />
        <TextField
          label="Codigo de barras"
          name="barcode"
          defaultValue={product?.barcode ?? ""}
          size="small"
        />
      </div>
      <div className="two-columns">
        <TextField
          defaultValue={product?.brandId ?? ""}
          label="Fabricante"
          name="brandId"
          select
          size="small"
        >
          <MenuItem value="">Sem fabricante</MenuItem>
          {brands.map((brand) => (
            <MenuItem key={brand.id} value={brand.id}>
              {brand.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label="Locacao"
          name="location"
          defaultValue={product?.location ?? ""}
          size="small"
        />
      </div>
      <div className="three-columns">
        <TextField
          defaultValue={product?.unit ?? "UN"}
          label="Unidade"
          name="unit"
          select
          size="small"
        >
          <MenuItem value="UN">UN - Unidade</MenuItem>
          <MenuItem value="KIT">KIT - Kit</MenuItem>
          <MenuItem value="CJ">CJ - Conjunto</MenuItem>
        </TextField>
        <TextField
          label="Custo"
          name="costPrice"
          type="number"
          defaultValue={product?.costPrice}
          size="small"
          slotProps={{ htmlInput: { step: "0.01" } }}
        />
        <TextField
          label="Venda"
          name="salePrice"
          type="number"
          defaultValue={product?.salePrice}
          size="small"
          slotProps={{ htmlInput: { step: "0.01" } }}
        />
      </div>
      <div className="three-columns">
        <TextField
          label="Estoque min."
          name="minimumStock"
          type="number"
          defaultValue={product?.minimumStock}
          size="small"
          slotProps={{ htmlInput: { step: "0.001" } }}
        />
        <TextField
          label="NCM"
          name="ncm"
          defaultValue={product?.ncm ?? ""}
          size="small"
        />
        <TextField
          label="CEST"
          name="cest"
          defaultValue={product?.cest ?? ""}
          size="small"
        />
      </div>
      <div className="three-columns">
        <TextField
          label="CFOP"
          name="cfop"
          defaultValue={product?.cfop ?? ""}
          size="small"
          slotProps={{ htmlInput: { maxLength: 4 } }}
        />
        <TextField
          label="Origem fiscal"
          name="origin"
          defaultValue={product?.origin ?? ""}
          size="small"
          slotProps={{ htmlInput: { maxLength: 2 } }}
        />
      </div>
      <TextField
        defaultValue={product?.description ?? ""}
        helperText="Texto exibido em orcamentos quando precisar separar o nome interno do texto comercial."
        label="Descricao comercial para orcamento"
        multiline
        name="description"
        rows={3}
        size="small"
        slotProps={{ htmlInput: { maxLength: 1000 } }}
      />
      <div className="form-section">
        <strong>Tributacao para NF-e</strong>
        <span className="table-note">
          Campos usados pela integracao fiscal quando houver emissao de nota.
        </span>
      </div>
      <div className="three-columns">
        <TextField
          defaultValue={product?.icmsCst ?? ""}
          label="CST/CSOSN ICMS"
          name="icmsCst"
          size="small"
        />
        <TextField
          defaultValue={product?.pisCst ?? ""}
          label="CST PIS"
          name="pisCst"
          size="small"
        />
        <TextField
          defaultValue={product?.cofinsCst ?? ""}
          label="CST COFINS"
          name="cofinsCst"
          size="small"
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
        <TextField label="Nome" name={fieldName} required size="small" />
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
          <StatusChip
            label={item.active ? "Ativo" : "Inativo"}
            tone={item.active ? "success" : "neutral"}
          />
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
        <TextField label="Nome" name="supplierName" required size="small" />
        <TextField label="CPF/CNPJ" name="supplierDocument" size="small" />
        <div className="two-columns">
          <TextField label="Telefone" name="supplierPhone" size="small" />
          <TextField
            label="Email"
            name="supplierEmail"
            size="small"
            type="email"
          />
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
          <table className="responsive-card-table">
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
                  <td data-label="Nome">{supplier.name}</td>
                  <td data-label="Documento">{supplier.document ?? "-"}</td>
                  <td data-label="Telefone">{supplier.phone ?? "-"}</td>
                  <td data-label="Email">{supplier.email ?? "-"}</td>
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
        <TextField
          defaultValue={selectedClient?.personType ?? "PF"}
          label="Tipo de cliente"
          name="clientPersonType"
          select
          size="small"
          required
        >
          <MenuItem value="PF">Pessoa fisica</MenuItem>
          <MenuItem value="PJ">Pessoa juridica</MenuItem>
          <MenuItem value="ES">Estrangeiro</MenuItem>
        </TextField>
        <TextField
          label="Nome"
          name="clientName"
          defaultValue={selectedClient?.name}
          size="small"
          required
        />
        <TextField
          label="CPF/CNPJ"
          name="clientDocument"
          defaultValue={selectedClient?.document ?? ""}
          size="small"
        />
        <div className="two-columns">
          <TextField
            label="Telefone"
            name="clientPhone"
            defaultValue={selectedClient?.phone ?? ""}
            size="small"
          />
          <TextField
            label="Email"
            name="clientEmail"
            type="email"
            defaultValue={selectedClient?.email ?? ""}
            size="small"
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
          <table className="clients-table responsive-card-table">
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
                  <td data-label="Nome">
                    <strong>{client.name}</strong>
                    <span className="table-note">
                      {client.addressCity && client.addressState
                        ? `${client.addressCity}/${client.addressState}`
                        : "Sem endereco fiscal"}
                    </span>
                  </td>
                  <td data-label="Tipo">{client.personType}</td>
                  <td data-label="Documento">{client.document ?? "-"}</td>
                  <td data-label="Telefone">{client.phone ?? "-"}</td>
                  <td data-label="Status">
                    <StatusChip
                      label={client.active ? "Ativo" : "Inativo"}
                      tone={client.active ? "success" : "neutral"}
                    />
                  </td>
                  <td data-label="Acoes">
                    <div className="table-actions">
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
                    </div>
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
