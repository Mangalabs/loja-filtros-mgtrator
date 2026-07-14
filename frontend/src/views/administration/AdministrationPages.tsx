import Alert from "@mui/material/Alert";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import {
  Activity,
  Building2,
  Pencil,
  Plus,
  Power,
  PowerOff,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import type {
  AuthEvent,
  AuthUser,
  Branch,
  EmployeePermission,
} from "../../api";
import {
  ActionGroup,
  FormGrid,
  FormRow,
  PageHeader,
  PagePanel,
  ResponsiveTable,
} from "../../components/layout";
import {
  PrimaryButton,
  SecondaryButton,
  StatusChip,
  TableActionButton,
  TableActionsMenu,
} from "../../components/ui";
import { usePaginatedRows } from "../../hooks/usePaginatedRows";
import { useAdministrationData } from "./useAdministrationData";

export function BranchesPage() {
  const administration = useAdministrationData();
  const { pagination, visibleItems } = usePaginatedRows(
    administration.branches,
  );

  return (
    <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(300px,0.7fr)_minmax(0,1.3fr)]">
      <FormGrid onSubmit={administration.createBranch}>
        <PageHeader
          description="A filial identifica a unidade onde o funcionario trabalha."
          icon={<Building2 size={18} />}
          title="Nova filial"
        />
        <TextField label="Nome da filial" name="name" required />
        <TextField
          helperText="Identificador curto opcional, como CENTRO ou NORTE."
          label="Codigo"
          name="code"
        />
        <PrimaryButton
          disabled={administration.state === "loading"}
          icon={<Plus size={17} />}
          type="submit"
        >
          Cadastrar filial
        </PrimaryButton>
        <AdministrationMessage administration={administration} />
      </FormGrid>

      <PagePanel wide>
        <PageHeader
          description="Unidades disponiveis para vinculo de funcionarios."
          icon={<Building2 size={18} />}
          title="Filiais cadastradas"
        />
        <ResponsiveTable
          columns={[
            {
              header: "Filial",
              render: (branch: Branch) => branch.name,
            },
            {
              header: "Codigo",
              render: (branch: Branch) => branch.code ?? "-",
            },
            {
              header: "Status",
              render: (branch: Branch) => (
                <StatusChip
                  label={branch.active ? "Ativa" : "Inativa"}
                  tone={branch.active ? "success" : "neutral"}
                />
              ),
            },
          ]}
          emptyMessage="Nenhuma filial cadastrada."
          getRowId={(branch) => branch.id}
          items={visibleItems}
          pagination={pagination}
        />
      </PagePanel>
    </div>
  );
}

export type RequestConfirmation = (
  message: string,
  title?: string,
  confirmLabel?: string,
) => Promise<boolean>;

export function EmployeesPage({
  requestConfirmation,
}: {
  requestConfirmation: RequestConfirmation;
}) {
  const administration = useAdministrationData();
  const selectedEmployee = administration.selectedEmployee;
  const employees = administration.users.filter(
    (user) => user.role === "EMPLOYEE",
  );
  const { pagination, visibleItems } = usePaginatedRows(employees);
  const {
    pagination: authEventsPagination,
    visibleItems: visibleAuthEvents,
  } = usePaginatedRows(administration.authEvents);

  return (
    <div className="grid min-w-0 gap-5">
      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(320px,0.8fr)_minmax(0,1.2fr)]">
        <FormGrid
          key={selectedEmployee?.id ?? "new-employee"}
          onSubmit={administration.saveEmployee}
        >
        <PageHeader
          description={
            selectedEmployee
              ? "Atualize os dados do acesso. Deixe a senha vazia para manter a atual."
              : "Crie um acesso individual para identificar as operacoes do funcionario."
          }
          icon={selectedEmployee ? <Pencil size={18} /> : <UserPlus size={18} />}
          title={selectedEmployee ? "Editar funcionario" : "Novo funcionario"}
        />
        <TextField
          defaultValue={selectedEmployee?.name ?? ""}
          label="Nome completo"
          name="name"
          required
        />
        <FormRow>
          <TextField
            autoComplete="off"
            defaultValue={selectedEmployee?.email ?? ""}
            label="Email de acesso"
            name="email"
            required
            type="email"
          />
          <TextField
            defaultValue={selectedEmployee?.phone ?? ""}
            label="Telefone"
            name="phone"
          />
        </FormRow>
        <TextField
          defaultValue={selectedEmployee?.branchId ?? ""}
          label="Filial"
          name="branchId"
          required
          select
        >
          <MenuItem value="" disabled>
            Selecione uma filial
          </MenuItem>
          {administration.branches
            .filter((branch) => branch.active)
            .map((branch) => (
              <MenuItem key={branch.id} value={branch.id}>
                {branch.name}
              </MenuItem>
            ))}
        </TextField>
        <TextField
          autoComplete="new-password"
          helperText={
            selectedEmployee
              ? "Preencha somente para trocar a senha atual."
              : "Use pelo menos 12 caracteres. A senha sera entregue ao funcionario."
          }
          label={selectedEmployee ? "Nova senha" : "Senha inicial"}
          name="password"
          required={!selectedEmployee}
          slotProps={{ htmlInput: { minLength: 12 } }}
          type="password"
        />
        <section className="grid gap-3 rounded-2xl border border-[#dfe5e1] bg-[#fbfcfb] p-4">
          <div>
            <strong className="block text-sm text-[#2c281e]">
              Permissoes do funcionario
            </strong>
            <span className="text-xs text-[#5f665f]">
              Marque apenas as areas que esse usuario pode acessar.
            </span>
          </div>
          <div className="grid gap-1 sm:grid-cols-2">
            {employeePermissionOptions.map((permission) => (
              <FormControlLabel
                key={permission.value}
                control={
                  <Switch
                    defaultChecked={selectedEmployee?.permissions.includes(
                      permission.value,
                    )}
                    name="permissions"
                    value={permission.value}
                  />
                }
                label={permission.label}
              />
            ))}
          </div>
        </section>
        <ActionGroup align="start">
          <PrimaryButton
            disabled={
              administration.state === "loading" ||
              administration.branches.length === 0
            }
            icon={
              selectedEmployee ? (
                <Pencil size={17} />
              ) : (
                <UserPlus size={17} />
              )
            }
            type="submit"
          >
            {selectedEmployee ? "Salvar alteracoes" : "Criar acesso"}
          </PrimaryButton>
          {selectedEmployee ? (
            <SecondaryButton
              icon={<X size={17} />}
              type="button"
              onClick={administration.clearSelectedEmployee}
            >
              Cancelar edicao
            </SecondaryButton>
          ) : null}
        </ActionGroup>
        <AdministrationMessage administration={administration} />
        </FormGrid>

        <PagePanel wide>
        <PageHeader
          description="Acessos operacionais vinculados as filiais."
          icon={<Users size={18} />}
          title="Funcionarios cadastrados"
        />
        <ResponsiveTable
          columns={[
            {
              header: "Funcionario",
              render: (employee: AuthUser) => employee.name,
            },
            {
              header: "Email",
              render: (employee: AuthUser) => employee.email,
            },
            {
              header: "Filial",
              render: (employee: AuthUser) => employee.branchName ?? "-",
            },
            {
              header: "Telefone",
              render: (employee: AuthUser) => employee.phone ?? "-",
            },
            {
              header: "Status",
              render: (employee: AuthUser) => (
                <StatusChip
                  label={employee.active ? "Ativo" : "Inativo"}
                  tone={employee.active ? "success" : "neutral"}
                />
              ),
            },
            {
              align: "right",
              header: "Acoes",
              render: (employee: AuthUser) => (
                <div className="flex justify-end">
                  <TableActionsMenu
                    actions={[
                      {
                        icon: <Pencil size={15} />,
                        label: "Editar",
                        onSelect: () => administration.selectEmployee(employee),
                      },
                      {
                        icon: employee.active ? (
                          <PowerOff size={15} />
                        ) : (
                          <Power size={15} />
                        ),
                        label: employee.active ? "Inativar" : "Ativar",
                        onSelect: () =>
                          void confirmEmployeeStatus(
                            employee,
                            requestConfirmation,
                            administration.changeEmployeeStatus,
                          ),
                      },
                    ]}
                  />
                </div>
              ),
            },
          ]}
          emptyMessage="Nenhum funcionario cadastrado."
          getRowId={(employee) => employee.id}
          items={visibleItems}
          pagination={pagination}
        />
        </PagePanel>
      </div>

      <AuthEventsPanel
        authEvents={visibleAuthEvents}
        pagination={authEventsPagination}
      />
    </div>
  );
}

function AuthEventsPanel({
  authEvents,
  pagination,
}: {
  authEvents: AuthEvent[];
  pagination: ReturnType<typeof usePaginatedRows<AuthEvent>>["pagination"];
}) {
  return (
    <PagePanel wide>
      <PageHeader
        description="Ultimos acessos registrados pelo sistema para investigacao administrativa."
        icon={<Activity size={18} />}
        title="Auditoria de acessos"
      />
      <ResponsiveTable
        columns={[
          {
            header: "Evento",
            render: (event: AuthEvent) => (
              <StatusChip
                label={authEventLabels[event.eventType]}
                tone={authEventTones[event.eventType]}
              />
            ),
          },
          {
            header: "Email",
            render: (event: AuthEvent) => event.email,
          },
          {
            header: "Motivo",
            render: (event: AuthEvent) =>
              event.reason
                ? authEventReasonLabels[event.reason] ?? event.reason
                : "-",
          },
          {
            header: "IP",
            render: (event: AuthEvent) => event.ipAddress ?? "-",
          },
          {
            header: "Data",
            render: (event: AuthEvent) => formatDateTime(event.createdAt),
          },
        ]}
        emptyMessage="Nenhum acesso registrado."
        getRowId={(event) => event.id}
        items={authEvents}
        pagination={pagination}
      />
    </PagePanel>
  );
}

const employeePermissionOptions: Array<{
  value: EmployeePermission;
  label: string;
}> = [
  {
    value: "MANAGE_COMMERCIAL_SETTINGS",
    label: "Configuracao comercial",
  },
  {
    value: "IMPORT_PURCHASE_INVOICES",
    label: "Importar XML de compra",
  },
  {
    value: "MANAGE_STOCK_ADJUSTMENTS",
    label: "Ajuste manual de estoque",
  },
  {
    value: "MANAGE_PAYMENT_METHODS",
    label: "Formas de pagamento",
  },
  {
    value: "MANAGE_FISCAL_SETTINGS",
    label: "Configuracao fiscal",
  },
  {
    value: "MANAGE_FISCAL_DOCUMENTS",
    label: "Notas fiscais",
  },
  {
    value: "MANAGE_CASH_REGISTER",
    label: "Caixa",
  },
  {
    value: "VIEW_REPORTS",
    label: "Relatorios gerenciais",
  },
];

const authEventLabels: Record<AuthEvent["eventType"], string> = {
  SETUP_SUCCESS: "Setup inicial",
  LOGIN_SUCCESS: "Login",
  LOGIN_FAILURE: "Falha no login",
  LOGOUT: "Logout",
};

const authEventTones: Record<
  AuthEvent["eventType"],
  "success" | "neutral" | "warning" | "error"
> = {
  SETUP_SUCCESS: "success",
  LOGIN_SUCCESS: "success",
  LOGIN_FAILURE: "error",
  LOGOUT: "neutral",
};

const authEventReasonLabels: Record<string, string> = {
  USER_NOT_FOUND: "Usuario nao encontrado",
  INACTIVE_USER: "Usuario inativo",
  INVALID_PASSWORD: "Senha invalida",
  UNKNOWN: "Motivo indefinido",
};

async function confirmEmployeeStatus(
  employee: AuthUser,
  requestConfirmation: RequestConfirmation,
  changeEmployeeStatus: (employee: AuthUser) => Promise<void>,
) {
  const action = employee.active ? "inativar" : "ativar";
  const confirmed = await requestConfirmation(
    `Deseja ${action} o acesso de ${employee.name}?`,
    `${employee.active ? "Inativar" : "Ativar"} funcionario`,
    employee.active ? "Inativar" : "Ativar",
  );

  if (!confirmed) {
    return;
  }

  await changeEmployeeStatus(employee);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function AdministrationMessage({
  administration,
}: {
  administration: ReturnType<typeof useAdministrationData>;
}) {
  return administration.message ? (
    <Alert
      severity={administration.state === "error" ? "error" : "success"}
      variant="outlined"
      onClose={() => administration.setMessage("")}
    >
      {administration.message}
    </Alert>
  ) : null;
}
