import { useAuth } from './auth/AuthContext'
import { AuthGate } from './auth/AuthGate'

export function App() {
  const {
    authNotice,
    changePassword,
    clearAuthNotice,
    loading,
    login,
    logout,
    requiresSetup,
    setup,
    user,
  } = useAuth()

  return (
    <AuthGate
      authNotice={authNotice}
      loading={loading}
      requiresSetup={requiresSetup}
      user={user}
      onChangePassword={changePassword}
      onClearAuthNotice={clearAuthNotice}
      onLogin={login}
      onLogout={() => void logout()}
      onSetup={setup}
    />
  )
}
