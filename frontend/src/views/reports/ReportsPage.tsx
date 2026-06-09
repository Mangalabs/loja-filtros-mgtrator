import {
  AlertTriangle,
  Banknote,
  PackagePlus,
  Send,
  ShoppingCart,
} from "lucide-react";
import type { ReactNode } from "react";
import type { ReportsOverview } from "../../api";
import { StatusChip } from "../../components/ui";
import { formatCurrency, formatDateTime } from "../../utils/format";

export function ReportsPage({
  overview,
}: {
  overview: ReportsOverview | null;
}) {
  if (!overview) {
    return (
      <div className="panel wide">
        <h2>Resumo gerencial</h2>
        <p className="field-help">Carregando indicadores operacionais...</p>
      </div>
    );
  }

  return (
    <section className="layout-grid stock-entry-layout">
      <div className="panel form-panel">
        <div className="panel-header compact">
          <div>
            <h2>Caixa atual</h2>
            <span>Status operacional do caixa.</span>
          </div>
          <Banknote size={18} />
        </div>
        {overview.openCashRegister ? (
          <div className="cash-register-details">
            <div>
              <span>Status</span>
              <strong>Aberto</strong>
            </div>
            <div>
              <span>Operador</span>
              <strong>{overview.openCashRegister.openedByUserName}</strong>
            </div>
            <div>
              <span>Abertura</span>
              <strong>
                {formatDateTime(overview.openCashRegister.openedAt)}
              </strong>
            </div>
          </div>
        ) : (
          <div className="alert">Nenhum caixa aberto no momento.</div>
        )}
      </div>

      <div className="panel wide">
        <div className="panel-header compact">
          <div>
            <h2>Resumo gerencial</h2>
            <span>Primeiros indicadores operacionais da filial.</span>
          </div>
          <StatusChip label="Atualizado" tone="success" />
        </div>
        <div className="reports-metrics">
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
      </div>
    </section>
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
    <div className="metric report-metric">
      <span className="metric-icon">{icon}</span>
      <span className="metric-label">
        {label}
      </span>
      <strong>{value}</strong>
    </div>
  );
}
