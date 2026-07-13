import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";
import Skeleton from "@mui/material/Skeleton";
import TextField from "@mui/material/TextField";
import {
  AlertTriangle,
  Banknote,
  CircleDollarSign,
  CreditCard,
  PackagePlus,
  Send,
  ShoppingCart,
} from "lucide-react";
import { useState, type FormEvent, type ReactNode } from "react";
import type { ReportsOverview, SalesReport } from "../../api";
import { PageHeader, PagePanel, ResponsiveTable } from "../../components/layout";
import { StatusChip } from "../../components/ui";
import { frontendPalette } from "../../theme";
import {
  formatCurrency,
  formatDateTime,
  formatQuantity,
} from "../../utils/format";

export function ReportsPage({
  onLoadSalesReport,
  overview,
  salesReport,
}: {
  onLoadSalesReport: (filters?: SalesReportFilters) => Promise<boolean>;
  overview: ReportsOverview | null;
  salesReport: SalesReport | null;
}) {
  const contentByState = {
    loading: <ReportsLoading />,
    ready:
      overview && salesReport ? (
        <ReportsOverviewContent
          overview={overview}
          onLoadSalesReport={onLoadSalesReport}
          salesReport={salesReport}
        />
      ) : null,
  };
  const state = overview && salesReport ? "ready" : "loading";

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
  onLoadSalesReport,
  overview,
  salesReport,
}: {
  onLoadSalesReport: (filters?: SalesReportFilters) => Promise<boolean>;
  overview: ReportsOverview;
  salesReport: SalesReport;
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
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
          icon={<CircleDollarSign size={18} />}
          label="Liquido"
          value={formatCurrency(salesReport.summary.netAmount)}
        />
      </div>

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
    </PagePanel>
  );
}

type SalesReportFilters = {
  dateFrom?: string;
  dateTo?: string;
};

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
