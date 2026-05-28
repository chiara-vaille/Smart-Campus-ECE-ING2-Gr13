import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const menus = {
  admin: [
    { to: '/dashboard',     icon: 'bi-speedometer2',   label: 'Tableau de bord' },
    { to: '/etudiants',     icon: 'bi-people-fill',    label: 'Étudiants' },
    { to: '/enseignants',   icon: 'bi-person-badge',   label: 'Enseignants' },
    { to: '/cours',         icon: 'bi-book-fill',      label: 'Cours' },
    { to: '/inscriptions',  icon: 'bi-journal-plus',   label: 'Inscriptions' },
    { to: '/notes',         icon: 'bi-clipboard2-data',label: 'Notes' },
    { to: '/emploidutemps', icon: 'bi-calendar3',      label: 'Emploi du temps' },
  ],
  enseignant: [
    { to: '/dashboard',     icon: 'bi-speedometer2',   label: 'Tableau de bord' },
    { to: '/cours',         icon: 'bi-book-fill',      label: 'Mes cours' },
    { to: '/notes',         icon: 'bi-clipboard2-data',label: 'Saisir les notes' },
    { to: '/emploidutemps', icon: 'bi-calendar3',      label: 'Emploi du temps' },
  ],
  etudiant: [
    { to: '/dashboard',     icon: 'bi-speedometer2',   label: 'Tableau de bord' },
    { to: '/cours',         icon: 'bi-book-fill',      label: 'Mes cours' },
    { to: '/inscriptions',  icon: 'bi-journal-plus',   label: 'M\'inscrire' },
    { to: '/notes',         icon: 'bi-clipboard2-data',label: 'Mes notes' },
    { to: '/emploidutemps', icon: 'bi-calendar3',      label: 'Emploi du temps' },
  ]
}

const roleLabel = { admin: 'Administrateur', enseignant: 'Enseignant', etudiant: 'Étudiant' }

export default function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const items = menus[user?.role] || []

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="sidebar d-flex flex-column">
      {/* Brand */}
      <div className="brand">
        <h5><i className="bi bi-mortarboard-fill me-2 text-warning"></i>SmartCampus</h5>
        <small>Gestion académique</small>
      </div>

      {/* User info */}
      <div className="px-3 py-3 border-bottom border-white border-opacity-10">
        <div className="d-flex align-items-center gap-2">
          <div className="rounded-circle bg-warning d-flex align-items-center justify-content-center"
               style={{ width: 36, height: 36, fontSize: '1rem' }}>
            <i className="bi bi-person-fill text-dark"></i>
          </div>
          <div>
            <div className="text-white fw-semibold" style={{ fontSize: '0.85rem' }}>
              {user?.prenom} {user?.nom}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.6)' }}>
              {roleLabel[user?.role]}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-grow-1 py-2">
        {items.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
          >
            <i className={`bi ${item.icon}`}></i>
            {item.label}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-3 border-top border-white border-opacity-10">
        <button onClick={handleLogout} className="btn btn-sm btn-outline-light w-100">
          <i className="bi bi-box-arrow-left me-2"></i>Déconnexion
        </button>
      </div>
    </div>
  )
}
