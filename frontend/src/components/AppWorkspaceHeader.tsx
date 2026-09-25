import Button from "@mui/material/Button";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { useState } from "react";
import {
  Building2,
  ChevronDown,
  KeyRound,
  LogOut,
  RefreshCcw,
  ShieldCheck,
} from "lucide-react";
import type { AuthUser, Branch } from "../api";
import { PasswordChangeForm } from "../auth/PasswordChangeForm";
import { frontendPalette } from "../theme";
import { SecondaryButton } from "./ui";

export function AppWorkspaceHeader({
  activeBranchId,
  activeBranchName,
  activeDescription,
  activeTitle,
  branches,
  loading,
  user,
  onChangePassword,
  onLogout,
  onRefresh,
  onSelectBranch,
}: {
  activeBranchId: string;
  activeBranchName: string | null;
  activeDescription: string;
  activeTitle: string;
  branches: Branch[];
  loading: boolean;
  user: AuthUser;
  onChangePassword: (input: {
    currentPassword: string;
    newPassword: string;
  }) => Promise<void>;
  onLogout: () => void;
  onRefresh: () => void;
  onSelectBranch: (branchId: string) => void;
}) {
  const [profileOpen, setProfileOpen] = useState(false);
  const [branchMenuAnchor, setBranchMenuAnchor] =
    useState<HTMLElement | null>(null);
  const branchLabel = activeBranchName ?? "Selecione uma filial";
  const canSwitchBranch = branches.length > 1;

  function selectBranch(branchId: string) {
    onSelectBranch(branchId);
    setBranchMenuAnchor(null);
  }

  return (
    <>
      <header className="flex flex-col gap-4 rounded-3xl border border-[#dfe5e1] bg-white/80 p-4 shadow-sm backdrop-blur sm:p-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <h1 className="m-0 text-2xl font-bold text-[#2c281e] sm:text-3xl">
            {activeTitle}
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-[#5f665f]">
            {activeDescription}
          </p>
        </div>

        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center xl:justify-end">
          {canSwitchBranch ? (
            <>
              <Button
                className="justify-start rounded-2xl border-[#dfe5e1] bg-white px-3 py-2 normal-case"
                color="inherit"
                endIcon={<ChevronDown aria-hidden="true" size={16} />}
                startIcon={
                  <Building2
                    aria-hidden="true"
                    color={frontendPalette.primaryNavy}
                    size={17}
                  />
                }
                type="button"
                variant="outlined"
                onClick={(event) => setBranchMenuAnchor(event.currentTarget)}
              >
                <BranchSummary name={branchLabel} />
              </Button>
              <Menu
                anchorEl={branchMenuAnchor}
                open={Boolean(branchMenuAnchor)}
                onClose={() => setBranchMenuAnchor(null)}
              >
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
          ) : (
            <div className="flex min-w-0 items-center gap-2 rounded-2xl border border-[#dfe5e1] bg-white px-3 py-2">
              <Building2
                aria-hidden="true"
                className="shrink-0"
                color={frontendPalette.primaryNavy}
                size={17}
              />
              <BranchSummary name={branchLabel} />
            </div>
          )}

          <Button
            loading={loading}
            startIcon={<RefreshCcw aria-hidden="true" size={17} />}
            type="button"
            variant="outlined"
            onClick={onRefresh}
          >
            {loading ? "Atualizando…" : "Atualizar dados"}
          </Button>

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
                value={
                  activeBranchName ??
                  user.branchName ??
                  "Nenhuma filial selecionada"
                }
              />
              <ProfileItem
                label="Perfil"
                value={user.role === "ADMIN" ? "Administrador" : "Funcionário"}
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
    </>
  );
}

function BranchSummary({ name }: { name: string }) {
  return (
    <span className="flex min-w-0 flex-col items-start leading-tight">
      <span className="text-[11px] font-semibold uppercase tracking-wide text-[#5f665f]">
        Filial ativa
      </span>
      <span className="max-w-[180px] truncate text-sm font-semibold text-[#2c281e]">
        {name}
      </span>
    </span>
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
