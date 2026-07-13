import Alert from "@mui/material/Alert";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import { FileText, RotateCcw, Save, Upload } from "lucide-react";
import { useState, type FormEvent } from "react";
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

type PurchaseInvoicesPageProps = {
  invoices: PurchaseInvoice[];
  products: Product[];
  suppliers: Supplier[];
  onParseXml: (xmlContent: string) => Promise<PurchaseInvoiceDraft | null>;
  onSaveReview: (
    input: PurchaseInvoiceDraft,
    invoiceId?: string,
  ) => Promise<void>;
};

export function PurchaseInvoicesPage({
  invoices,
  products,
  suppliers,
  onParseXml,
  onSaveReview,
}: PurchaseInvoicesPageProps) {
  const [draft, setDraft] = useState<PurchaseInvoiceDraft | null>(null);
  const [reviewInvoiceId, setReviewInvoiceId] = useState<string>();
  const [xmlContent, setXmlContent] = useState("");
  const { pagination, visibleItems } =
    usePaginatedRows<PurchaseInvoice>(invoices);
  const reviewKey = reviewInvoiceId ?? draft?.accessKey ?? "new-purchase";

  async function parseXml(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const parsedInvoice = await onParseXml(xmlContent);

    if (parsedInvoice) {
      setDraft(parsedInvoice);
      setReviewInvoiceId(undefined);
    }
  }

  async function saveReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!draft) {
      return;
    }

    await onSaveReview(reviewInputFromForm(new FormData(event.currentTarget), draft), reviewInvoiceId);
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
  }

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(320px,0.8fr)_minmax(0,1.2fr)]">
      <div className="grid content-start gap-4">
        <FormGrid onSubmit={parseXml}>
          <PageHeader
            description="Cole o XML da NF-e de compra para preencher a revisao antes da entrada no estoque."
            icon={<Upload size={18} />}
            title="Importar XML de compra"
          />
          <TextField
            label="XML da NF-e"
            minRows={8}
            multiline
            required
            value={xmlContent}
            onChange={(event) => setXmlContent(event.target.value)}
          />
          <PrimaryButton icon={<FileText size={17} />} type="submit">
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
                  Cancelar revisao
                </SecondaryButton>
              }
              description="Confira fornecedor, valores e vincule o produto interno correto em cada item."
              title={reviewInvoiceId ? "Revisar compra importada" : "Revisar XML lido"}
            />

            <Alert severity="info">
              Esta etapa ainda nao atualiza estoque. Ela salva a compra
              importada para depois confirmar a entrada.
            </Alert>

            <FormRow>
              <TextField
                defaultValue={draft.number ?? ""}
                label="Numero"
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
                label="Emissao"
                name="purchaseIssueDate"
                type="date"
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                defaultValue={draft.totalAmount}
                label="Total"
                name="purchaseTotalAmount"
                type="number"
                slotProps={{ htmlInput: { min: "0", step: "0.01" } }}
                required
              />
            </FormRow>
            <TextField
              defaultValue={draft.supplierName}
              label="Nome do fornecedor"
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

            <div className="grid gap-3">
              {draft.items.map((item, index) => (
                <FormCard key={`${reviewKey}-${item.position}-${index}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <strong className="text-[#2c281e]">Item {index + 1}</strong>
                    <span className="text-sm text-[#5f665f]">
                      XML: {item.supplierProductCode ?? "sem codigo"}
                    </span>
                  </div>
                  <ProductSearchField
                    defaultValue={item.productId ?? ""}
                    helperText="Confirme o produto interno correto. Use nome, codigo, fabricante ou locacao."
                    label="Produto interno"
                    name={`purchaseItemProductId_${index}`}
                    products={products}
                    size="small"
                    stockLabel="current"
                  />
                  <TextField
                    defaultValue={item.description}
                    label="Descricao do XML"
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
                      defaultValue={item.unitCost}
                      label="Custo unitario"
                      name={`purchaseItemUnitCost_${index}`}
                      type="number"
                      slotProps={{ htmlInput: { min: "0", step: "0.01" } }}
                      required
                    />
                    <TextField
                      defaultValue={item.totalAmount}
                      label="Total do item"
                      name={`purchaseItemTotalAmount_${index}`}
                      type="number"
                      slotProps={{ htmlInput: { min: "0", step: "0.01" } }}
                      required
                    />
                  </FormRow>
                  <FormRow columns={3}>
                    <TextField
                      defaultValue={item.unit ?? ""}
                      label="Unidade"
                      name={`purchaseItemUnit_${index}`}
                    />
                    <TextField
                      defaultValue={item.ncm ?? ""}
                      label="NCM"
                      name={`purchaseItemNcm_${index}`}
                    />
                    <TextField
                      defaultValue={item.cfop ?? ""}
                      label="CFOP"
                      name={`purchaseItemCfop_${index}`}
                    />
                  </FormRow>
                </FormCard>
              ))}
            </div>

            <PrimaryButton icon={<Save size={17} />} type="submit">
              Salvar revisao da compra
            </PrimaryButton>
          </FormGrid>
        ) : null}
      </div>

      <PagePanel wide>
        <PageHeader
          actions={
            <span className="text-sm text-[#5f665f]">
              {invoices.length} compras
            </span>
          }
          title="Compras importadas"
        />
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
              header: "Numero",
              render: (invoice) =>
                [invoice.number, invoice.series].filter(Boolean).join(" / ") ||
                "-",
            },
            {
              header: "Emissao",
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
              header: "Acoes",
              render: (invoice) => (
                <TableActionsMenu
                  actions={[
                    {
                      disabled: invoice.status !== "IMPORTED",
                      icon: <FileText size={16} />,
                      label: "Revisar dados",
                      onSelect: () => reviewInvoice(invoice),
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

function draftFromInvoice(invoice: PurchaseInvoice): PurchaseInvoiceDraft {
  return {
    accessKey: invoice.accessKey,
    issueDate: invoice.issueDate,
    items: invoice.items.map((item) => ({
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
  };
}

function reviewInputFromForm(
  form: FormData,
  draft: PurchaseInvoiceDraft,
): PurchaseInvoiceDraft {
  return {
    accessKey: draft.accessKey,
    issueDate: nullableFormValue(form, "purchaseIssueDate"),
    items: draft.items.map((item, index) => ({
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
    xmlContent: draft.xmlContent ?? null,
  };
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
