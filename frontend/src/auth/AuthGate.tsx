import type { ReactNode } from "react";
import type { AuthUser } from "../api";
import { AuthenticatedApp } from "../components/AuthenticatedApp";
import { LoginPage } from "./LoginPage";
import { PasswordChangePage } from "./PasswordChangePage";

type AuthGateState =
  | "anonymous"
  | "authenticated"
  | "change-password"
  | "loading";

type LoginInput = {
  email: string;
  password: string;
};

type SetupInput = LoginInput & {
  name: string;
  phone?: string | null;
};

type AuthGateProps = {
  loading: boolean;
  requiresSetup: boolean;
  user?: AuthUser;
  onChangePassword: (input: {
    currentPassword: string;
    newPassword: string;
  }) => Promise<void>;
  onLogin: (credentials: LoginInput) => Promise<void>;
  onLogout: () => void;
  onSetup: (input: SetupInput) => Promise<void>;
};

type AuthStateStrategy = {
  matches: (props: AuthGateProps) => boolean;
  state: AuthGateState;
};

const authStateStrategies: AuthStateStrategy[] = [
  {
    matches: ({ loading }) => loading,
    state: "loading",
  },
  {
    matches: ({ user }) => Boolean(user?.mustChangePassword),
    state: "change-password",
  },
  {
    matches: ({ user }) => Boolean(user),
    state: "authenticated",
  },
  {
    matches: () => true,
    state: "anonymous",
  },
];

const authStateRenderers: Record<
  AuthGateState,
  (props: AuthGateProps) => ReactNode
> = {
  anonymous: ({ onLogin, onSetup, requiresSetup }) => (
    <LoginPage
      requiresSetup={requiresSetup}
      onLogin={onLogin}
      onSetup={onSetup}
    />
  ),
  authenticated: ({ onLogout, user }) => (
    <AuthenticatedApp user={user!} onLogout={onLogout} />
  ),
  "change-password": ({ onChangePassword, onLogout }) => (
    <PasswordChangePage
      onChangePassword={onChangePassword}
      onLogout={onLogout}
    />
  ),
  loading: () => (
    <div className="flex min-h-screen items-center justify-center text-[#5f665f]">
      Validando sessao...
    </div>
  ),
};

export function AuthGate(props: AuthGateProps) {
  const authState = resolveAuthState(props);
  return authStateRenderers[authState](props);
}

function resolveAuthState(props: AuthGateProps) {
  return (
    authStateStrategies.find((strategy) => strategy.matches(props))?.state ??
    "anonymous"
  );
}
