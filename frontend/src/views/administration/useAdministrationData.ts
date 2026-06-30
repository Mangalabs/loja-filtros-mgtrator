import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  apiGet,
  apiPatch,
  apiPost,
  apiPut,
  type ApiResult,
  type AuthUser,
  type Branch,
} from "../../api";

type AdministrationState = "loading" | "ready" | "error";

export function useAdministrationData() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<AuthUser>();
  const [state, setState] = useState<AdministrationState>("loading");
  const [message, setMessage] = useState("");

  const loadAdministration = useCallback(async () => {
    setState("loading");

    try {
      const [branchesResult, usersResult] = await Promise.all([
        apiGet<ApiResult<Branch[]>>("/branches"),
        apiGet<ApiResult<AuthUser[]>>("/users"),
      ]);

      setBranches(branchesResult.data);
      setUsers(usersResult.data);
      setState("ready");
    } catch (error) {
      setMessage(readErrorMessage(error));
      setState("error");
    }
  }, []);

  useEffect(() => {
    void loadAdministration();
  }, [loadAdministration]);

  async function createBranch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);

    await runAction(async () => {
      await apiPost<ApiResult<Branch>>("/branches", {
        name: data.get("name"),
        code: data.get("code"),
      });
      form.reset();
      setMessage("Filial cadastrada com sucesso.");
    });
  }

  async function saveEmployee(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const input = {
      name: data.get("name"),
      email: data.get("email"),
      phone: data.get("phone"),
      branchId: data.get("branchId"),
      password: data.get("password"),
    };
    const saveRequest = selectedEmployee
      ? () =>
          apiPut<ApiResult<AuthUser>>(`/users/${selectedEmployee.id}`, input)
      : () =>
          apiPost<ApiResult<AuthUser>>("/users", {
            ...input,
            role: "EMPLOYEE",
          });

    await runAction(async () => {
      await saveRequest();
      form.reset();
      setSelectedEmployee(undefined);
      setMessage(
        selectedEmployee
          ? "Funcionario atualizado com sucesso."
          : "Acesso do funcionario criado com sucesso.",
      );
    });
  }

  async function changeEmployeeStatus(employee: AuthUser) {
    await runAction(async () => {
      await apiPatch<ApiResult<AuthUser>>(`/users/${employee.id}/status`, {
        active: !employee.active,
      });
      setSelectedEmployee(undefined);
      setMessage(
        employee.active
          ? "Acesso do funcionario inativado."
          : "Acesso do funcionario ativado.",
      );
    });
  }

  async function runAction(action: () => Promise<void>) {
    setState("loading");
    setMessage("");

    try {
      await action();
      await loadAdministration();
    } catch (error) {
      setMessage(readErrorMessage(error));
      setState("error");
    }
  }

  return {
    branches,
    changeEmployeeStatus,
    clearSelectedEmployee: () => setSelectedEmployee(undefined),
    createBranch,
    message,
    saveEmployee,
    selectedEmployee,
    selectEmployee: setSelectedEmployee,
    setMessage,
    state,
    users,
  };
}

function readErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Nao foi possivel concluir a operacao.";
}
