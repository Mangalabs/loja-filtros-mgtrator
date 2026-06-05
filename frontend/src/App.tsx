import { useAuth } from "./auth/AuthContext";
import { AuthGate } from "./auth/AuthGate";

// Entrada da aplicacao: decide entre autenticacao/setup e area autenticada.
export function App() {
  const { loading, login, logout, requiresSetup, setup, user } = useAuth();

  return (
    <AuthGate
      loading={loading}
      requiresSetup={requiresSetup}
      user={user}
      onLogin={login}
      onLogout={() => void logout()}
      onSetup={setup}
    />
  );
}
