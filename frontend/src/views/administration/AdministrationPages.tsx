import Alert from "@mui/material/Alert";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import Switch from "@mui/material/Switch";
import TextField from "@mui/material/TextField";
import { useEffect, useState } from "react";
import {
  Activity,
  Building2,
  KeyRound,
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
  ClientCompanyLookup,
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
  TableActionsMenu,
} from "../../components/ui";
import { usePaginatedRows } from "../../hooks/usePaginatedRows";
import { useAdministrationData } from "./useAdministrationData";

export function BranchesPage() {
  const administration = useAdministrationData();
  const selectedBranch = administration.selectedBranch;
  const { pagination, visibleItems } = usePaginatedRows(
    administration.branches,
  );

  return (
    <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(300px,0.7fr)_minmax(0,1.3fr)]">
      <BranchForm
        key={selectedBranch?.id ?? "new-branch"}
        administration={administration}
        selectedBranch={selectedBranch}
      />

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
              header: "CNPJ",
              render: (branch: Branch) => branch.document ?? "-",
            },
            {
              header: "Cidade",
              render: (branch: Branch) =>
                [branch.addressCity, branch.addressState]
                  .filter(Boolean)
                  .join("/") || "-",
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
            {
              header: "Acoes",
              render: (branch: Branch) => (
                <TableActionsMenu
                  actions={[
                    {
                      icon: <Pencil size={16} />,
                      label: "Editar filial",
                      onSelect: () => administration.selectBranch(branch),
                    },
                  ]}
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

function BranchForm({
  administration,
  selectedBranch,
}: {
  administration: ReturnType<typeof useAdministrationData>;
  selectedBranch?: Branch;
}) {
  const [lookupState, setLookupState] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [values, setValues] = useState(branchFormValues(selectedBranch));

  useEffect(() => {
    setValues(branchFormValues(selectedBranch));
    setLookupState("idle");
  }, [selectedBranch]);

  async function lookupCompany() {
    const document = values.document.trim();

    if (!document) {
      setLookupState("error");
      return;
    }

    setLookupState("loading");

    try {
      const company = await administration.lookupBranchCompany(document);

      setValues((currentValues) => ({
        ...currentValues,
        ...branchLookupValues(company),
      }));
      setLookupState("success");
    } catch {
      setLookupState("error");
    }
  }

  function updateValue(name: keyof BranchFormValues, value: string) {
    setValues((currentValues) => ({
      ...currentValues,
      [name]: value,
    }));
  }

  return (
    <FormGrid onSubmit={administration.saveBranch}>
      <PageHeader
        description="Esses dados identificam a unidade nos documentos comerciais e preparam a filial para a NF-e."
        icon={selectedBranch ? <Pencil size={18} /> : <Building2 size={18} />}
        title={selectedBranch ? "Editar filial" : "Nova filial"}
      />
      <FormRow>
        <BranchTextField
          label="Nome da filial"
          name="name"
          required
          updateValue={updateValue}
          values={values}
        />
        <BranchTextField
          helperText="Identificador curto, como 1, 2, CENTRO ou NORTE."
          label="Codigo"
          name="code"
          updateValue={updateValue}
          values={values}
        />
      </FormRow>
      <FormRow>
        <BranchTextField
          label="Nome fantasia"
          name="tradeName"
          updateValue={updateValue}
          values={values}
        />
        <BranchTextField
          label="Razao social"
          name="legalName"
          updateValue={updateValue}
          values={values}
        />
      </FormRow>
      <FormRow>
        <BranchTextField
          label="CNPJ"
          name="document"
          updateValue={updateValue}
          values={values}
        />
        <BranchTextField
          label="Inscricao estadual"
          name="stateRegistration"
          updateValue={updateValue}
          values={values}
        />
      </FormRow>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm text-[#5f665f]">
          {branchLookupStatusLabel[lookupState]}
        </span>
        <SecondaryButton
          disabled={lookupState === "loading"}
          type="button"
          onClick={() => void lookupCompany()}
        >
          Buscar CNPJ
        </SecondaryButton>
      </div>
      <FormRow>
        <BranchTextField
          label="Logradouro"
          name="addressStreet"
          updateValue={updateValue}
          values={values}
        />
        <BranchTextField
          label="Numero"
          name="addressNumber"
          updateValue={updateValue}
          values={values}
        />
      </FormRow>
      <FormRow>
        <BranchTextField
          label="Complemento"
          name="addressComplement"
          updateValue={updateValue}
          values={values}
        />
        <BranchTextField
          label="Bairro"
          name="addressDistrict"
          updateValue={updateValue}
          values={values}
        />
      </FormRow>
      <FormRow>
        <BranchTextField
          label="Cidade"
          name="addressCity"
          updateValue={updateValue}
          values={values}
        />
        <BranchTextField
          label="UF"
          name="addressState"
          updateValue={updateValue}
          values={values}
        />
      </FormRow>
      <FormRow>
        <BranchTextField
          label="CEP"
          name="addressZipCode"
          updateValue={updateValue}
          values={values}
        />
        <BranchTextField
          label="Telefone"
          name="phone"
          updateValue={updateValue}
          values={values}
        />
      </FormRow>
      <BranchTextField
        label="Email"
        name="email"
        updateValue={updateValue}
        values={values}
      />
      <ActionGroup>
        <PrimaryButton
          disabled={administration.state === "loading"}
          icon={selectedBranch ? <Pencil size={17} /> : <Plus size={17} />}
          type="submit"
        >
          {selectedBranch ? "Atualizar filial" : "Cadastrar filial"}
        </PrimaryButton>
        {selectedBranch ? (
          <SecondaryButton
            icon={<X size={17} />}
            type="button"
            onClick={administration.clearSelectedBranch}
          >
            Cancelar
          </SecondaryButton>
        ) : null}
      </ActionGroup>
      <AdministrationMessage administration={administration} />
    </FormGrid>
  );
}

type BranchFormValues = {
  addressCity: string;
  addressComplement: string;
  addressDistrict: string;
  addressNumber: string;
  addressState: string;
  addressStreet: string;
  addressZipCode: string;
  code: string;
  document: string;
  email: string;
  legalName: string;
  name: string;
  phone: string;
  stateRegistration: string;
  tradeName: string;
};

function BranchTextField({
  helperText,
  label,
  name,
  required,
  updateValue,
  values,
}: {
  helperText?: string;
  label: string;
  name: keyof BranchFormValues;
  required?: boolean;
  updateValue: (name: keyof BranchFormValues, value: string) => void;
  values: BranchFormValues;
}) {
  return (
    <TextField
      helperText={helperText}
      label={label}
      name={name}
      required={required}
      value={values[name]}
      onChange={(event) => updateValue(name, event.target.value)}
    />
  );
}

const branchLookupStatusLabel: Record<
  "idle" | "loading" | "success" | "error",
  string
> = {
  error: "Informe um CNPJ valido ou tente novamente.",
  idle: "Preencha o CNPJ e busque os dados fiscais da filial.",
  loading: "Consultando CNPJ...",
  success: "Dados encontrados. Revise antes de salvar.",
};

function branchFormValues(branch?: Branch): BranchFormValues {
  return {
    addressCity: branch?.addressCity ?? "",
    addressComplement: branch?.addressComplement ?? "",
    addressDistrict: branch?.addressDistrict ?? "",
    addressNumber: branch?.addressNumber ?? "",
    addressState: branch?.addressState ?? "",
    addressStreet: branch?.addressStreet ?? "",
    addressZipCode: branch?.addressZipCode ?? "",
    code: branch?.code ?? "",
    document: branch?.document ?? "",
    email: branch?.email ?? "",
    legalName: branch?.legalName ?? "",
    name: branch?.name ?? "",
    phone: branch?.phone ?? "",
    stateRegistration: branch?.stateRegistration ?? "",
    tradeName: branch?.tradeName ?? "",
  };
}

function branchLookupValues(
  company: ClientCompanyLookup,
): Partial<BranchFormValues> {
  return {
    addressCity: company.addressCity ?? "",
    addressComplement: company.addressComplement ?? "",
    addressDistrict: company.addressDistrict ?? "",
    addressNumber: company.addressNumber ?? "",
    addressState: company.addressState ?? "",
    addressStreet: company.addressStreet ?? "",
    addressZipCode: company.addressZipCode ?? "",
    document: company.document,
    email: company.email ?? "",
    legalName: company.name,
    phone: company.phone ?? "",
    stateRegistration: company.stateRegistration ?? "",
    tradeName: company.name,
  };
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
  const selectedPasswordResetEmployee =
    administration.selectedPasswordResetEmployee;
  const employees = administration.users.filter(
    (user) => user.role === "EMPLOYEE",
  );
  const { pagination, visibleItems } = usePaginatedRows(employees);

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
            icon={
              selectedEmployee ? <Pencil size={18} /> : <UserPlus size={18} />
            }
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
                ? "Preencha somente para trocar a senha atual. Ao trocar, o funcionario devera definir uma nova senha no proximo acesso."
                : "Use pelo menos 12 caracteres. Esta senha temporaria sera entregue ao funcionario."
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
                Marque apenas as areas sensiveis que esse usuario pode acessar.
                O menu e a API bloqueiam telas nao liberadas.
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
            title="Funcionários cadastrados"
          />
          <ResponsiveTable
            columns={[
              {
                header: "Funcionário",
                render: (employee: AuthUser) => (
                  <div className="grid gap-1">
                    <strong className="font-semibold text-[#2c281e]">
                      {employee.name}
                    </strong>
                    {employee.mustChangePassword ? (
                      <StatusChip label="Troca obrigatoria" tone="warning" />
                    ) : (
                      <StatusChip label="Senha definida" tone="success" />
                    )}
                  </div>
                ),
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
                header: "Ultimo login",
                render: (employee: AuthUser) =>
                  employee.lastLoginAt
                    ? formatDateTime(employee.lastLoginAt)
                    : "-",
              },
              {
                header: "Permissoes",
                render: (employee: AuthUser) =>
                  formatEmployeePermissions(employee.permissions),
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
                          onSelect: () =>
                            administration.selectEmployee(employee),
                        },
                        {
                          icon: <KeyRound size={15} />,
                          label: "Redefinir senha",
                          onSelect: () =>
                            administration.selectPasswordResetEmployee(
                              employee,
                            ),
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
          {selectedPasswordResetEmployee ? (
            <form
              className="mt-5 grid gap-4 rounded-2xl border border-[#dfe5e1] bg-[#fbfcfb] p-4"
              onSubmit={administration.resetEmployeePassword}
            >
              <PageHeader
                description={`Defina uma senha temporaria para ${selectedPasswordResetEmployee.name}. O funcionario sera obrigado a trocar no proximo acesso.`}
                icon={<KeyRound size={18} />}
                title="Redefinir senha"
              />
              <TextField
                autoComplete="new-password"
                helperText="Use pelo menos 12 caracteres."
                label="Nova senha temporaria"
                name="password"
                required
                slotProps={{ htmlInput: { minLength: 12 } }}
                type="password"
              />
              <ActionGroup align="start">
                <PrimaryButton icon={<KeyRound size={17} />} type="submit">
                  Redefinir senha
                </PrimaryButton>
                <SecondaryButton
                  icon={<X size={17} />}
                  type="button"
                  onClick={administration.clearSelectedPasswordResetEmployee}
                >
                  Cancelar
                </SecondaryButton>
              </ActionGroup>
            </form>
          ) : null}
        </PagePanel>
      </div>

      <AuthEventsPanel
        administration={administration}
      />
    </div>
  );
}

function AuthEventsPanel({
  administration,
}: {
  administration: ReturnType<typeof useAdministrationData>;
}) {
  return (
    <PagePanel wide>
      <PageHeader
        description="Ultimos acessos registrados pelo sistema para investigacao administrativa."
        icon={<Activity size={18} />}
        title="Auditoria de acessos"
      />
      <form
        key={JSON.stringify(administration.authEventFilters)}
        className="grid gap-3 rounded-2xl border border-[#dfe5e1] bg-[#fbfcfb] p-4 md:grid-cols-5"
        onSubmit={administration.applyAuthEventFilters}
      >
        <TextField
          defaultValue={administration.authEventFilters.email}
          label="Email"
          name="email"
          size="small"
        />
        <TextField
          defaultValue={administration.authEventFilters.eventType}
          label="Evento"
          name="eventType"
          select
          size="small"
        >
          <MenuItem value="">Todos</MenuItem>
          {Object.entries(authEventLabels).map(([value, label]) => (
            <MenuItem key={value} value={value}>
              {label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          defaultValue={administration.authEventFilters.dateFrom}
          label="Data inicial"
          name="dateFrom"
          size="small"
          type="date"
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <TextField
          defaultValue={administration.authEventFilters.dateTo}
          label="Data final"
          name="dateTo"
          size="small"
          type="date"
          slotProps={{ inputLabel: { shrink: true } }}
        />
        <ActionGroup align="start" className="md:items-center">
          <PrimaryButton type="submit">Filtrar</PrimaryButton>
          <SecondaryButton
            type="button"
            onClick={administration.clearAuthEventFilters}
          >
            Limpar
          </SecondaryButton>
        </ActionGroup>
      </form>
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
        items={administration.authEvents}
        pagination={administration.authEventsPagination}
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
    label: "Configuração comercial",
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
    label: "Configuração fiscal",
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
    label: "Relatórios gerenciais",
  },
];

const employeePermissionLabels = employeePermissionOptions.reduce<
  Record<EmployeePermission, string>
>(
  (labels, permission) => ({
    ...labels,
    [permission.value]: permission.label,
  }),
  {} as Record<EmployeePermission, string>,
);

const authEventLabels: Record<AuthEvent["eventType"], string> = {
  SETUP_SUCCESS: "Setup inicial",
  LOGIN_SUCCESS: "Login",
  LOGIN_FAILURE: "Falha no login",
  LOGOUT: "Logout",
  PASSWORD_CHANGED: "Senha alterada",
  PASSWORD_RESET: "Senha redefinida",
  EMPLOYEE_CREATED: "Funcionário criado",
  EMPLOYEE_UPDATED: "Funcionário atualizado",
  EMPLOYEE_STATUS_CHANGED: "Status alterado",
};

const authEventTones: Record<
  AuthEvent["eventType"],
  "success" | "neutral" | "warning" | "error"
> = {
  SETUP_SUCCESS: "success",
  LOGIN_SUCCESS: "success",
  LOGIN_FAILURE: "error",
  LOGOUT: "neutral",
  PASSWORD_CHANGED: "success",
  PASSWORD_RESET: "warning",
  EMPLOYEE_CREATED: "success",
  EMPLOYEE_UPDATED: "warning",
  EMPLOYEE_STATUS_CHANGED: "warning",
};

const authEventReasonLabels: Record<string, string> = {
  USER_NOT_FOUND: "Usuario nao encontrado",
  INACTIVE_USER: "Usuario inativo",
  INVALID_PASSWORD: "Senha invalida",
  UNKNOWN: "Motivo indefinido",
};

function formatEmployeePermissions(permissions: EmployeePermission[]) {
  if (permissions.length === 0) {
    return "Operacao basica";
  }

  const [firstPermission, ...otherPermissions] = permissions;
  const firstPermissionLabel =
    employeePermissionLabels[firstPermission] ?? firstPermission;

  return otherPermissions.length === 0
    ? firstPermissionLabel
    : `${firstPermissionLabel} +${otherPermissions.length}`;
}

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
