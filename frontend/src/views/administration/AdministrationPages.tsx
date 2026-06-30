import Alert from "@mui/material/Alert";
import MenuItem from "@mui/material/MenuItem";
import TextField from "@mui/material/TextField";
import { Building2, Plus, UserPlus, Users } from "lucide-react";
import type { AuthUser, Branch } from "../../api";
import {
  FormGrid,
  FormRow,
  PageHeader,
  PagePanel,
  ResponsiveTable,
} from "../../components/layout";
import { PrimaryButton, StatusChip } from "../../components/ui";
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

export function EmployeesPage() {
  const administration = useAdministrationData();
  const employees = administration.users.filter(
    (user) => user.role === "EMPLOYEE",
  );
  const { pagination, visibleItems } = usePaginatedRows(employees);

  return (
    <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(320px,0.8fr)_minmax(0,1.2fr)]">
      <FormGrid onSubmit={administration.createEmployee}>
        <PageHeader
          description="Crie um acesso individual para identificar as operacoes do funcionario."
          icon={<UserPlus size={18} />}
          title="Novo funcionario"
        />
        <TextField label="Nome completo" name="name" required />
        <FormRow>
          <TextField
            autoComplete="off"
            label="Email de acesso"
            name="email"
            required
            type="email"
          />
          <TextField label="Telefone" name="phone" />
        </FormRow>
        <TextField
          defaultValue=""
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
          helperText="Use pelo menos 12 caracteres. A senha sera entregue ao funcionario."
          label="Senha inicial"
          name="password"
          required
          slotProps={{ htmlInput: { minLength: 12 } }}
          type="password"
        />
        <PrimaryButton
          disabled={
            administration.state === "loading" ||
            administration.branches.length === 0
          }
          icon={<UserPlus size={17} />}
          type="submit"
        >
          Criar acesso
        </PrimaryButton>
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
          ]}
          emptyMessage="Nenhum funcionario cadastrado."
          getRowId={(employee) => employee.id}
          items={visibleItems}
          pagination={pagination}
        />
      </PagePanel>
    </div>
  );
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
