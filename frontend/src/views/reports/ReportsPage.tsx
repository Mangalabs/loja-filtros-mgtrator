import Alert from "@mui/material/Alert";
import Skeleton from "@mui/material/Skeleton";
import {
  AlertTriangle,
  Banknote,
  PackagePlus,
  Send,
  ShoppingCart,
} from "lucide-react";
import type { ReactNode } from "react";
import type { ReportsOverview } from "../../api";
import { PageHeader, PagePanel } from "../../components/layout";
import { StatusChip } from "../../components/ui";
import { frontendPalette } from "../../theme";
import { formatCurrency, formatDateTime } from "../../utils/format";

export function ReportsPage({
  overview,
}: {
  overview: ReportsOverview | null;
}) {
  const contentByState = {
    loading: <ReportsLoading />,
    ready: overview ? <ReportsOverviewContent overview={overview} /> : null,
  };
  const state = overview ? "ready" : "loading";

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

function ReportsOverviewContent({ overview }: { overview: ReportsOverview }) {
  return (
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
  );
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
