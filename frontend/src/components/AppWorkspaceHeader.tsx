import IconButton from "@mui/material/IconButton";
import { AlertTriangle, Banknote, LogOut, PackagePlus, RefreshCcw, ShieldCheck, Tags, Truck } from "lucide-react";
import type { AuthUser, CashRegisterSession } from "../api";
import type { View } from "../navigation";
import { Metric } from "./shell";
import { SecondaryButton } from "./ui";

export function AppWorkspaceHeader({
  activeDescription,
  activeTitle,
  brandCount,
  cashRegister,
  lowStockCount,
  productCount,
  supplierCount,
  user,
  view,
  onLogout,
  onRefresh,
  onSelectView,
}: {
  activeDescription: string;
  activeTitle: string;
  brandCount: number;
  cashRegister: CashRegisterSession | null;
  lowStockCount: number;
  productCount: number;
  supplierCount: number;
  user: AuthUser;
  view: View;
  onLogout: () => void;
  onRefresh: () => void;
  onSelectView: (view: View) => void;
}) {
  return (
    <>
      <header className="topbar">
        <div>
          <h1>{activeTitle}</h1>
          <p>{activeDescription}</p>
        </div>
        <div className="topbar-actions">
          <button
            className={cashRegister ? "cash-status-button open" : "cash-status-button closed"}
            title="Ir para caixa"
            type="button"
            onClick={() => onSelectView("cash-register")}
          >
            <Banknote size={17} />
            <span>Caixa</span>
            <strong>{cashRegister ? "Aberto" : "Fechado"}</strong>
          </button>
          <div className="signed-user">
            <ShieldCheck size={17} />
            <div>
              <strong>{user.name}</strong>
              <span>{user.email}</span>
            </div>
          </div>
          <IconButton color="success" onClick={onRefresh} title="Atualizar">
            <RefreshCcw size={18} />
          </IconButton>
          <SecondaryButton icon={<LogOut size={17} />} type="button" onClick={onLogout}>
            Sair
          </SecondaryButton>
        </div>
      </header>

      <section className="summary-grid">
        <Metric
          active={view === "products"}
          icon={<PackagePlus size={18} />}
          label="Produtos"
          value={productCount}
          onClick={() => onSelectView("products")}
        />
        <Metric
          active={view === "brands"}
          icon={<Tags size={18} />}
          label="Fabricantes"
          value={brandCount}
          onClick={() => onSelectView("brands")}
        />
        <Metric
          active={view === "suppliers"}
          icon={<Truck size={18} />}
          label="Fornecedores"
          value={supplierCount}
          onClick={() => onSelectView("suppliers")}
        />
        <Metric
          active={view === "low-stock"}
          icon={<AlertTriangle size={18} />}
          label="Reposicao"
          value={lowStockCount}
          onClick={() => onSelectView("low-stock")}
        />
      </section>
    </>
  );
}
