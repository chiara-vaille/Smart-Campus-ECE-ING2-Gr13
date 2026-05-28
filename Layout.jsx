import Sidebar from './Sidebar'
import { useAuth } from '../context/AuthContext'

const roleLabel = { admin: 'Administrateur', enseignant: 'Enseignant', etudiant: 'Étudiant' }
const roleBadge = { admin: 'danger', enseignant: 'success', etudiant: 'primary' }

export default function Layout({ children, title }) {
  const { user } = useAuth()

  return (
    <div className="d-flex">
      <Sidebar />
      <div className="main-content flex-grow-1">
        {/* Topbar */}
        <div className="topbar d-flex justify-content-between align-items-center">
          <h6 className="mb-0 fw-bold text-dark">{title}</h6>
          <div className="d-flex align-items-center gap-3">
            <span className={`badge bg-${roleBadge[user?.role]}`}>
              {roleLabel[user?.role]}
            </span>
            <span className="text-muted small">{user?.prenom} {user?.nom}</span>
          </div>
        </div>
        {/* Content */}
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>
  )
}
