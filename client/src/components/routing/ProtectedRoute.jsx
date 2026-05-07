import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, authUser, role, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Loading...</p>
        </div>
      </div>
    )
  }

  // No auth session at all → login
  if (!authUser) return <Navigate to="/login" replace />

  // Auth session exists but no profile row or role not yet chosen → select role
  if (!user || !role) return <Navigate to="/select-role" replace />

  // Wrong role for this area → redirect to their correct dashboard
  if (allowedRoles && !allowedRoles.includes(role)) {
    if (role === 'admin') return <Navigate to="/admin/dashboard" replace />
    if (role === 'supplier') return <Navigate to="/supplier/dashboard" replace />
    return <Navigate to="/owner/store" replace />
  }

  return children
}
