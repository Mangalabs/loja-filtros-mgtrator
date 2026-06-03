import { useAuth } from "./auth/AuthContext";
import { LoginPage } from "./auth/LoginPage";
import { AuthenticatedApp } from "./components/AuthenticatedApp";

// Entrada da aplicacao: decide entre autenticacao/setup e area autenticada.
export function App() {
  const { loading, login, logout, requiresSetup, setup, user } = useAuth();

  if (loading) {
    return <div className="auth-loading">Validando sessao...</div>;
  }

  if (!user) {
    return <LoginPage requiresSetup={requiresSetup} onLogin={login} onSetup={setup} />;
  }

  return <AuthenticatedApp user={user} onLogout={() => void logout()} />;
}
