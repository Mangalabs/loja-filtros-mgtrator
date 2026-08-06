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
import { useEffect, useRef, useState, type FormEvent } from "react";
import type {
  Client,
  ClientCompanyLookup,
  CommercialSettings,
  NamedEntity,
  Product,
  Supplier,
} from "../../api";
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
  TableActionsMenu,
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
            placeholder="Nome, código, fabricante ou locação"
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
          header: "Ações",
          render: (product) => (
            <div className="flex justify-end">
              <TableActionsMenu
                actions={[
                  {
                    icon: <Pencil size={15} />,
                    label: "Editar",
                    onSelect: () => onEdit(product),
                  },
                  {
                    icon: product.active ? (
                      <PowerOff size={15} />
                    ) : (
                      <Power size={15} />
                    ),
                    label: product.active ? "Inativar" : "Ativar",
                    onSelect: () => onChangeStatus(product),
                  },
                ]}
              />
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
  commercialSettings,
  product,
  onSubmit,
  onCancel,
  submitLabel,
}: {
  brands: NamedEntity[];
  commercialSettings: CommercialSettings | null;
  product?: Product;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel?: () => void;
  submitLabel: string;
}) {
  const defaultProfitMarginPercentage = Number(
    commercialSettings?.defaultProfitMarginPercentage ?? 0,
  );
  const [costPrice, setCostPrice] = useState(product?.costPrice ?? "");
  const [salePrice, setSalePrice] = useState(product?.salePrice ?? "");
  const [profitMarginPercentage, setProfitMarginPercentage] = useState(
    product?.profitMarginPercentage ?? String(defaultProfitMarginPercentage),
  );
  const [salePriceTouched, setSalePriceTouched] = useState(
    Boolean(product?.salePrice),
  );

  useEffect(() => {
    setCostPrice(product?.costPrice ?? "");
    setSalePrice(product?.salePrice ?? "");
    setProfitMarginPercentage(
      product?.profitMarginPercentage ?? String(defaultProfitMarginPercentage),
    );
    setSalePriceTouched(Boolean(product?.salePrice));
  }, [
    defaultProfitMarginPercentage,
    product?.costPrice,
    product?.id,
    product?.profitMarginPercentage,
    product?.salePrice,
  ]);

  useEffect(() => {
    if (salePriceTouched) {
      return;
    }

    setSalePrice(suggestedSalePrice(costPrice, profitMarginPercentage));
  }, [costPrice, profitMarginPercentage, salePriceTouched]);

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
          value={costPrice}
          onChange={(event) => setCostPrice(event.target.value)}
          slotProps={{ htmlInput: { step: "0.01" } }}
        />
        <TextField
          helperText={profitMarginHelperText(defaultProfitMarginPercentage)}
          label="Margem de lucro (%)"
          name="profitMarginPercentage"
          type="number"
          value={profitMarginPercentage}
          onChange={(event) => {
            setProfitMarginPercentage(event.target.value);
            setSalePriceTouched(false);
          }}
          slotProps={{ htmlInput: { min: "0", max: "1000", step: "0.01" } }}
        />
      </FormRow>
      <FormRow columns={3}>
        <TextField
          helperText={salePriceHelperText(profitMarginPercentage)}
          label="Venda"
          name="salePrice"
          type="number"
          value={salePrice}
          onChange={(event) => {
            setSalePrice(event.target.value);
            setSalePriceTouched(true);
          }}
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
        helperText="Texto exibido em orçamentos quando precisar separar o nome interno do texto comercial."
        label="Descrição comercial para orçamento"
        multiline
        name="description"
        rows={3}
        slotProps={{ htmlInput: { maxLength: 1000 } }}
      />
      <div className="grid gap-1 border-t border-[#e4e9e5] pt-4">
        <strong className="text-[#2c281e]">Tributacao para NF-e</strong>
        <span className="text-sm text-[#5f665f]">
          Campos usados pela integração fiscal quando houver emissão de nota.
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

function suggestedSalePrice(costPrice: string, profitMarginPercentage: string) {
  const cost = Number(costPrice);
  const margin = Number(profitMarginPercentage);

  if (!Number.isFinite(cost) || !Number.isFinite(margin) || cost <= 0) {
    return "";
  }

  return (cost * (1 + margin / 100)).toFixed(2);
}

function salePriceHelperText(profitMarginPercentage: string) {
  const margin = Number(profitMarginPercentage);

  if (!Number.isFinite(margin) || margin <= 0) {
    return "Configure uma margem comercial para sugerir o preço automaticamente.";
  }

  return `Sugestao automatica pela margem de ${margin.toLocaleString("pt-BR")}%`;
}

function profitMarginHelperText(defaultProfitMarginPercentage: number) {
  return `Preenchido pela margem padrão de ${defaultProfitMarginPercentage.toLocaleString("pt-BR")}%, mas pode variar por produto.`;
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
  onLookupCompany,
  onEdit,
  onCancel,
  onChangeStatus,
}: {
  clients: Client[];
  selectedClient?: Client;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onLookupCompany: (cnpj: string) => Promise<ClientCompanyLookup>;
  onEdit: (client: Client) => void;
  onCancel: () => void;
  onChangeStatus: (client: Client) => void;
}) {
  const { pagination, visibleItems } = usePaginatedRows<Client>(clients);
  const formRef = useRef<HTMLFormElement>(null);
  const [lookupState, setLookupState] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [lookupValues, setLookupValues] = useState<
    Record<string, string | null>
  >({});

  async function lookupCompany() {
    const formElement = formRef.current;
    const documentInput = formElement?.elements.namedItem(
      "clientDocument",
    ) as HTMLInputElement | null;
    const document = documentInput?.value.trim() ?? "";

    if (!document) {
      setLookupState("error");
      return;
    }

    setLookupState("loading");

    try {
      setLookupValues(clientLookupValues(await onLookupCompany(document)));
      setLookupState("success");
    } catch {
      setLookupState("error");
    }
  }

  function clientFieldValue(
    name: string,
    defaultValue: string | null | undefined,
  ) {
    return lookupValues[name] ?? defaultValue ?? "";
  }

  function updateLookupValue(name: string, value: string) {
    setLookupValues((currentValues) => ({
      ...currentValues,
      [name]: value,
    }));
  }

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(320px,0.75fr)_minmax(0,1.25fr)]">
      <FormGrid
        key={selectedClient?.id ?? "new"}
        ref={formRef}
        onSubmit={onSubmit}
      >
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
          value={clientFieldValue("clientName", selectedClient?.name)}
          onChange={(event) =>
            updateLookupValue("clientName", event.target.value)
          }
          required
        />
        <TextField
          label="CPF/CNPJ"
          name="clientDocument"
          value={clientFieldValue("clientDocument", selectedClient?.document)}
          onChange={(event) =>
            updateLookupValue("clientDocument", event.target.value)
          }
        />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm text-[#5f665f]">
            {clientLookupStatusLabel[lookupState]}
          </span>
          <SecondaryButton
            type="button"
            disabled={lookupState === "loading"}
            onClick={() => void lookupCompany()}
          >
            Buscar CNPJ
          </SecondaryButton>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            label="Telefone"
            name="clientPhone"
            value={clientFieldValue("clientPhone", selectedClient?.phone)}
            onChange={(event) =>
              updateLookupValue("clientPhone", event.target.value)
            }
          />
          <TextField
            label="Email"
            name="clientEmail"
            type="email"
            value={clientFieldValue("clientEmail", selectedClient?.email)}
            onChange={(event) =>
              updateLookupValue("clientEmail", event.target.value)
            }
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
            label="Inscricao estadual"
            name="clientStateRegistration"
            value={clientFieldValue(
              "clientStateRegistration",
              selectedClient?.stateRegistration,
            )}
            helperText="Consultas publicas de CNPJ normalmente nao retornam IE."
            onChange={(event) =>
              updateLookupValue("clientStateRegistration", event.target.value)
            }
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
          label="Logradouro"
          name="clientAddressStreet"
          value={clientFieldValue(
            "clientAddressStreet",
            selectedClient?.addressStreet,
          )}
          onChange={(event) =>
            updateLookupValue("clientAddressStreet", event.target.value)
          }
        />
        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            label="Número"
            name="clientAddressNumber"
            value={clientFieldValue(
              "clientAddressNumber",
              selectedClient?.addressNumber,
            )}
            onChange={(event) =>
              updateLookupValue("clientAddressNumber", event.target.value)
            }
          />
          <TextField
            label="Complemento"
            name="clientAddressComplement"
            value={clientFieldValue(
              "clientAddressComplement",
              selectedClient?.addressComplement,
            )}
            onChange={(event) =>
              updateLookupValue("clientAddressComplement", event.target.value)
            }
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            label="Bairro"
            name="clientAddressDistrict"
            value={clientFieldValue(
              "clientAddressDistrict",
              selectedClient?.addressDistrict,
            )}
            onChange={(event) =>
              updateLookupValue("clientAddressDistrict", event.target.value)
            }
          />
          <TextField
            label="Cidade"
            name="clientAddressCity"
            value={clientFieldValue(
              "clientAddressCity",
              selectedClient?.addressCity,
            )}
            onChange={(event) =>
              updateLookupValue("clientAddressCity", event.target.value)
            }
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <TextField
            label="UF"
            name="clientAddressState"
            value={clientFieldValue(
              "clientAddressState",
              selectedClient?.addressState,
            )}
            onChange={(event) =>
              updateLookupValue("clientAddressState", event.target.value)
            }
          />
          <TextField
            label="CEP"
            name="clientAddressZipCode"
            value={clientFieldValue(
              "clientAddressZipCode",
              selectedClient?.addressZipCode,
            )}
            onChange={(event) =>
              updateLookupValue("clientAddressZipCode", event.target.value)
            }
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
              header: "Ações",
              render: (client) => (
                <div className="flex justify-end">
                  <TableActionsMenu
                    actions={[
                      {
                        icon: <Pencil size={14} />,
                        label: "Editar",
                        onSelect: () => onEdit(client),
                      },
                      {
                        icon: client.active ? (
                          <PowerOff size={14} />
                        ) : (
                          <Power size={14} />
                        ),
                        label: client.active ? "Inativar" : "Ativar",
                        onSelect: () => onChangeStatus(client),
                      },
                    ]}
                  />
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

const clientLookupStatusLabel: Record<
  "idle" | "loading" | "success" | "error",
  string
> = {
  error: "Informe um CNPJ valido ou tente novamente.",
  idle: "Preencha o CNPJ e busque os dados fiscais.",
  loading: "Consultando CNPJ...",
  success: "Dados encontrados. Revise antes de salvar.",
};

function clientLookupValues(company: ClientCompanyLookup) {
  return {
    clientAddressCity: company.addressCity,
    clientAddressComplement: company.addressComplement,
    clientAddressDistrict: company.addressDistrict,
    clientAddressNumber: company.addressNumber,
    clientAddressState: company.addressState,
    clientAddressStreet: company.addressStreet,
    clientAddressZipCode: company.addressZipCode,
    clientDocument: company.document,
    clientEmail: company.email,
    clientName: company.name,
    clientPhone: company.phone,
    clientStateRegistration: company.stateRegistration,
  };
}
