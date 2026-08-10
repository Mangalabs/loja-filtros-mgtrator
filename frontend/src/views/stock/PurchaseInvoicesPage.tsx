import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import TextField from "@mui/material/TextField";
import {
  FileText,
  PackageCheck,
  PackagePlus,
  RotateCcw,
  Save,
  Upload,
} from "lucide-react";
import { useState, type ChangeEvent, type FormEvent } from "react";
import type {
  Product,
  PurchaseInvoice,
  PurchaseInvoiceDraft,
  Supplier,
} from "../../api";
import { ProductSearchField } from "../../components/ProductSearchField";
import {
  FormCard,
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
  TableActionsMenu,
} from "../../components/ui";
import { usePaginatedRows } from "../../hooks/usePaginatedRows";
import { formatCurrency, formatDate } from "../../utils/format";
import { productDisplayName } from "../../utils/productDisplay";

type PurchaseInvoicesPageProps = {
  invoices: PurchaseInvoice[];
  products: Product[];
  suppliers: Supplier[];
  onCreateProductFromItem: (
    item: PurchaseInvoiceDraft["items"][number],
  ) => Promise<Product | null>;
  onParseXml: (xmlContent: string) => Promise<PurchaseInvoiceDraft | null>;
  onPostInvoice: (invoice: PurchaseInvoice) => void;
  onSaveReview: (
    input: PurchaseInvoiceDraft,
    invoiceId?: string,
  ) => Promise<void>;
};

export function PurchaseInvoicesPage({
  invoices,
  products,
  suppliers,
  onCreateProductFromItem,
  onParseXml,
  onPostInvoice,
  onSaveReview,
}: PurchaseInvoicesPageProps) {
  const [draft, setDraft] = useState<PurchaseInvoiceDraft | null>(null);
  const [reviewInvoiceId, setReviewInvoiceId] = useState<string>();
  const [xmlContent, setXmlContent] = useState("");
  const [xmlFileName, setXmlFileName] = useState("");
  const [xmlFileError, setXmlFileError] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<PurchaseInvoiceStatusFilter>("ALL");
  const filteredInvoices = filterPurchaseInvoices(invoices, statusFilter);
  const statusSummary = purchaseInvoiceStatusSummary(invoices);
  const { pagination, visibleItems } =
    usePaginatedRows<PurchaseInvoice>(filteredInvoices);
  const reviewKey = reviewInvoiceId ?? draft?.accessKey ?? "new-purchase";

  async function parseXml(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsedInvoice = await onParseXml(xmlContent);

    if (parsedInvoice) {
      setDraft(parsedInvoice);
      setReviewInvoiceId(undefined);
    }
  }

  async function selectXmlFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    setXmlFileName(file.name);
    setXmlFileError("");

    try {
      setXmlContent(await file.text());
    } catch {
      setXmlFileError("Nao foi possivel ler o arquivo XML selecionado.");
    }
  }

  async function saveReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!draft) {
      return;
    }

    await onSaveReview(
      reviewInputFromForm(new FormData(event.currentTarget), draft),
      reviewInvoiceId,
    );
    clearReview();
  }

  function reviewInvoice(invoice: PurchaseInvoice) {
    setDraft(draftFromInvoice(invoice));
    setReviewInvoiceId(invoice.id);
    setXmlContent("");
  }

  function clearReview() {
    setDraft(null);
    setReviewInvoiceId(undefined);
    setXmlContent("");
    setXmlFileName("");
    setXmlFileError("");
  }

  async function createProductFromItem(index: number) {
    if (!draft) {
      return;
    }

    const product = await onCreateProductFromItem(draft.items[index]);

    if (!product) {
      return;
    }

    setDraft({
      ...draft,
      items: draft.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, productId: product.id } : item,
      ),
    });
  }

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(320px,0.8fr)_minmax(0,1.2fr)]">
      <div className="grid content-start gap-4">
        <FormGrid onSubmit={parseXml}>
          <PageHeader
            description="Selecione o XML da NF-e de compra para preencher a revisão antes da entrada no estoque."
            icon={<Upload size={18} />}
            title="Importar XML de compra"
          />
          <Button
            component="label"
            startIcon={<Upload size={17} />}
            variant="outlined"
            sx={{
              borderColor: "#cfd8d5",
              borderRadius: 2,
              color: "#203466",
              justifyContent: "flex-start",
              minHeight: 44,
            }}
          >
            Escolher arquivo XML
            <input
              accept=".xml,application/xml,text/xml"
              hidden
              type="file"
              onChange={selectXmlFile}
            />
          </Button>
          {xmlFileName ? (
            <span className="text-sm text-[#5f665f]">
              Arquivo selecionado: {xmlFileName}
            </span>
          ) : null}
          {xmlFileError ? <Alert severity="error">{xmlFileError}</Alert> : null}
          <Alert severity="info">
            Depois de selecionar o arquivo, o sistema le o XML e abre os campos
            editaveis de conferencia da compra.
          </Alert>
          <PrimaryButton
            disabled={!xmlContent.trim()}
            icon={<FileText size={17} />}
            type="submit"
          >
            Ler XML para revisar
          </PrimaryButton>
        </FormGrid>

        {draft ? (
          <FormGrid key={reviewKey} onSubmit={saveReview}>
            <PageHeader
              actions={
                <SecondaryButton
                  icon={<RotateCcw size={16} />}
                  type="button"
                  onClick={clearReview}
                >
                  Cancelar revisão
                </SecondaryButton>
              }
              description="Confira fornecedor, valores e vincule o produto interno correto em cada item."
              title={
                reviewInvoiceId ? "Revisar compra importada" : "Revisar XML lido"
              }
            />

            <Alert severity="info">
              Esta etapa ainda não atualiza estoque. Ela salva a compra
              importada para depois confirmar a entrada.
            </Alert>

            <FormSection
              description="Dados extraídos do XML. Ajuste antes de salvar a revisão."
              title="Dados gerais"
            >
              <FormRow>
                <TextField
                  defaultValue={draft.number ?? ""}
                  label="Número"
                  name="purchaseNumber"
                />
                <TextField
                  defaultValue={draft.series ?? ""}
                  label="Serie"
                  name="purchaseSeries"
                />
              </FormRow>
              <FormRow>
                <TextField
                  defaultValue={draft.issueDate ?? ""}
                  label="Data de emissão"
                  name="purchaseIssueDate"
                  type="date"
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <TextField
                  defaultValue="Importada para revisão"
                  label="Situacao"
                  disabled
                />
              </FormRow>
              <TextField
                defaultValue={draft.supplierName}
                label="Fornecedor do XML"
                name="purchaseSupplierName"
                required
              />
              <FormRow>
                <TextField
                  defaultValue={draft.supplierDocument ?? ""}
                  label="Documento do fornecedor"
                  name="purchaseSupplierDocument"
                />
                <TextField
                  defaultValue={draft.supplierId ?? ""}
                  label="Fornecedor cadastrado"
                  name="purchaseSupplierId"
                  select
                >
                  <MenuItem value="">Sem vinculo</MenuItem>
                  {suppliers
                    .filter((supplier) => supplier.active)
                    .map((supplier) => (
                      <MenuItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </MenuItem>
                    ))}
                </TextField>
              </FormRow>
              <FormControlLabel
                control={
                  <Checkbox
                    disabled={!draft.supplierName.trim()}
                    name="purchaseCreateSupplier"
                    value="yes"
                  />
                }
                label="Cadastrar este fornecedor automaticamente ao salvar a revisão"
              />
            </FormSection>

            <FormSection
              description="Confirme cada produto interno. Codigos podem repetir entre fabricantes diferentes."
              title="Produtos"
            >
              <div className="grid gap-3">
                {draft.items.map((item, index) => (
                  <PurchaseInvoiceItemReview
                    index={index}
                    item={item}
                    key={`${reviewKey}-${item.position}-${index}`}
                    products={products}
                    onCreateProduct={() => void createProductFromItem(index)}
                  />
                ))}
              </div>
            </FormSection>

            <FormSection
              description="Dado extraido do XML para conferencia. A vinculacao completa da transportadora sera persistida em recorte proprio."
              title="Transporte"
            >
              <FormRow>
                <TextField
                  defaultValue={draft.transporterName ?? ""}
                  label="Transportadora"
                  name="purchaseTransporterName"
                />
                <TextField
                  defaultValue={draft.transporterDocument ?? ""}
                  label="Documento da transportadora"
                  name="purchaseTransporterDocument"
                />
              </FormRow>
            </FormSection>

            <FormSection
              description="Parcelas extraidas da NF-e para conferencia. A baixa financeira entra em recorte futuro."
              title="Pagamento"
            >
              <PurchaseInvoiceInstallments installments={draft.installments} />
            </FormSection>

            <FormSection
              description="Frete, anexos e observacoes entram em recortes futuros com campos persistidos."
              title="Total"
            >
              <FormRow>
                <TextField
                  defaultValue={purchaseItemsTotal(draft)}
                  label="Produtos"
                  type="number"
                  disabled
                  slotProps={{ htmlInput: { step: "0.01" } }}
                />
                <TextField
                  defaultValue={draft.totalAmount}
                  label="Valor total da NF-e"
                  name="purchaseTotalAmount"
                  type="number"
                  slotProps={{ htmlInput: { min: "0", step: "0.01" } }}
                  required
                />
              </FormRow>
            </FormSection>

            <PrimaryButton icon={<Save size={17} />} type="submit">
              Salvar revisão da compra
            </PrimaryButton>
          </FormGrid>
        ) : null}
      </div>

      <PagePanel wide>
        <PageHeader
          actions={
            <span className="text-sm text-[#5f665f]">
              {filteredInvoices.length} de {invoices.length} compras
            </span>
          }
          title="Compras importadas"
        />
        <div className="mb-4 grid gap-3 md:grid-cols-3">
          {purchaseInvoiceStatusCards.map((card) => (
            <PurchaseInvoiceStatusCard
              key={card.status}
              label={card.label}
              value={statusSummary[card.status]}
              tone={card.tone}
            />
          ))}
        </div>
        <ToggleButtonGroup
          aria-label="Filtrar compras por status"
          color="primary"
          exclusive
          size="small"
          value={statusFilter}
          onChange={(_event, value: PurchaseInvoiceStatusFilter | null) =>
            setStatusFilter(value ?? "ALL")
          }
          sx={{
            flexWrap: "wrap",
            gap: 1,
            mb: 1,
            "& .MuiToggleButtonGroup-grouped": {
              border: "1px solid #cfd8d5 !important",
              borderRadius: "10px !important",
              color: "#203466",
              px: 1.5,
            },
          }}
        >
          <ToggleButton value="ALL">Todas</ToggleButton>
          <ToggleButton value="IMPORTED">Prontas para revisar/lancar</ToggleButton>
          <ToggleButton value="POSTED">Lancadas</ToggleButton>
          <ToggleButton value="CANCELLED">Canceladas</ToggleButton>
        </ToggleButtonGroup>
        <ResponsiveTable
          columns={[
            {
              header: "Status",
              render: (invoice) => (
                <StatusChip
                  label={purchaseInvoiceStatusLabels[invoice.status]}
                  tone={purchaseInvoiceStatusTones[invoice.status]}
                />
              ),
            },
            {
              header: "Fornecedor",
              render: (invoice) => invoice.supplierName,
            },
            {
              header: "Número",
              render: (invoice) =>
                [invoice.number, invoice.series].filter(Boolean).join(" / ") ||
                "-",
            },
            {
              header: "Emissão",
              render: (invoice) =>
                invoice.issueDate ? formatDate(invoice.issueDate) : "-",
            },
            {
              align: "right",
              header: "Total",
              render: (invoice) => formatCurrency(invoice.totalAmount),
            },
            {
              align: "center",
              header: "Itens",
              render: (invoice) => invoice.items.length,
            },
            {
              align: "center",
              header: "Ações",
              render: (invoice) => (
                <TableActionsMenu
                  actions={[
                    {
                      disabled: invoice.status !== "IMPORTED",
                      icon: <FileText size={16} />,
                      label: "Revisar dados",
                      onSelect: () => reviewInvoice(invoice),
                    },
                    {
                      disabled: invoice.status !== "IMPORTED",
                      icon: <PackageCheck size={16} />,
                      label: "Lancar no estoque",
                      onSelect: () => onPostInvoice(invoice),
                    },
                  ]}
                />
              ),
            },
          ]}
          emptyMessage="Nenhuma compra importada."
          getRowId={(invoice) => invoice.id}
          items={visibleItems}
          pagination={pagination}
        />
      </PagePanel>
    </section>
  );
}

function PurchaseInvoiceStatusCard({
  label,
  tone,
  value,
}: {
  label: string;
  tone: "success" | "warning" | "error";
  value: number;
}) {
  return (
    <div className="rounded-xl border border-[#dfe5e1] bg-[#fbfcfb] p-4">
      <span className="block text-xs font-bold uppercase tracking-wide text-[#5f665f]">
        {label}
      </span>
      <div className="mt-2 flex items-center justify-between gap-3">
        <strong className="text-2xl text-[#2c281e]">{value}</strong>
        <StatusChip label={purchaseInvoiceStatusToneLabels[tone]} tone={tone} />
      </div>
    </div>
  );
}

function PurchaseInvoiceInstallments({
  installments = [],
}: {
  installments?: PurchaseInvoiceDraft["installments"];
}) {
  if (installments.length === 0) {
    return (
      <Alert severity="info">
        Nenhum parcelamento foi identificado no XML selecionado.
      </Alert>
    );
  }

  return (
    <div className="grid gap-3">
      {installments.map((installment, index) => (
        <FormCard key={`${installment.number ?? "parcela"}-${index}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <strong className="text-[#2c281e]">Parcela {index + 1}</strong>
            <span className="text-sm text-[#5f665f]">
              Número {installment.number ?? "-"}
            </span>
          </div>
          <FormRow>
            <TextField
              defaultValue={installment.dueDate ?? ""}
              label="Vencimento"
              name={`purchaseInstallmentDueDate_${index}`}
              type="date"
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              defaultValue={installment.value}
              label="Valor"
              name={`purchaseInstallmentValue_${index}`}
              type="number"
              slotProps={{ htmlInput: { min: "0", step: "0.01" } }}
            />
            <input
              name={`purchaseInstallmentNumber_${index}`}
              type="hidden"
              value={installment.number ?? ""}
            />
          </FormRow>
        </FormCard>
      ))}
    </div>
  );
}

function PurchaseInvoiceItemReview({
  index,
  item,
  onCreateProduct,
  products,
}: {
  index: number;
  item: PurchaseInvoiceDraft["items"][number];
  onCreateProduct: () => void;
  products: Product[];
}) {
  const candidateProducts = purchaseItemProductCandidates(item, products);

  return (
    <FormCard>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <strong className="text-[#2c281e]">Item {index + 1}</strong>
          <span className="text-sm text-[#5f665f]">
            {item.description}
          </span>
        </div>
        <span className="rounded-full bg-[#f3f5f4] px-3 py-1 text-xs font-bold text-[#203466]">
          XML: {item.supplierProductCode ?? "sem codigo"}
        </span>
      </div>

      <ProductSearchField
        defaultValue={item.productId ?? ""}
        helperText="Confirme o produto interno correto. Use nome, código, fabricante ou locação."
        label="Produto interno"
        name={`purchaseItemProductId_${index}`}
        products={products}
        size="small"
        stockLabel="current"
      />
      {candidateProducts.length > 0 ? (
        <div className="grid gap-2 rounded-lg border border-[#e6ebe8] bg-white p-3">
          <span className="text-xs font-bold uppercase tracking-wide text-[#5f665f]">
            Possiveis produtos internos
          </span>
          <div className="flex flex-wrap gap-2">
            {candidateProducts.map((product) => (
              <Chip
                key={product.id}
                label={purchaseCandidateLabel(product)}
                size="small"
                sx={{
                  bgcolor: "#f4f6f8",
                  color: "#203466",
                  fontWeight: 700,
                }}
              />
            ))}
          </div>
        </div>
      ) : null}
      <div className="flex justify-end">
        <SecondaryButton
          icon={<PackagePlus size={16} />}
          type="button"
          onClick={onCreateProduct}
        >
          Criar produto deste item
        </SecondaryButton>
      </div>
      <TextField
        defaultValue={item.description}
        label="Detalhes / descricao do XML"
        name={`purchaseItemDescription_${index}`}
        required
      />
      <FormRow columns={3}>
        <TextField
          defaultValue={item.quantity}
          label="Quantidade"
          name={`purchaseItemQuantity_${index}`}
          type="number"
          slotProps={{ htmlInput: { min: "0.001", step: "0.001" } }}
          required
        />
        <TextField
          defaultValue={item.unit ?? ""}
          label="Unidade"
          name={`purchaseItemUnit_${index}`}
        />
        <TextField
          defaultValue={item.unitCost}
          label="Valor unitario"
          name={`purchaseItemUnitCost_${index}`}
          type="number"
          slotProps={{ htmlInput: { min: "0", step: "0.01" } }}
          required
        />
      </FormRow>
      <FormRow columns={3}>
        <TextField
          defaultValue="0"
          label="Desconto"
          type="number"
          disabled
        />
        <TextField
          defaultValue={item.totalAmount}
          label="Subtotal"
          name={`purchaseItemTotalAmount_${index}`}
          type="number"
          slotProps={{ htmlInput: { min: "0", step: "0.01" } }}
          required
        />
        <TextField
          defaultValue={item.ncm ?? ""}
          label="NCM"
          name={`purchaseItemNcm_${index}`}
        />
      </FormRow>
      <FormRow>
        <TextField
          defaultValue={item.cest ?? ""}
          label="CEST"
          name={`purchaseItemCest_${index}`}
        />
        <TextField
          defaultValue={item.cfop ?? ""}
          label="CFOP"
          name={`purchaseItemCfop_${index}`}
        />
      </FormRow>
    </FormCard>
  );
}

function FormSection({
  children,
  description,
  title,
}: {
  children: React.ReactNode;
  description?: string;
  title: string;
}) {
  return (
    <section className="grid gap-4 rounded-xl border border-[#dfe5e1] bg-[#fbfcfb] p-4">
      <div>
        <h3 className="m-0 text-base font-bold text-[#2c281e]">{title}</h3>
        {description ? (
          <p className="m-0 mt-1 text-sm text-[#5f665f]">{description}</p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function draftFromInvoice(invoice: PurchaseInvoice): PurchaseInvoiceDraft {
  return {
    accessKey: invoice.accessKey,
    installments: invoice.installments.map((installment) => ({
      dueDate: installment.dueDate,
      number: installment.number,
      value: Number(installment.value),
    })),
    issueDate: invoice.issueDate,
    items: invoice.items.map((item) => ({
      cest: item.cest,
      cfop: item.cfop,
      description: item.description,
      ncm: item.ncm,
      position: item.position,
      productId: item.productId,
      quantity: Number(item.quantity),
      supplierProductCode: item.supplierProductCode,
      totalAmount: Number(item.totalAmount),
      unit: item.unit,
      unitCost: Number(item.unitCost),
    })),
    number: invoice.number,
    series: invoice.series,
    supplierDocument: invoice.supplierDocument,
    supplierId: invoice.supplierId,
    supplierName: invoice.supplierName,
    totalAmount: Number(invoice.totalAmount),
    transporterDocument: invoice.transporterDocument,
    transporterName: invoice.transporterName,
  };
}

function purchaseItemsTotal(draft: PurchaseInvoiceDraft) {
  return draft.items
    .reduce((total, item) => total + Number(item.totalAmount), 0)
    .toFixed(2);
}

function reviewInputFromForm(
  form: FormData,
  draft: PurchaseInvoiceDraft,
): PurchaseInvoiceDraft {
  return {
    accessKey: draft.accessKey,
    issueDate: nullableFormValue(form, "purchaseIssueDate"),
    items: draft.items.map((item, index) => ({
      cest: nullableFormValue(form, `purchaseItemCest_${index}`),
      cfop: nullableFormValue(form, `purchaseItemCfop_${index}`),
      description: formValue(form, `purchaseItemDescription_${index}`),
      ncm: nullableFormValue(form, `purchaseItemNcm_${index}`),
      position: index + 1,
      productId: nullableFormValue(form, `purchaseItemProductId_${index}`),
      quantity: numberFormValue(form, `purchaseItemQuantity_${index}`),
      supplierProductCode: item.supplierProductCode,
      totalAmount: numberFormValue(form, `purchaseItemTotalAmount_${index}`),
      unit: nullableFormValue(form, `purchaseItemUnit_${index}`),
      unitCost: numberFormValue(form, `purchaseItemUnitCost_${index}`),
    })),
    number: nullableFormValue(form, "purchaseNumber"),
    series: nullableFormValue(form, "purchaseSeries"),
    supplierDocument: nullableFormValue(form, "purchaseSupplierDocument"),
    supplierId: nullableFormValue(form, "purchaseSupplierId"),
    supplierName: formValue(form, "purchaseSupplierName"),
    totalAmount: numberFormValue(form, "purchaseTotalAmount"),
    transporterDocument: nullableFormValue(form, "purchaseTransporterDocument"),
    transporterName: nullableFormValue(form, "purchaseTransporterName"),
    createSupplierFromXml: form.get("purchaseCreateSupplier") === "yes",
    installments: installmentInputsFromForm(form, draft.installments),
    xmlContent: draft.xmlContent ?? null,
  };
}

function installmentInputsFromForm(
  form: FormData,
  installments: PurchaseInvoiceDraft["installments"] = [],
) {
  return installments.map((installment, index) => ({
    dueDate: nullableFormValue(form, `purchaseInstallmentDueDate_${index}`),
    number:
      nullableFormValue(form, `purchaseInstallmentNumber_${index}`) ??
      installment.number,
    value: numberFormValue(form, `purchaseInstallmentValue_${index}`),
  }));
}

function formValue(form: FormData, key: string) {
  return String(form.get(key) ?? "").trim();
}

function nullableFormValue(form: FormData, key: string) {
  const value = formValue(form, key);
  return value ? value : null;
}

function numberFormValue(form: FormData, key: string) {
  return Number(form.get(key));
}

function purchaseItemProductCandidates(
  item: PurchaseInvoiceDraft["items"][number],
  products: Product[],
) {
  const code = item.supplierProductCode?.trim().toLowerCase();
  const description = item.description.trim().toLowerCase();

  return products
    .filter((product) =>
      purchaseProductMatchesImport(product, code, description),
    )
    .slice(0, 4);
}

function purchaseProductMatchesImport(
  product: Product,
  code: string | undefined,
  description: string,
) {
  const productName = product.name.trim().toLowerCase();
  const productCode = product.internalCode?.trim().toLowerCase();
  const barcode = product.barcode?.trim().toLowerCase();

  return Boolean(
    (code && [productCode, barcode].includes(code)) ||
      description.includes(productName) ||
      productName.includes(description),
  );
}

function purchaseCandidateLabel(product: Product) {
  return [
    productDisplayName(product),
    product.internalCode ? `Cod. ${product.internalCode}` : null,
    product.brandName,
  ]
    .filter(Boolean)
    .join(" - ");
}

const purchaseInvoiceStatusLabels: Record<PurchaseInvoice["status"], string> = {
  CANCELLED: "Cancelada",
  IMPORTED: "Importada",
  POSTED: "Lancada",
};

const purchaseInvoiceStatusTones: Record<
  PurchaseInvoice["status"],
  "neutral" | "success" | "warning" | "error"
> = {
  CANCELLED: "error",
  IMPORTED: "warning",
  POSTED: "success",
};

type PurchaseInvoiceStatusFilter = PurchaseInvoice["status"] | "ALL";

function filterPurchaseInvoices(
  invoices: PurchaseInvoice[],
  status: PurchaseInvoiceStatusFilter,
) {
  return status === "ALL"
    ? invoices
    : invoices.filter((invoice) => invoice.status === status);
}

function purchaseInvoiceStatusSummary(invoices: PurchaseInvoice[]) {
  return invoices.reduce<Record<PurchaseInvoice["status"], number>>(
    (summary, invoice) => ({
      ...summary,
      [invoice.status]: summary[invoice.status] + 1,
    }),
    { CANCELLED: 0, IMPORTED: 0, POSTED: 0 },
  );
}

const purchaseInvoiceStatusCards: Array<{
  label: string;
  status: PurchaseInvoice["status"];
  tone: "success" | "warning" | "error";
}> = [
  { label: "Prontas para lancar", status: "IMPORTED", tone: "warning" },
  { label: "Lancadas no estoque", status: "POSTED", tone: "success" },
  { label: "Canceladas", status: "CANCELLED", tone: "error" },
];

const purchaseInvoiceStatusToneLabels = {
  error: "Atencao",
  success: "Ok",
  warning: "Pendente",
};
