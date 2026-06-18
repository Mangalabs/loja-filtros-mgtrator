import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowLeftRight,
  Plus,
  SlidersHorizontal,
} from "lucide-react";
import type { FormEvent } from "react";
import type {
  Product,
  StockAdjustment,
  StockEntry,
  StockMovement,
  Supplier,
} from "../../api";
import { ProductSearchField } from "../../components/ProductSearchField";
import {
  FormGrid,
  FormRow,
  PageHeader,
  PagePanel,
  ResponsiveTable,
} from "../../components/layout";
import { PrimaryButton } from "../../components/ui";
import { usePaginatedRows } from "../../hooks/usePaginatedRows";
import {
  formatCurrency,
  formatDateTime,
  formatQuantity,
  formatSignedQuantity,
} from "../../utils/format";
import { productDisplayName } from "../../utils/productDisplay";

export function StockEntriesPage({
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
  const { pagination, visibleItems } = usePaginatedRows<StockEntry>(entries);

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(290px,0.7fr)_minmax(0,1.3fr)]">
      <FormGrid onSubmit={onSubmit}>
        <PageHeader icon={<ArrowDownToLine size={18} />} title="Nova entrada" />
        <ProductSearchField
          label="Produto"
          name="entryProductId"
          products={products.filter((product) => product.active)}
          required
          stockLabel="current"
        />
        <TextField
          defaultValue=""
          label="Fornecedor"
          name="entrySupplierId"
          select
          required
        >
          <MenuItem value="" disabled>
            Fornecedor
          </MenuItem>
          {suppliers
            .filter((supplier) => supplier.active)
            .map((supplier) => (
              <MenuItem key={supplier.id} value={supplier.id}>
                {supplier.name}
              </MenuItem>
            ))}
        </TextField>
        <FormRow>
          <TextField
            label="Quantidade"
            name="entryQuantity"
            type="number"
            slotProps={{ htmlInput: { min: "0.001", step: "0.001" } }}
            required
          />
          <TextField
            label="Custo unitario"
            name="entryUnitCost"
            type="number"
            slotProps={{ htmlInput: { min: "0", step: "0.01" } }}
            required
          />
        </FormRow>
        <TextField
          label="Observacao"
          name="entryNotes"
          multiline
          rows={3}
          slotProps={{ htmlInput: { maxLength: 500 } }}
        />
        <PrimaryButton icon={<Plus size={17} />} type="submit">
          Registrar entrada
        </PrimaryButton>
      </FormGrid>

      <PagePanel className="min-h-[360px]" wide>
        <PageHeader
          actions={
            <span className="text-sm text-[#5f665f]">
              {entries.length} registros
            </span>
          }
          title="Entradas registradas"
        />
        <ResponsiveTable
          columns={[
            {
              header: "Data",
              render: (entry) => formatDateTime(entry.createdAt),
            },
            {
              header: "Produto",
              render: (entry) => entry.productName,
            },
            {
              header: "Fornecedor",
              render: (entry) => entry.supplierName,
            },
            {
              header: "Operador",
              render: (entry) => entry.createdByUserName ?? "-",
            },
            {
              header: "Qtd.",
              render: (entry) => formatQuantity(entry.quantity),
            },
            {
              header: "Custo un.",
              render: (entry) => formatCurrency(entry.unitCost),
            },
          ]}
          emptyMessage="Nenhuma entrada registrada."
          getRowId={(entry) => entry.id}
          items={visibleItems}
          pagination={pagination}
        />
      </PagePanel>
    </section>
  );
}

export function StockAdjustmentsPage({
  adjustments,
  products,
  onSubmit,
}: {
  adjustments: StockAdjustment[];
  products: Product[];
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const { pagination, visibleItems } =
    usePaginatedRows<StockAdjustment>(adjustments);

  return (
    <section className="grid gap-4 xl:grid-cols-[minmax(290px,0.7fr)_minmax(0,1.3fr)]">
      <FormGrid onSubmit={onSubmit}>
        <PageHeader
          icon={<SlidersHorizontal size={18} />}
          title="Novo ajuste"
        />
        <ProductSearchField
          label="Produto"
          name="adjustmentProductId"
          products={products}
          required
          stockLabel="physical-reserved"
        />
        <TextField
          label="Variacao de estoque (+ ou -)"
          name="adjustmentQuantity"
          type="number"
          slotProps={{ htmlInput: { step: "0.001" } }}
          required
        />
        <p className="m-0 text-xs text-[#5f665f]">
          Use valor positivo para acrescentar ou negativo para retirar itens.
        </p>
        <TextField
          label="Motivo do ajuste"
          name="adjustmentReason"
          multiline
          rows={3}
          slotProps={{ htmlInput: { maxLength: 500 } }}
          required
        />
        <PrimaryButton icon={<Plus size={17} />} type="submit">
          Registrar ajuste
        </PrimaryButton>
      </FormGrid>

      <PagePanel className="min-h-[360px]" wide>
        <PageHeader
          actions={
            <span className="text-sm text-[#5f665f]">
              {adjustments.length} registros
            </span>
          }
          title="Ajustes registrados"
        />
        <ResponsiveTable
          columns={[
            {
              header: "Data",
              render: (adjustment) => formatDateTime(adjustment.createdAt),
            },
            {
              header: "Produto",
              render: (adjustment) => adjustment.productName,
            },
            {
              header: "Operador",
              render: (adjustment) => adjustment.createdByUserName ?? "-",
            },
            {
              header: "Variacao",
              render: (adjustment) =>
                formatSignedQuantity(adjustment.quantity),
            },
            {
              header: "Motivo",
              render: (adjustment) => adjustment.reason,
            },
          ]}
          emptyMessage="Nenhum ajuste registrado."
          getRowId={(adjustment) => adjustment.id}
          items={visibleItems}
          pagination={pagination}
        />
      </PagePanel>
    </section>
  );
}

export function LowStockPage({ products }: { products: Product[] }) {
  const { pagination, visibleItems } = usePaginatedRows<Product>(products);

  return (
    <PagePanel wide>
      <PageHeader
        description="Produtos ativos com saldo disponivel igual ou menor que o minimo definido."
        icon={<AlertTriangle size={18} />}
        title="Produtos para reposicao"
      />
      <ResponsiveTable
        columns={[
          {
            header: "Produto",
            render: (product) => productDisplayName(product),
          },
          {
            header: "Fabricante",
            render: (product) => product.brandName ?? "-",
          },
          {
            header: "Locacao",
            render: (product) => product.location ?? "-",
          },
          {
            header: "Disponivel",
            render: (product) => (
              <strong className="text-[#9f3a2c]">
                {formatQuantity(product.availableStock)}
              </strong>
            ),
          },
          {
            header: "Minimo",
            render: (product) => formatQuantity(product.minimumStock),
          },
          {
            header: "Faltam p/ minimo",
            render: (product) =>
              formatQuantity(
                String(
                  Number(product.minimumStock) -
                    Number(product.availableStock),
                ),
              ),
          },
        ]}
        emptyMessage="Nenhum produto requer reposicao."
        getRowId={(product) => product.id}
        items={visibleItems}
        pagination={pagination}
      />
    </PagePanel>
  );
}

export function StockMovementsPage({
  movements,
}: {
  movements: StockMovement[];
}) {
  const { pagination, visibleItems } =
    usePaginatedRows<StockMovement>(movements);

  return (
    <PagePanel wide>
      <PageHeader
        description="Entradas, vendas, estornos e ajustes de estoque."
        icon={<ArrowLeftRight size={18} />}
        title="Movimentacoes registradas"
      />
      <ResponsiveTable
        columns={[
          {
            header: "Data",
            render: (movement) => formatDateTime(movement.createdAt),
          },
          {
            header: "Tipo",
            render: (movement) => movementTypeLabel(movement.type),
          },
          {
            header: "Produto",
            render: (movement) => movement.productName,
          },
          {
            header: "Quantidade",
            render: (movement) => formatSignedQuantity(movement.quantity),
          },
          {
            header: "Fornecedor",
            render: (movement) => movement.supplierName ?? "-",
          },
          {
            header: "Operador",
            render: (movement) => movement.createdByUserName ?? "-",
          },
          {
            header: "Custo un.",
            render: (movement) =>
              movement.unitCost ? formatCurrency(movement.unitCost) : "-",
          },
          {
            header: "Observacao",
            render: (movement) => movement.notes ?? "-",
          },
        ]}
        emptyMessage="Nenhuma movimentacao registrada."
        getRowId={(movement) => movement.id}
        items={visibleItems}
        pagination={pagination}
      />
    </PagePanel>
  );
}

function movementTypeLabel(type: StockMovement["type"]) {
  return movementTypeLabels[type];
}

const movementTypeLabels: Record<StockMovement["type"], string> = {
  ADJUSTMENT: "Ajuste",
  ENTRY: "Entrada",
  SALE: "Venda",
  SALE_CANCEL: "Estorno de venda",
  SALE_RETURN: "Devolucao de venda",
};
