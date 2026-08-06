import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  apiGet,
  apiPost,
  setUnauthorizedHandler,
  type ApiResult,
  type AuthUser,
} from "../api";

type Credentials = {
  email: string;
  password: string;
};

type SetupInput = Credentials & {
  name: string;
  phone?: string | null;
};

type AuthContextValue = {
  user?: AuthUser;
  authNotice: string;
  loading: boolean;
  requiresSetup: boolean;
  changePassword: (input: {
    currentPassword: string;
    newPassword: string;
  }) => Promise<void>;
  clearAuthNotice: () => void;
  login: (credentials: Credentials) => Promise<void>;
  setup: (input: SetupInput) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser>();
  const [authNotice, setAuthNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [requiresSetup, setRequiresSetup] = useState(false);

  useEffect(() => {
    void restoreSession();
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(handleProtectedUnauthorized);
    return () => setUnauthorizedHandler(undefined);
  }, []);

  function handleProtectedUnauthorized() {
    setUser(undefined);
    setRequiresSetup(false);
    setAuthNotice("Sessão expirada. Entre novamente para continuar.");
  }

  async function restoreSession() {
    try {
      const session = await apiGet<ApiResult<AuthUser>>("/auth/session");
      setUser(session.data);
      setRequiresSetup(false);
      setAuthNotice("");
    } catch {
      try {
        const setupStatus =
          await apiGet<ApiResult<{ requiresSetup: boolean }>>("/auth/setup");
        setRequiresSetup(setupStatus.data.requiresSetup);
      } catch {
        setRequiresSetup(false);
      } finally {
        setUser(undefined);
      }
    } finally {
      setLoading(false);
    }
  }

  async function login(credentials: Credentials) {
    const session = await apiPost<ApiResult<AuthUser>>(
      "/auth/login",
      credentials,
    );
    setUser(session.data);
    setRequiresSetup(false);
    setAuthNotice("");
  }

  async function setup(input: SetupInput) {
    const session = await apiPost<ApiResult<AuthUser>>("/auth/setup", input);
    setUser(session.data);
    setRequiresSetup(false);
    setAuthNotice("");
  }

  async function changePassword(input: {
    currentPassword: string;
    newPassword: string;
  }) {
    const session = await apiPost<ApiResult<AuthUser>>(
      "/auth/password",
      input,
    );
    setUser(session.data);
    setRequiresSetup(false);
    setAuthNotice("");
  }

  async function logout() {
    await apiPost<ApiResult<null>>("/auth/logout", {});
    setUser(undefined);
    setRequiresSetup(false);
    setAuthNotice("");
  }

  function clearAuthNotice() {
    setAuthNotice("");
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        authNotice,
        loading,
        requiresSetup,
        changePassword,
        clearAuthNotice,
        login,
        setup,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
