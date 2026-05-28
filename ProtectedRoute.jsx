import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// roles = tableau des rôles autorisés, ex: ['admin'] ou ['admin','enseignant']
export default function ProtectedRoute({ children, roles = [] }) {
  const { user, loading } = useAuth()

  if (loading) return (
    <div className="d-flex justify-content-center align-items-center" style={{ height: '100vh' }}>
      <div className="spinner-border text-primary" role="status" />
    </div>
  )

  if (!user) return <Navigate to="/login" replace />

  if (roles.length > 0 && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}
