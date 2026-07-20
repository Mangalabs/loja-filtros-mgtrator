import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  apiGet,
  apiPatch,
  apiPost,
  apiPut,
  type ApiResult,
  type AuthEvent,
  type AuthEventPage,
  type AuthUser,
  type Branch,
} from "../../api";

type AdministrationState = "loading" | "ready" | "error";
type AuthEventFilters = {
  email: string;
  eventType: string;
  dateFrom: string;
  dateTo: string;
};

export function useAdministrationData() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [authEvents, setAuthEvents] = useState<AuthEvent[]>([]);
  const [authEventFilters, setAuthEventFilters] = useState<AuthEventFilters>({
    email: "",
    eventType: "",
    dateFrom: "",
    dateTo: "",
  });
  const [authEventPage, setAuthEventPage] = useState(0);
  const [authEventRowsPerPage, setAuthEventRowsPerPage] = useState(15);
  const [authEventTotal, setAuthEventTotal] = useState(0);
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<AuthUser>();
  const [selectedPasswordResetEmployee, setSelectedPasswordResetEmployee] =
    useState<AuthUser>();
  const [state, setState] = useState<AdministrationState>("loading");
  const [message, setMessage] = useState("");

  const loadAdministration = useCallback(async () => {
    setState("loading");

    try {
      const [branchesResult, usersResult, authEventsResult] =
        await Promise.all([
          apiGet<ApiResult<Branch[]>>("/branches"),
          apiGet<ApiResult<AuthUser[]>>("/users"),
          apiGet<ApiResult<AuthEventPage>>(
            `/auth-events?${buildAuthEventSearchParams(
              authEventFilters,
              authEventPage,
              authEventRowsPerPage,
            )}`,
          ),
        ]);

      setBranches(branchesResult.data);
      setUsers(usersResult.data);
      setAuthEvents(authEventsResult.data.items);
      setAuthEventTotal(authEventsResult.data.pagination.total);
      setState("ready");
    } catch (error) {
      setMessage(readErrorMessage(error));
      setState("error");
    }
  }, [authEventFilters, authEventPage, authEventRowsPerPage]);

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
      permissions: data.getAll("permissions"),
      password: data.get("password"),
    };
    const saveRequest = selectedEmployee
      ? () =>
          apiPut<ApiResult<AuthUser>>(`/users/${selectedEmployee.id}`, input)
      : () => apiPost<ApiResult<AuthUser>>("/users", input);

    await runAction(async () => {
      await saveRequest();
      form.reset();
      setSelectedEmployee(undefined);
      setSelectedPasswordResetEmployee(undefined);
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
      setSelectedPasswordResetEmployee(undefined);
      setMessage(
        employee.active
          ? "Acesso do funcionario inativado."
          : "Acesso do funcionario ativado.",
      );
    });
  }

  async function resetEmployeePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedPasswordResetEmployee) {
      return;
    }

    const form = event.currentTarget;
    const data = new FormData(form);

    await runAction(async () => {
      await apiPost<ApiResult<AuthUser>>(
        `/users/${selectedPasswordResetEmployee.id}/password-reset`,
        {
          password: data.get("password"),
        },
      );
      form.reset();
      setSelectedPasswordResetEmployee(undefined);
      setMessage(
        "Senha redefinida. O funcionario devera trocar a senha no proximo acesso.",
      );
    });
  }

  function applyAuthEventFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    setAuthEventPage(0);
    setAuthEventFilters({
      email: String(form.get("email") ?? "").trim(),
      eventType: String(form.get("eventType") ?? ""),
      dateFrom: String(form.get("dateFrom") ?? ""),
      dateTo: String(form.get("dateTo") ?? ""),
    });
  }

  function clearAuthEventFilters() {
    setAuthEventPage(0);
    setAuthEventFilters({
      email: "",
      eventType: "",
      dateFrom: "",
      dateTo: "",
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
    authEvents,
    authEventFilters,
    authEventsPagination: {
      count: authEventTotal,
      page: authEventPage,
      rowsPerPage: authEventRowsPerPage,
      onPageChange: setAuthEventPage,
      onRowsPerPageChange: (rowsPerPage: number) => {
        setAuthEventRowsPerPage(rowsPerPage);
        setAuthEventPage(0);
      },
    },
    applyAuthEventFilters,
    branches,
    changeEmployeeStatus,
    clearAuthEventFilters,
    clearSelectedEmployee: () => setSelectedEmployee(undefined),
    clearSelectedPasswordResetEmployee: () =>
      setSelectedPasswordResetEmployee(undefined),
    createBranch,
    message,
    resetEmployeePassword,
    saveEmployee,
    selectedEmployee,
    selectedPasswordResetEmployee,
    selectEmployee: setSelectedEmployee,
    selectPasswordResetEmployee: setSelectedPasswordResetEmployee,
    setMessage,
    state,
    users,
  };
}

function buildAuthEventSearchParams(
  filters: AuthEventFilters,
  page: number,
  rowsPerPage: number,
) {
  const params = new URLSearchParams({
    page: String(page + 1),
    limit: String(rowsPerPage),
  });

  Object.entries(filters).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });

  return params.toString();
}

function readErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Nao foi possivel concluir a operacao.";
}
