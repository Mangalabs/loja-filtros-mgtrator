import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import {
  AlertTriangle,
  Banknote,
  LogOut,
  PackagePlus,
  RefreshCcw,
  ShieldCheck,
  Tags,
  Truck,
} from "lucide-react";
import type { AuthUser, CashRegisterSession } from "../api";
import type { View } from "../navigation";
import { frontendPalette } from "../theme";
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
  const cashStatus = cashRegister ? "Aberto" : "Fechado";

  return (
    <>
      <header className="flex flex-col gap-4 rounded-3xl border border-[#dfe5e1] bg-white/80 p-4 shadow-sm backdrop-blur sm:p-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <h1 className="m-0 truncate text-2xl font-bold text-[#2c281e] sm:text-3xl">
            {activeTitle}
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-[#5f665f]">
            {activeDescription}
          </p>
        </div>

        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center xl:justify-end">
          <Button
            color={cashRegister ? "success" : "warning"}
            startIcon={<Banknote size={17} />}
            variant="outlined"
            title="Ir para caixa"
            type="button"
            onClick={() => onSelectView("cash-register")}
          >
            Caixa {cashStatus}
          </Button>

          <div className="flex min-w-0 items-center gap-2 rounded-2xl border border-[#dfe5e1] bg-[#f7f7f4] px-3 py-2">
            <ShieldCheck color={frontendPalette.primaryNavy} size={17} />
            <div className="min-w-0">
              <strong className="block truncate text-sm text-[#2c281e]">
                {user.name}
              </strong>
              <span className="block truncate text-xs text-[#5f665f]">
                {user.email}
              </span>
            </div>
          </div>

          <Tooltip title="Atualizar dados">
            <IconButton color="primary" onClick={onRefresh}>
              <RefreshCcw size={18} />
            </IconButton>
          </Tooltip>

          <SecondaryButton
            icon={<LogOut size={17} />}
            type="button"
            onClick={onLogout}
          >
            Sair
          </SecondaryButton>
        </div>
      </header>

      <section className="my-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
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
        {lowStockCount > 0 ? (
          <Chip
            className="sm:col-span-2 xl:col-span-4"
            color="warning"
            label={`${lowStockCount} produto(s) precisam de reposicao`}
            variant="outlined"
          />
        ) : null}
      </section>
    </>
  );
}
