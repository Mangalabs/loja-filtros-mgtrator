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
  ActionGroup,
  FormGrid,
  FormRow,
  PageHeader,
  PagePanel,
  ResponsiveTable,
} from "../../components/layout";
import {
  PrimaryButton,
  SecondaryButton,
  StatusChip,
  TableActionButton,
} from "../../components/ui";
import { usePaginatedRows } from "../../hooks/usePaginatedRows";
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
    <PagePanel wide>
      <PageHeader
        actions={
          <TextField
            className="min-w-full md:min-w-80"
            label="Buscar produto"
            placeholder="Nome, codigo, fabricante ou locacao"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        }
        description={state === "loading" ? "Carregando..." : "Dados do backend"}
        title="Lista de produtos"
      />

      <ProductTable
        products={products}
        resetKey={search}
        onEdit={onEdit}
        onChangeStatus={onChangeStatus}
      />
    </PagePanel>
  );
}

function ProductTable({
  products,
  resetKey,
  onEdit,
  onChangeStatus,
}: {
  products: Product[];
  resetKey: string;
  onEdit: (product: Product) => void;
  onChangeStatus: (product: Product) => void;
}) {
  const { pagination, visibleItems } = usePaginatedRows(products, resetKey);

  return (
    <ResponsiveTable
      columns={[
        {
          header: "Produto",
          render: (product) => productDisplayName(product),
        },
        {
          header: "Codigo",
          render: (product) => product.internalCode ?? "-",
        },
        {
          header: "Fabricante",
          render: (product) => product.brandName ?? "-",
        },
        {
          header: "Un.",
          render: (product) => product.unit,
        },
        {
          header: "Locacao",
          render: (product) => product.location ?? "-",
        },
        {
          align: "right",
          header: "Fisico",
          render: (product) => formatQuantity(product.currentStock),
        },
        {
          align: "right",
          header: "Reservado",
          render: (product) => formatQuantity(product.reservedStock),
        },
        {
          align: "right",
          header: "Disponivel",
          render: (product) => formatQuantity(product.availableStock),
        },
        {
          align: "right",
          header: "Venda",
          render: (product) => formatCurrency(product.salePrice),
        },
        {
          header: "Status",
          render: (product) => (
            <StatusChip
              label={product.active ? "Ativo" : "Inativo"}
              tone={product.active ? "success" : "neutral"}
            />
          ),
        },
        {
          align: "right",
          header: "Acoes",
          render: (product) => (
            <div className="flex flex-wrap justify-end gap-2">
              <TableActionButton
                icon={<Pencil size={15} />}
                type="button"
                onClick={() => onEdit(product)}
              >
                Editar
              </TableActionButton>
              <TableActionButton
                icon={
                  product.active ? <PowerOff size={15} /> : <Power size={15} />
                }
                type="button"
                onClick={() => onChangeStatus(product)}
              >
                {product.active ? "Inativar" : "Ativar"}
              </TableActionButton>
            </div>
          ),
        },
      ]}
      emptyMessage="Nenhum produto encontrado."
      getRowId={(product) => product.id}
      items={visibleItems}
      pagination={pagination}
    />
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
    <FormGrid className="max-w-5xl gap-5" onSubmit={onSubmit}>
      <PageHeader
        icon={product ? <Pencil size={18} /> : <PackagePlus size={18} />}
        title={product ? "Editar produto" : "Dados do produto"}
      />
      <TextField
        label="Nome do produto"
        name="productName"
        defaultValue={product?.name}
        required
      />
      <FormRow>
        <TextField
          label="Codigo interno"
          name="internalCode"
          defaultValue={product?.internalCode ?? ""}
        />
        <TextField
          label="Codigo de barras"
          name="barcode"
          defaultValue={product?.barcode ?? ""}
        />
      </FormRow>
      <FormRow>
        <TextField
          defaultValue={product?.brandId ?? ""}
          label="Fabricante"
          name="brandId"
          select
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
        />
      </FormRow>
      <FormRow columns={3}>
        <TextField
          defaultValue={product?.unit ?? "UN"}
          label="Unidade"
          name="unit"
          select
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
          slotProps={{ htmlInput: { step: "0.01" } }}
        />
        <TextField
          label="Venda"
          name="salePrice"
          type="number"
          defaultValue={product?.salePrice}
          slotProps={{ htmlInput: { step: "0.01" } }}
        />
      </FormRow>
      <FormRow columns={3}>
        <TextField
          label="Estoque min."
          name="minimumStock"
          type="number"
          defaultValue={product?.minimumStock}
          slotProps={{ htmlInput: { step: "0.001" } }}
        />
        <TextField
          label="NCM"
          name="ncm"
          defaultValue={product?.ncm ?? ""}
        />
        <TextField
          label="CEST"
          name="cest"
          defaultValue={product?.cest ?? ""}
        />
      </FormRow>
      <FormRow>
        <TextField
          label="CFOP"
          name="cfop"
          defaultValue={product?.cfop ?? ""}
          slotProps={{ htmlInput: { maxLength: 4 } }}
        />
        <TextField
          label="Origem fiscal"
          name="origin"
          defaultValue={product?.origin ?? ""}
          slotProps={{ htmlInput: { maxLength: 2 } }}
        />
      </FormRow>
      <TextField
        defaultValue={product?.description ?? ""}
        helperText="Texto exibido em orcamentos quando precisar separar o nome interno do texto comercial."
        label="Descricao comercial para orcamento"
        multiline
        name="description"
        rows={3}
        slotProps={{ htmlInput: { maxLength: 1000 } }}
      />
      <div className="grid gap-1 border-t border-[#e4e9e5] pt-4">
        <strong className="text-[#2c281e]">Tributacao para NF-e</strong>
        <span className="text-sm text-[#5f665f]">
          Campos usados pela integracao fiscal quando houver emissao de nota.
        </span>
      </div>
      <FormRow columns={3}>
        <TextField
          defaultValue={product?.icmsCst ?? ""}
          label="CST/CSOSN ICMS"
          name="icmsCst"
        />
        <TextField
          defaultValue={product?.pisCst ?? ""}
          label="CST PIS"
          name="pisCst"
        />
        <TextField
          defaultValue={product?.cofinsCst ?? ""}
          label="CST COFINS"
          name="cofinsCst"
        />
      </FormRow>
      <ActionGroup className="mt-1">
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
      </ActionGroup>
    </FormGrid>
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
    <section className="grid gap-4 xl:grid-cols-[minmax(280px,0.7fr)_minmax(0,1.3fr)]">
      <FormGrid onSubmit={onSubmit}>
        <PageHeader icon={<Tags size={18} />} title="Novo registro" />
        <TextField label="Nome" name={fieldName} required />
        <PrimaryButton icon={<Plus size={17} />} type="submit">
          Cadastrar
        </PrimaryButton>
      </FormGrid>

      <EntityList title={title} items={items} />
    </section>
  );
}

function EntityList({ title, items }: { title: string; items: NamedEntity[] }) {
  return (
    <PagePanel>
      <PageHeader
        actions={
          <span className="text-sm text-[#5f665f]">
            {items.length} registros
          </span>
        }
        title={`${title} cadastrados`}
      />
      <div className="grid gap-2">
        {items.map((item) => (
          <div
            className="flex min-h-11 items-center justify-between gap-3 border-b border-[#e4e9e5] py-2 last:border-b-0"
            key={item.id}
          >
            <strong>{item.name}</strong>
            <StatusChip
              label={item.active ? "Ativo" : "Inativo"}
              tone={item.active ? "success" : "neutral"}
            />
          </div>
        ))}
        {items.length === 0 ? (
          <p className="m-0 text-sm text-[#5f665f]">
            Nenhum registro cadastrado.
          </p>
        ) : null}
      </div>
    </PagePanel>
  );
}

export function SuppliersPage({
  suppliers,
  onSubmit,
}: {
  suppliers: Supplier[];
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const { pagination, visibleItems } = usePaginatedRows<Supplier>(suppliers);

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(300px,0.7fr)_minmax(0,1.3fr)]">
      <FormGrid onSubmit={onSubmit}>
        <PageHeader icon={<Truck size={18} />} title="Novo fornecedor" />
        <TextField label="Nome" name="supplierName" required />
        <TextField label="CPF/CNPJ" name="supplierDocument" />
        <FormRow>
          <TextField label="Telefone" name="supplierPhone" />
          <TextField
            label="Email"
            name="supplierEmail"
            type="email"
          />
        </FormRow>
        <PrimaryButton icon={<Plus size={17} />} type="submit">
          Cadastrar fornecedor
        </PrimaryButton>
      </FormGrid>

      <PagePanel wide>
        <PageHeader
          actions={
            <span className="text-sm text-[#5f665f]">
              {suppliers.length} registros
            </span>
          }
          title="Fornecedores cadastrados"
        />
        <ResponsiveTable
          columns={[
            {
              header: "Nome",
              render: (supplier) => supplier.name,
            },
            {
              header: "Documento",
              render: (supplier) => supplier.document ?? "-",
            },
            {
              header: "Telefone",
              render: (supplier) => supplier.phone ?? "-",
            },
            {
              header: "Email",
              render: (supplier) => supplier.email ?? "-",
            },
          ]}
          emptyMessage="Nenhum fornecedor cadastrado."
          getRowId={(supplier) => supplier.id}
          items={visibleItems}
          pagination={pagination}
        />
      </PagePanel>
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
  const { pagination, visibleItems } = usePaginatedRows<Client>(clients);

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(320px,0.75fr)_minmax(0,1.25fr)]">
      <FormGrid key={selectedClient?.id ?? "new"} onSubmit={onSubmit}>
        <PageHeader
          icon={<UserRound size={18} />}
          title={selectedClient ? "Editar cliente" : "Novo cliente"}
        />
        <TextField
          defaultValue={selectedClient?.personType ?? "PF"}
          label="Tipo de cliente"
          name="clientPersonType"
          select
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
          required
        />
        <TextField
          label="CPF/CNPJ"
          name="clientDocument"
          defaultValue={selectedClient?.document ?? ""}
        />
        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            label="Telefone"
            name="clientPhone"
            defaultValue={selectedClient?.phone ?? ""}
          />
          <TextField
            label="Email"
            name="clientEmail"
            type="email"
            defaultValue={selectedClient?.email ?? ""}
          />
        </div>
        <div className="grid gap-1 border-t border-[#e4e9e5] pt-4">
          <strong className="text-[#2c281e]">Dados fiscais para NF-e</strong>
          <span className="text-sm text-[#5f665f]">
            Preencha quando o cliente solicitar nota fiscal.
          </span>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            defaultValue={selectedClient?.stateRegistration ?? ""}
            label="Inscricao estadual"
            name="clientStateRegistration"
          />
          <TextField
            defaultValue={selectedClient?.stateRegistrationIndicator ?? "9"}
            label="Indicador IE"
            name="clientStateRegistrationIndicator"
            select
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
        />
        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            defaultValue={selectedClient?.addressNumber ?? ""}
            label="Numero"
            name="clientAddressNumber"
          />
          <TextField
            defaultValue={selectedClient?.addressComplement ?? ""}
            label="Complemento"
            name="clientAddressComplement"
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            defaultValue={selectedClient?.addressDistrict ?? ""}
            label="Bairro"
            name="clientAddressDistrict"
          />
          <TextField
            defaultValue={selectedClient?.addressCity ?? ""}
            label="Cidade"
            name="clientAddressCity"
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            defaultValue={selectedClient?.addressState ?? ""}
            label="UF"
            name="clientAddressState"
          />
          <TextField
            defaultValue={selectedClient?.addressZipCode ?? ""}
            label="CEP"
            name="clientAddressZipCode"
          />
        </div>
        <div className="mt-1 flex flex-wrap justify-end gap-2">
          {selectedClient ? (
            <SecondaryButton type="button" onClick={onCancel}>
              Cancelar
            </SecondaryButton>
          ) : null}
          <PrimaryButton icon={<Plus size={17} />} type="submit">
            {selectedClient ? "Salvar alteracoes" : "Cadastrar cliente"}
          </PrimaryButton>
        </div>
      </FormGrid>

      <PagePanel wide>
        <PageHeader
          actions={
            <span className="text-sm text-[#5f665f]">
              {clients.length} registros
            </span>
          }
          title="Clientes cadastrados"
        />
        <ResponsiveTable
          columns={[
            {
              header: "Nome",
              render: (client) => (
                <>
                  <strong>{client.name}</strong>
                  <span className="mt-1 block text-xs text-[#5f665f]">
                    {client.addressCity && client.addressState
                      ? `${client.addressCity}/${client.addressState}`
                      : "Sem endereco fiscal"}
                  </span>
                </>
              ),
            },
            {
              header: "Tipo",
              render: (client) => client.personType,
            },
            {
              header: "Documento",
              render: (client) => client.document ?? "-",
            },
            {
              header: "Telefone",
              render: (client) => client.phone ?? "-",
            },
            {
              header: "Status",
              render: (client) => (
                <StatusChip
                  label={client.active ? "Ativo" : "Inativo"}
                  tone={client.active ? "success" : "neutral"}
                />
              ),
            },
            {
              align: "right",
              header: "Acoes",
              render: (client) => (
                <div className="flex flex-wrap justify-end gap-2">
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
              ),
            },
          ]}
          emptyMessage="Nenhum cliente cadastrado."
          getRowId={(client) => client.id}
          items={visibleItems}
          pagination={pagination}
        />
      </PagePanel>
    </section>
  );
}
