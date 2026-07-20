import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Tooltip from "@mui/material/Tooltip";
import { useState } from "react";
import {
  AlertTriangle,
  Banknote,
  Building2,
  ChevronDown,
  KeyRound,
  LogOut,
  PackagePlus,
  RefreshCcw,
  ShieldCheck,
  Tags,
  Truck,
} from "lucide-react";
import type { AuthUser, Branch, CashRegisterSession } from "../api";
import { PasswordChangeForm } from "../auth/PasswordChangeForm";
import type { View } from "../navigation";
import { frontendPalette } from "../theme";
import { Metric } from "./shell";
import { SecondaryButton } from "./ui";

export function AppWorkspaceHeader({
  activeDescription,
  activeBranchId,
  activeBranchName,
  activeTitle,
  brandCount,
  branches,
  cashRegister,
  lowStockCount,
  productCount,
  supplierCount,
  user,
  view,
  onChangePassword,
  onSelectBranch,
  onLogout,
  onRefresh,
  onSelectView,
}: {
  activeDescription: string;
  activeBranchId: string;
  activeBranchName: string | null;
  activeTitle: string;
  brandCount: number;
  branches: Branch[];
  cashRegister: CashRegisterSession | null;
  lowStockCount: number;
  productCount: number;
  supplierCount: number;
  user: AuthUser;
  view: View;
  onChangePassword: (input: {
    currentPassword: string;
    newPassword: string;
  }) => Promise<void>;
  onSelectBranch: (branchId: string) => void;
  onLogout: () => void;
  onRefresh: () => void;
  onSelectView: (view: View) => void;
}) {
  const cashStatus = cashRegister ? "Aberto" : "Fechado";
  const [profileOpen, setProfileOpen] = useState(false);
  const [branchMenuAnchor, setBranchMenuAnchor] =
    useState<HTMLElement | null>(null);
  const branchLabel = activeBranchName ?? "Todas as filiais";

  function closeBranchMenu() {
    setBranchMenuAnchor(null);
  }

  function selectBranch(branchId: string) {
    onSelectBranch(branchId);
    closeBranchMenu();
  }

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

          {user.role === "ADMIN" ? (
            <>
              <Button
                className="justify-start rounded-2xl border-[#dfe5e1] bg-white px-3 py-2 normal-case"
                color="inherit"
                endIcon={<ChevronDown size={16} />}
                startIcon={
                  <Building2 color={frontendPalette.primaryNavy} size={17} />
                }
                variant="outlined"
                onClick={(event) => setBranchMenuAnchor(event.currentTarget)}
              >
                <span className="flex min-w-0 flex-col items-start leading-tight">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-[#5f665f]">
                    Filial ativa
                  </span>
                  <span className="max-w-[180px] truncate text-sm font-semibold text-[#2c281e]">
                    {branchLabel}
                  </span>
                </span>
              </Button>
              <Menu
                anchorEl={branchMenuAnchor}
                open={Boolean(branchMenuAnchor)}
                onClose={closeBranchMenu}
              >
                <MenuItem
                  selected={!activeBranchId}
                  onClick={() => selectBranch("")}
                >
                  Todas as filiais
                </MenuItem>
                {branches.map((branch) => (
                  <MenuItem
                    key={branch.id}
                    selected={branch.id === activeBranchId}
                    onClick={() => selectBranch(branch.id)}
                  >
                    {branch.name}
                  </MenuItem>
                ))}
              </Menu>
            </>
          ) : null}

          <button
            className="flex min-w-0 cursor-pointer items-center gap-2 rounded-2xl border border-[#dfe5e1] bg-[#f7f7f4] px-3 py-2 text-left hover:border-[#8a9f9d]"
            type="button"
            onClick={() => setProfileOpen((open) => !open)}
          >
            <ShieldCheck color={frontendPalette.primaryNavy} size={17} />
            <div className="min-w-0">
              <strong className="block truncate text-sm text-[#2c281e]">
                {user.name}
              </strong>
              <span className="block truncate text-xs text-[#5f665f]">
                {user.email}
              </span>
            </div>
          </button>

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

      {profileOpen ? (
        <section className="mt-4 grid gap-4 rounded-3xl border border-[#dfe5e1] bg-white p-4 shadow-sm sm:p-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(320px,1.2fr)]">
          <div className="min-w-0">
            <div className="mb-4 flex items-center gap-2 text-[#203466]">
              <ShieldCheck size={18} />
              <strong>Meu perfil</strong>
            </div>
            <dl className="grid gap-3 text-sm">
              <ProfileItem label="Nome" value={user.name} />
              <ProfileItem label="Email" value={user.email} />
              <ProfileItem
                label="Filial"
                value={activeBranchName ?? user.branchName ?? "Todas as filiais"}
              />
              <ProfileItem
                label="Perfil"
                value={user.role === "ADMIN" ? "Administrador" : "Funcionario"}
              />
              <ProfileItem
                label="Ultimo login"
                value={
                  user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "-"
                }
              />
              <ProfileItem
                label="Permissoes"
                value={
                  user.role === "ADMIN"
                    ? "Acesso administrativo"
                    : `${user.permissions.length} permissao(oes)`
                }
              />
            </dl>
          </div>
          <div className="min-w-0 rounded-2xl border border-[#dfe5e1] bg-[#fbfcfb] p-4">
            <div className="flex items-center gap-2 text-[#203466]">
              <KeyRound size={18} />
              <strong>Alterar senha</strong>
            </div>
            <PasswordChangeForm
              successMessage="Senha alterada. Continue usando normalmente."
              onCancel={() => setProfileOpen(false)}
              onChangePassword={onChangePassword}
            />
          </div>
        </section>
      ) : null}

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

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function ProfileItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[#e4e9e5] bg-[#fbfcfb] px-3 py-2">
      <dt className="text-xs font-semibold uppercase tracking-wide text-[#5f665f]">
        {label}
      </dt>
      <dd className="m-0 truncate text-[#2c281e]">{value}</dd>
    </div>
  );
}
