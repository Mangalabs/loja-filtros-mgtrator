import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";
import { apiGet, apiPost, type ApiResult, type AuthUser } from "../api";

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
  loading: boolean;
  requiresSetup: boolean;
  login: (credentials: Credentials) => Promise<void>;
  setup: (input: SetupInput) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser>();
  const [loading, setLoading] = useState(true);
  const [requiresSetup, setRequiresSetup] = useState(false);

  useEffect(() => {
    void restoreSession();
  }, []);

  async function restoreSession() {
    try {
      const session = await apiGet<ApiResult<AuthUser>>("/auth/session");
      setUser(session.data);
      setRequiresSetup(false);
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
  }

  async function setup(input: SetupInput) {
    const session = await apiPost<ApiResult<AuthUser>>("/auth/setup", input);
    setUser(session.data);
    setRequiresSetup(false);
  }

  async function logout() {
    await apiPost<ApiResult<null>>("/auth/logout", {});
    setUser(undefined);
    setRequiresSetup(false);
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, requiresSetup, login, setup, logout }}
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
