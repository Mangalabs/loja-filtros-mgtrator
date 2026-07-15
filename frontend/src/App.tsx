import { useAuth } from './auth/AuthContext'
import { AuthGate } from './auth/AuthGate'

export function App() {
  const {
    changePassword,
    loading,
    login,
    logout,
    requiresSetup,
    setup,
    user,
  } = useAuth()

  return (
    <AuthGate
      loading={loading}
      requiresSetup={requiresSetup}
      user={user}
      onChangePassword={changePassword}
      onLogin={login}
      onLogout={() => void logout()}
      onSetup={setup}
    />
  )
}
