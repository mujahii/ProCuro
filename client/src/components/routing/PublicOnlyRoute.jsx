import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function PublicOnlyRoute({ children }) {
  const { user, authUser, role, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-lionsmane">
        <div className="w-10 h-10 border-4 border-herb border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  // Has auth session but no profile yet → needs to pick role
  if (authUser && !user) return <Navigate to="/select-role" replace />

  // Fully logged in → go to their dashboard
  if (user) {
    if (role === 'admin') return <Navigate to="/admin/dashboard" replace />
    if (role === 'supplier') return <Navigate to="/supplier/dashboard" replace />
    return <Navigate to="/owner/store" replace />
  }

  return children
}
