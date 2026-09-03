import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import {
  AlertTriangle,
  ArrowDownToLine,
  ArrowLeftRight,
  Bell,
  BellOff,
  Plus,
  SlidersHorizontal,
} from "lucide-react";
import { useEffect, useState } from "react";
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
import { PrimaryButton, StatusChip, TableActionButton } from "../../components/ui";
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

export function LowStockPage({
  products,
  onSearchProducts,
  onToggleReplenishmentMonitor,
}: {
  products: Product[];
  onSearchProducts: (search: string) => Promise<Product[]>;
  onToggleReplenishmentMonitor: (product: Product) => Promise<void>;
}) {
  const [search, setSearch] = useState("");
  const [searchedProducts, setSearchedProducts] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const searchIsActive = Boolean(search.trim());
  const listProducts = searchIsActive
    ? searchedProducts.filter((product) => product.active)
    : products;
  const { pagination, visibleItems } =
    usePaginatedRows<Product>(listProducts);
  const summary = lowStockSummary(products);

  useEffect(() => {
    const term = search.trim();

    if (!term) {
      setSearchedProducts([]);
      setSearchError("");
      setSearching(false);
      return;
    }

    let cancelled = false;
    setSearching(true);
    setSearchError("");

    const timeout = window.setTimeout(async () => {
      try {
        const result = await onSearchProducts(term);

        if (!cancelled) {
          setSearchedProducts(result);
        }
      } catch (error) {
        if (!cancelled) {
          setSearchedProducts([]);
          setSearchError(
            error instanceof Error
              ? error.message
              : "Nao foi possivel buscar produtos.",
          );
        }
      } finally {
        if (!cancelled) {
          setSearching(false);
        }
      }
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [search]);

  async function toggleReplenishmentMonitor(product: Product) {
    await onToggleReplenishmentMonitor(product);

    setSearchedProducts((currentProducts) =>
      currentProducts.map((currentProduct) =>
        currentProduct.id === product.id
          ? {
              ...currentProduct,
              replenishmentMonitorEnabled:
                !currentProduct.replenishmentMonitorEnabled,
            }
          : currentProduct,
      ),
    );
  }

  return (
    <section className="grid gap-4">
      <PagePanel>
        <PageHeader
          description="Produtos ativos com saldo disponível igual ou menor que o mínimo definido."
          icon={<AlertTriangle size={18} />}
          title="Produtos para reposição"
        />
        <div className="grid gap-3 md:grid-cols-3">
          <LowStockMetric label="Monitorados" value={summary.monitored} />
          <LowStockMetric label="Zerados" value={summary.empty} />
          <LowStockMetric label="Total em reposição" value={summary.total} />
        </div>
      </PagePanel>

      <PagePanel wide>
        <PageHeader
          actions={
            <TextField
              className="min-w-full md:min-w-80"
              label="Buscar na reposição"
              placeholder="Busque por nome, codigo interno ou codigo de barras"
              helperText={
                searchError ||
                (searching
                  ? "Buscando produtos..."
                  : "A busca consulta o catalogo completo da filial.")
              }
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          }
          description={
            searchIsActive
              ? `${listProducts.length} produto(s) encontrado(s) no catálogo`
              : `${listProducts.length} produto(s) em reposição`
          }
          title="Lista de reposição"
        />
        <ResponsiveTable
          columns={[
            {
              header: "Prioridade",
              render: (product) => (
                <StatusChip
                  label={
                    product.replenishmentMonitorEnabled
                      ? "Monitorado"
                      : replenishmentPriorityLabel(product)
                  }
                  tone={
                    product.replenishmentMonitorEnabled
                      ? "warning"
                      : replenishmentPriorityTone(product)
                  }
                />
              ),
            },
            {
              header: "Produto",
              render: (product) => productDisplayName(product),
            },
            {
              header: "Código",
              render: (product) => product.internalCode ?? "-",
            },
            {
              header: "Fabricante",
              render: (product) => product.brandName ?? "-",
            },
            {
              header: "Locação",
              render: (product) => product.location ?? "-",
            },
            {
              header: "Disponível",
              render: (product) => (
                <strong className="text-[#9f3a2c]">
                  {formatQuantity(product.availableStock)}
                </strong>
              ),
            },
            {
              header: "Mínimo",
              render: (product) => formatQuantity(product.minimumStock),
            },
            {
              header: "Faltam",
              render: (product) => formatQuantity(lowStockMissing(product)),
            },
            {
              align: "right",
              header: "Ações",
              render: (product) => (
                <TableActionButton
                  icon={
                    product.replenishmentMonitorEnabled ? (
                      <BellOff size={15} />
                    ) : (
                      <Bell size={15} />
                    )
                  }
                  type="button"
                  onClick={() => void toggleReplenishmentMonitor(product)}
                >
                  {product.replenishmentMonitorEnabled
                    ? "Parar monitoramento"
                    : "Monitorar"}
                </TableActionButton>
              ),
            },
          ]}
          emptyMessage={
            searching
              ? "Buscando produtos..."
              : search
              ? "Nenhum produto encontrado para esta busca."
              : "Nenhum produto requer reposição."
          }
          getRowId={(product) => product.id}
          items={visibleItems}
          pagination={pagination}
        />
      </PagePanel>
    </section>
  );
}

function LowStockMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-[#e4e9e5] bg-[#f9faf8] px-3 py-2.5">
      <span className="block text-xs font-semibold uppercase tracking-wide text-[#5f665f]">
        {label}
      </span>
      <strong className="mt-0.5 block text-xl text-[#203466]">{value}</strong>
    </div>
  );
}

function lowStockSummary(products: Product[]) {
  return {
    empty: products.filter((product) => Number(product.availableStock) <= 0)
      .length,
    monitored: products.filter((product) => product.replenishmentMonitorEnabled)
      .length,
    total: products.length,
  };
}

function lowStockMissing(product: Product) {
  return String(
    Math.max(0, Number(product.minimumStock) - Number(product.availableStock)),
  );
}

function replenishmentPriorityLabel(product: Product) {
  const availableStock = Number(product.availableStock);
  const minimumStock = Number(product.minimumStock);

  if (availableStock <= 0) {
    return "Zerado";
  }

  return availableStock <= minimumStock ? "Abaixo do mínimo" : "Estoque ok";
}

function replenishmentPriorityTone(product: Product) {
  const availableStock = Number(product.availableStock);
  const minimumStock = Number(product.minimumStock);

  if (availableStock <= 0) {
    return "error";
  }

  return availableStock <= minimumStock ? "neutral" : "success";
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
  SALE_CORRECTION: "Correcao de venda",
  SALE_RETURN: "Devolucao de venda",
};
