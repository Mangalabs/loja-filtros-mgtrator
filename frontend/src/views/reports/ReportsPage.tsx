import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Skeleton from "@mui/material/Skeleton";
import TextField from "@mui/material/TextField";
import {
  AlertTriangle,
  Banknote,
  CircleDollarSign,
  CreditCard,
  PackageSearch,
  PackagePlus,
  Send,
  ShoppingCart,
  Truck,
} from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import type {
  CashReport,
  PurchaseReport,
  ReportsOverview,
  SalesReport,
  StockReport,
} from "../../api";
import { PageHeader, PagePanel, ResponsiveTable } from "../../components/layout";
import { StatusChip, type StatusTone } from "../../components/ui";
import { frontendPalette } from "../../theme";
import {
  formatCurrency,
  formatDateTime,
  formatQuantity,
} from "../../utils/format";

export function ReportsPage({
  cashReport,
  onLoadCashReport,
  onLoadSalesReport,
  onLoadPurchaseReport,
  onLoadStockReport,
  overview,
  purchaseReport,
  salesReport,
  stockReport,
}: {
  cashReport: CashReport | null;
  onLoadCashReport: (filters?: SalesReportFilters) => Promise<boolean>;
  onLoadSalesReport: (filters?: SalesReportFilters) => Promise<boolean>;
  onLoadPurchaseReport: (filters?: SalesReportFilters) => Promise<boolean>;
  onLoadStockReport: (filters?: SalesReportFilters) => Promise<boolean>;
  overview: ReportsOverview | null;
  purchaseReport: PurchaseReport | null;
  salesReport: SalesReport | null;
  stockReport: StockReport | null;
}) {
  const contentByState = {
    loading: <ReportsLoading />,
    ready:
      overview && salesReport && stockReport && purchaseReport && cashReport ? (
        <ReportsOverviewContent
          cashReport={cashReport}
          overview={overview}
          onLoadCashReport={onLoadCashReport}
          onLoadPurchaseReport={onLoadPurchaseReport}
          onLoadSalesReport={onLoadSalesReport}
          onLoadStockReport={onLoadStockReport}
          purchaseReport={purchaseReport}
          salesReport={salesReport}
          stockReport={stockReport}
        />
      ) : null,
  };
  const state =
    overview && salesReport && stockReport && purchaseReport && cashReport
      ? "ready"
      : "loading";

  return contentByState[state];
}

function ReportsLoading() {
  return (
    <PagePanel wide>
      <PageHeader
        description="Carregando indicadores operacionais..."
        title="Resumo gerencial"
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton height={110} key={index} variant="rounded" />
        ))}
      </div>
    </PagePanel>
  );
}

function ReportsOverviewContent({
  cashReport,
  onLoadCashReport,
  onLoadPurchaseReport,
  onLoadSalesReport,
  onLoadStockReport,
  overview,
  purchaseReport,
  salesReport,
  stockReport,
}: {
  cashReport: CashReport;
  onLoadCashReport: (filters?: SalesReportFilters) => Promise<boolean>;
  onLoadPurchaseReport: (filters?: SalesReportFilters) => Promise<boolean>;
  onLoadSalesReport: (filters?: SalesReportFilters) => Promise<boolean>;
  onLoadStockReport: (filters?: SalesReportFilters) => Promise<boolean>;
  overview: ReportsOverview;
  purchaseReport: PurchaseReport;
  salesReport: SalesReport;
  stockReport: StockReport;
}) {
  return (
    <section className="grid gap-4">
      <section className="grid gap-4 xl:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.4fr)]">
        <PagePanel className="content-start">
          <PageHeader
            description="Status operacional do caixa."
            icon={<Banknote size={18} />}
            title="Caixa atual"
          />
          {overview.openCashRegister ? (
            <div className="grid gap-3">
              <ReportDetail label="Status" value="Aberto" />
              <ReportDetail
                label="Operador"
                value={overview.openCashRegister.openedByUserName}
              />
              <ReportDetail
                label="Abertura"
                value={formatDateTime(overview.openCashRegister.openedAt)}
              />
            </div>
          ) : (
            <Alert severity="warning" variant="outlined">
              Nenhum caixa aberto no momento.
            </Alert>
          )}
        </PagePanel>

        <PagePanel wide>
          <PageHeader
            actions={<StatusChip label="Atualizado" tone="success" />}
            description="Primeiros indicadores operacionais da filial."
            title="Resumo gerencial"
          />
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <ReportMetric
              icon={<ShoppingCart size={18} />}
              label="Vendas concluidas"
              value={String(overview.salesCount)}
            />
            <ReportMetric
              icon={<Banknote size={18} />}
              label="Total vendido"
              value={formatCurrency(overview.salesTotalAmount)}
            />
            <ReportMetric
              icon={<AlertTriangle size={18} />}
              label="Produtos em reposicao"
              value={String(overview.lowStockProductsCount)}
            />
            <ReportMetric
              icon={<Send size={18} />}
              label="Pedidos para envio em aberto"
              value={String(overview.openShippingOrdersCount)}
            />
            <ReportMetric
              icon={<PackagePlus size={18} />}
              label="Reservas para retirada em aberto"
              value={String(overview.openPickupReservationsCount)}
            />
          </div>
        </PagePanel>
      </section>

      <SalesReportSection
        salesReport={salesReport}
        onLoadSalesReport={onLoadSalesReport}
      />
      <PurchaseReportSection
        purchaseReport={purchaseReport}
        onLoadPurchaseReport={onLoadPurchaseReport}
      />
      <CashReportSection
        cashReport={cashReport}
        onLoadCashReport={onLoadCashReport}
      />
      <StockReportSection
        stockReport={stockReport}
        onLoadStockReport={onLoadStockReport}
      />
    </section>
  );
}

function SalesReportSection({
  onLoadSalesReport,
  salesReport,
}: {
  onLoadSalesReport: (filters?: SalesReportFilters) => Promise<boolean>;
  salesReport: SalesReport;
}) {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(false);

  async function filterSalesReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    await onLoadSalesReport({ dateFrom, dateTo });
    setLoading(false);
  }

  async function clearSalesReportFilters() {
    setDateFrom("");
    setDateTo("");
    setLoading(true);

    await onLoadSalesReport();
    setLoading(false);
  }

  return (
    <PagePanel wide>
      <PageHeader
        actions={
          <form
            className="grid w-full gap-3 sm:grid-cols-[repeat(2,minmax(160px,1fr))_auto_auto] lg:w-auto"
            onSubmit={filterSalesReport}
          >
            <TextField
              label="De"
              size="small"
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label="Ate"
              size="small"
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <Button disabled={loading} type="submit" variant="contained">
              Filtrar
            </Button>
            <Button
              disabled={loading || (!dateFrom && !dateTo)}
              type="button"
              variant="outlined"
              onClick={() => void clearSalesReportFilters()}
            >
              Limpar
            </Button>
          </form>
        }
        description="Vendas concluidas agrupadas por produto, cliente e forma de pagamento."
        icon={<CircleDollarSign size={18} />}
        title="Relatorio comercial"
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <ReportMetric
          icon={<ShoppingCart size={18} />}
          label="Vendas"
          value={String(salesReport.summary.salesCount)}
        />
        <ReportMetric
          icon={<PackagePlus size={18} />}
          label="Itens vendidos"
          value={formatQuantity(salesReport.summary.itemsQuantity)}
        />
        <ReportMetric
          icon={<Banknote size={18} />}
          label="Bruto"
          value={formatCurrency(salesReport.summary.grossAmount)}
        />
        <ReportMetric
          icon={<PackageSearch size={18} />}
          label="Custo"
          value={formatCurrency(salesReport.summary.costAmount)}
        />
        <ReportMetric
          icon={<CircleDollarSign size={18} />}
          label="Lucro"
          value={formatCurrency(salesReport.summary.grossProfitAmount)}
        />
        <ReportMetric
          icon={<CircleDollarSign size={18} />}
          label="Liquido"
          value={formatCurrency(salesReport.summary.netAmount)}
        />
      </div>
      <span className="text-sm text-[#5f665f]">
        Margem geral: {salesReport.summary.grossMarginPercentage}%
      </span>

      <div className="mt-5 grid gap-4 xl:grid-cols-3">
        <ResponsiveTable
          columns={[
            {
              header: "Produto",
              render: (item) => item.productName,
            },
            {
              align: "right",
              header: "Qtde",
              render: (item) => formatQuantity(item.quantity),
            },
            {
              align: "right",
              header: "Total",
              render: (item) => formatCurrency(item.totalAmount),
            },
            {
              align: "right",
              header: "Custo",
              render: (item) => formatCurrency(item.costAmount),
            },
            {
              align: "right",
              header: "Lucro",
              render: (item) => formatCurrency(item.grossProfitAmount),
            },
            {
              align: "right",
              header: "Margem",
              render: (item) => `${item.grossMarginPercentage}%`,
            },
          ]}
          emptyMessage="Nenhuma venda por produto."
          getRowId={(item) => item.productId}
          items={salesReport.byProduct}
        />

        <ResponsiveTable
          columns={[
            {
              header: "Cliente",
              render: (item) => item.clientName,
            },
            {
              align: "right",
              header: "Vendas",
              render: (item) => item.salesCount,
            },
            {
              align: "right",
              header: "Total",
              render: (item) => formatCurrency(item.totalAmount),
            },
          ]}
          emptyMessage="Nenhuma venda por cliente."
          getRowId={(item) => item.clientId ?? item.clientName}
          items={salesReport.byClient}
        />

        <ResponsiveTable
          columns={[
            {
              header: "Pagamento",
              render: (item) => (
                <span className="inline-flex items-center gap-2">
                  <CreditCard size={15} />
                  {item.paymentMethodName}
                </span>
              ),
            },
            {
              align: "right",
              header: "Total",
              render: (item) => formatCurrency(item.totalAmount),
            },
          ]}
          emptyMessage="Nenhuma venda por pagamento."
          getRowId={(item) => item.paymentMethodId}
          items={salesReport.byPaymentMethod}
        />
      </div>

      <div className="mt-5">
        <ResponsiveTable
          columns={[
            {
              header: "Produto",
              render: (item) => item.productName,
            },
            {
              align: "right",
              header: "Faturamento",
              render: (item) => formatCurrency(item.totalAmount),
            },
            {
              align: "right",
              header: "Part.",
              render: (item) => `${item.revenueSharePercentage}%`,
            },
            {
              align: "right",
              header: "Acumulado",
              render: (item) => `${item.cumulativeRevenuePercentage}%`,
            },
            {
              header: "Classe",
              render: (item) => (
                <StatusChip label={item.abcClass} tone={abcTone(item.abcClass)} />
              ),
            },
          ]}
          emptyMessage="Nenhum produto para curva ABC."
          getRowId={(item) => item.productId}
          items={salesReport.abcProducts}
        />
      </div>
    </PagePanel>
  );
}

function PurchaseReportSection({
  onLoadPurchaseReport,
  purchaseReport,
}: {
  onLoadPurchaseReport: (filters?: SalesReportFilters) => Promise<boolean>;
  purchaseReport: PurchaseReport;
}) {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(false);

  async function filterPurchaseReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    await onLoadPurchaseReport({ dateFrom, dateTo });
    setLoading(false);
  }

  async function clearPurchaseReportFilters() {
    setDateFrom("");
    setDateTo("");
    setLoading(true);

    await onLoadPurchaseReport();
    setLoading(false);
  }

  return (
    <PagePanel wide>
      <PageHeader
        actions={
          <form
            className="grid w-full gap-3 sm:grid-cols-[repeat(2,minmax(160px,1fr))_auto_auto] lg:w-auto"
            onSubmit={filterPurchaseReport}
          >
            <TextField
              label="De"
              size="small"
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label="Ate"
              size="small"
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <Button disabled={loading} type="submit" variant="contained">
              Filtrar compras
            </Button>
            <Button
              disabled={loading || (!dateFrom && !dateTo)}
              type="button"
              variant="outlined"
              onClick={() => void clearPurchaseReportFilters()}
            >
              Limpar
            </Button>
          </form>
        }
        description="Gastos com entradas manuais e compras importadas por XML."
        icon={<Truck size={18} />}
        title="Gastos com compras"
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <ReportMetric
          icon={<Truck size={18} />}
          label="Entradas"
          value={String(purchaseReport.summary.entriesCount)}
        />
        <ReportMetric
          icon={<PackagePlus size={18} />}
          label="Qtde comprada"
          value={formatQuantity(purchaseReport.summary.totalQuantity)}
        />
        <ReportMetric
          icon={<Banknote size={18} />}
          label="Total comprado"
          value={formatCurrency(purchaseReport.summary.totalAmount)}
        />
        <ReportMetric
          icon={<PackageSearch size={18} />}
          label="Entrada manual"
          value={formatCurrency(purchaseReport.summary.manualAmount)}
        />
        <ReportMetric
          icon={<CreditCard size={18} />}
          label="XML NF-e"
          value={formatCurrency(purchaseReport.summary.xmlAmount)}
        />
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-3">
        <ResponsiveTable
          columns={[
            {
              header: "Origem",
              render: (item) =>
                item.source === "XML" ? "XML de compra" : "Entrada manual",
            },
            {
              align: "right",
              header: "Entradas",
              render: (item) => item.entriesCount,
            },
            {
              align: "right",
              header: "Total",
              render: (item) => formatCurrency(item.totalAmount),
            },
          ]}
          emptyMessage="Nenhuma compra por origem."
          getRowId={(item) => item.source}
          items={purchaseReport.bySource}
        />

        <ResponsiveTable
          columns={[
            {
              header: "Fornecedor",
              render: (item) => item.supplierName,
            },
            {
              align: "right",
              header: "Entradas",
              render: (item) => item.entriesCount,
            },
            {
              align: "right",
              header: "Total",
              render: (item) => formatCurrency(item.totalAmount),
            },
          ]}
          emptyMessage="Nenhuma compra por fornecedor."
          getRowId={(item) => item.supplierId}
          items={purchaseReport.bySupplier}
        />

        <ResponsiveTable
          columns={[
            {
              header: "Produto",
              render: (item) => item.productName,
            },
            {
              align: "right",
              header: "Qtde",
              render: (item) => formatQuantity(item.quantity),
            },
            {
              align: "right",
              header: "Total",
              render: (item) => formatCurrency(item.totalAmount),
            },
          ]}
          emptyMessage="Nenhuma compra por produto."
          getRowId={(item) => item.productId}
          items={purchaseReport.byProduct}
        />
      </div>
    </PagePanel>
  );
}

function CashReportSection({
  cashReport,
  onLoadCashReport,
}: {
  cashReport: CashReport;
  onLoadCashReport: (filters?: SalesReportFilters) => Promise<boolean>;
}) {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(false);

  async function filterCashReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    await onLoadCashReport({ dateFrom, dateTo });
    setLoading(false);
  }

  async function clearCashReportFilters() {
    setDateFrom("");
    setDateTo("");
    setLoading(true);

    await onLoadCashReport();
    setLoading(false);
  }

  return (
    <PagePanel wide>
      <PageHeader
        actions={
          <form
            className="grid w-full gap-3 sm:grid-cols-[repeat(2,minmax(160px,1fr))_auto_auto] lg:w-auto"
            onSubmit={filterCashReport}
          >
            <TextField
              label="De"
              size="small"
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label="Ate"
              size="small"
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <Button disabled={loading} type="submit" variant="contained">
              Filtrar caixa
            </Button>
            <Button
              disabled={loading || (!dateFrom && !dateTo)}
              type="button"
              variant="outlined"
              onClick={() => void clearCashReportFilters()}
            >
              Limpar
            </Button>
          </form>
        }
        description="Conferencia de vendas, entradas, sangrias e fechamento por caixa aberto no periodo."
        icon={<Banknote size={18} />}
        title="Relatorio financeiro de caixa"
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <ReportMetric
          icon={<Banknote size={18} />}
          label="Caixas"
          value={String(cashReport.summary.sessionsCount)}
        />
        <ReportMetric
          icon={<ShoppingCart size={18} />}
          label="Vendas liquidas"
          value={formatCurrency(cashReport.summary.netSalesAmount)}
        />
        <ReportMetric
          icon={<CircleDollarSign size={18} />}
          label="Suprimentos"
          value={formatCurrency(cashReport.summary.supplyAmount)}
        />
        <ReportMetric
          icon={<CreditCard size={18} />}
          label="Sangrias"
          value={formatCurrency(cashReport.summary.withdrawalAmount)}
        />
        <ReportMetric
          icon={<Banknote size={18} />}
          label="Fechamento esperado"
          value={formatCurrency(cashReport.summary.expectedClosingAmount)}
        />
        <ReportMetric
          icon={<AlertTriangle size={18} />}
          label="Divergencia fechada"
          value={formatCurrency(cashReport.summary.closedDifferenceAmount)}
        />
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.4fr)]">
        <ResponsiveTable
          columns={[
            {
              header: "Pagamento",
              render: (item) => item.paymentMethodName,
            },
            {
              align: "right",
              header: "Bruto",
              render: (item) => formatCurrency(item.grossAmount),
            },
            {
              align: "right",
              header: "Devol.",
              render: (item) => formatCurrency(item.refundAmount),
            },
            {
              align: "right",
              header: "Liquido",
              render: (item) => formatCurrency(item.netAmount),
            },
          ]}
          emptyMessage="Nenhum pagamento registrado no periodo."
          getRowId={(item) => item.paymentMethodId}
          items={cashReport.byPaymentMethod}
        />

        <ResponsiveTable
          columns={[
            {
              header: "Caixa",
              render: (item) => (
                <div className="grid gap-1">
                  <strong>{item.openedByUserName}</strong>
                  <span className="text-xs text-[#5f665f]">
                    {formatDateTime(item.openedAt)}
                  </span>
                </div>
              ),
            },
            {
              header: "Status",
              render: (item) =>
                item.status === "OPEN" ? (
                  <StatusChip label="Aberto" tone="warning" />
                ) : (
                  <StatusChip label="Fechado" tone="success" />
                ),
            },
            {
              align: "right",
              header: "Vendas",
              render: (item) => formatCurrency(item.salesAmount),
            },
            {
              align: "right",
              header: "Esperado",
              render: (item) => formatCurrency(item.expectedClosingBalance),
            },
            {
              align: "right",
              header: "Diverg.",
              render: (item) =>
                item.difference ? formatCurrency(item.difference) : "-",
            },
          ]}
          emptyMessage="Nenhum caixa no periodo."
          getRowId={(item) => item.id}
          items={cashReport.sessions}
        />
      </div>
    </PagePanel>
  );
}

function StockReportSection({
  onLoadStockReport,
  stockReport,
}: {
  onLoadStockReport: (filters?: SalesReportFilters) => Promise<boolean>;
  stockReport: StockReport;
}) {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(false);

  async function filterStockReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    await onLoadStockReport({ dateFrom, dateTo });
    setLoading(false);
  }

  async function clearStockReportFilters() {
    setDateFrom("");
    setDateTo("");
    setLoading(true);

    await onLoadStockReport();
    setLoading(false);
  }

  return (
    <PagePanel wide>
      <PageHeader
        actions={
          <form
            className="grid w-full gap-3 sm:grid-cols-[repeat(2,minmax(160px,1fr))_auto_auto] lg:w-auto"
            onSubmit={filterStockReport}
          >
            <TextField
              label="De"
              size="small"
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              label="Ate"
              size="small"
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <Button disabled={loading} type="submit" variant="contained">
              Filtrar giro
            </Button>
            <Button
              disabled={loading || (!dateFrom && !dateTo)}
              type="button"
              variant="outlined"
              onClick={() => void clearStockReportFilters()}
            >
              Limpar
            </Button>
          </form>
        }
        description="Estoque baixo, produtos sem movimentacao e giro por vendas."
        icon={<PackageSearch size={18} />}
        title="Relatorio de estoque"
      />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ReportMetric
          icon={<PackageSearch size={18} />}
          label="Produtos ativos"
          value={String(stockReport.summary.activeProductsCount)}
        />
        <ReportMetric
          icon={<AlertTriangle size={18} />}
          label="Estoque baixo"
          value={String(stockReport.summary.lowStockProductsCount)}
        />
        <ReportMetric
          icon={<PackagePlus size={18} />}
          label="Sem movimentacao"
          value={String(stockReport.summary.productsWithoutMovementCount)}
        />
        <ReportMetric
          icon={<ShoppingCart size={18} />}
          label="Qtde vendida"
          value={formatQuantity(stockReport.summary.soldQuantity)}
        />
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-3">
        <ResponsiveTable
          columns={[
            {
              header: "Estoque baixo",
              render: (item) => item.productName,
            },
            {
              align: "right",
              header: "Disp.",
              render: (item) => formatQuantity(item.availableStock),
            },
            {
              align: "right",
              header: "Min.",
              render: (item) => formatQuantity(item.minimumStock),
            },
          ]}
          emptyMessage="Nenhum produto em estoque baixo."
          getRowId={(item) => item.productId}
          items={stockReport.lowStockProducts}
        />

        <ResponsiveTable
          columns={[
            {
              header: "Sem movimentacao",
              render: (item) => item.productName,
            },
            {
              align: "right",
              header: "Estoque",
              render: (item) => formatQuantity(item.currentStock),
            },
            {
              align: "right",
              header: "Min.",
              render: (item) => formatQuantity(item.minimumStock),
            },
          ]}
          emptyMessage="Nenhum produto sem movimentacao."
          getRowId={(item) => item.productId}
          items={stockReport.productsWithoutMovement}
        />

        <ResponsiveTable
          columns={[
            {
              header: "Giro por venda",
              render: (item) => item.productName,
            },
            {
              align: "right",
              header: "Qtde",
              render: (item) => formatQuantity(item.soldQuantity),
            },
            {
              header: "Ultima venda",
              render: (item) =>
                item.lastSaleAt ? formatDateTime(item.lastSaleAt) : "-",
            },
          ]}
          emptyMessage="Nenhum giro de vendas no periodo."
          getRowId={(item) => item.productId}
          items={stockReport.turnoverProducts}
        />
      </div>
    </PagePanel>
  );
}

type SalesReportFilters = {
  dateFrom?: string;
  dateTo?: string;
};

function abcTone(abcClass: "A" | "B" | "C"): StatusTone {
  if (abcClass === "A") {
    return "success";
  }

  if (abcClass === "B") {
    return "warning";
  }

  return "neutral";
}

function ReportDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#dfe5e1] bg-[#fbfcfb] p-4">
      <span className="text-sm text-[#5f665f]">{label}</span>
      <strong className="mt-1 block text-[#2c281e]">{value}</strong>
    </div>
  );
}

function ReportMetric({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="grid min-h-28 content-start gap-2 rounded-2xl border border-[#dfe5e1] bg-white p-4 shadow-sm">
      <span
        className="flex h-9 w-9 items-center justify-center rounded-full"
        style={{
          backgroundColor: "rgba(32, 52, 102, 0.08)",
          color: frontendPalette.primaryNavy,
        }}
      >
        {icon}
      </span>
      <span className="text-sm text-[#5f665f]">{label}</span>
      <strong className="text-2xl text-[#2c281e]">{value}</strong>
    </div>
  );
}
