import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function PublicOnlyRoute({ children }) {
  const { user, role, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (user) {
    if (role === 'admin') return <Navigate to="/admin/dashboard" replace />
    if (role === 'supplier') return <Navigate to="/supplier/dashboard" replace />
    return <Navigate to="/owner/store" replace />
  }

  return children
}
