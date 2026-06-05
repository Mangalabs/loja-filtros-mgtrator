import { useAuth } from './auth/AuthContext'
import { AuthGate } from './auth/AuthGate'

export function App() {
  const { loading, login, logout, requiresSetup, setup, user } = useAuth()

  return (
    <AuthGate
      loading={loading}
      requiresSetup={requiresSetup}
      user={user}
      onLogin={login}
      onLogout={() => void logout()}
      onSetup={setup}
    />
  )
}
