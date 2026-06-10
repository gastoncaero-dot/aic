import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/auth-context'

export function ProtectedRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <div className="py-20 text-center text-slate-500">Cargando...</div>
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <Outlet />
}

export function AdminRoute() {
  const { profile, loading } = useAuth()

  if (loading) {
    return <div className="py-20 text-center text-slate-500">Cargando...</div>
  }

  if (!profile?.is_admin) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
