import { useEffect, useState } from 'react'
import Layout from '../components/Layout'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

function StatCard({ icon, label, value, color }) {
  return (
    <div className="col-sm-6 col-xl-3">
      <div className="card stat-card shadow-sm h-100">
        <div className="card-body d-flex align-items-center gap-3">
          <div className={`icon-box bg-${color} bg-opacity-10`}>
            <i className={`bi ${icon} text-${color}`}></i>
          </div>
          <div>
            <div className="fw-bold fs-4">{value ?? '—'}</div>
            <div className="text-muted small">{label}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Dashboard Admin ───────────────────────────────────────────
function AdminDashboard({ stats }) {
  return (
    <>
      <div className="row g-3 mb-4">
        <StatCard icon="bi-people-fill"    label="Étudiants"    value={stats?.etudiants}    color="primary" />
        <StatCard icon="bi-person-badge"   label="Enseignants"  value={stats?.enseignants}  color="success" />
        <StatCard icon="bi-book-fill"      label="Cours actifs" value={stats?.cours}        color="warning" />
        <StatCard icon="bi-journal-check"  label="Inscriptions" value={stats?.inscriptions} color="info" />
      </div>
      <div className="row g-3">
        <div className="col-md-6">
          <div className="card shadow-sm border-0">
            <div className="card-header bg-white fw-semibold">
              <i className="bi bi-activity me-2 text-danger"></i>Activité récente
            </div>
            <div className="card-body">
              {stats?.activite?.length > 0 ? (
                <ul className="list-group list-group-flush">
                  {stats.activite.map((a, i) => (
                    <li key={i} className="list-group-item px-0 d-flex justify-content-between align-items-center">
                      <span className="small">{a.description}</span>
                      <span className="text-muted" style={{ fontSize: '0.75rem' }}>{a.date}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-muted small">Aucune activité récente.</p>}
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card shadow-sm border-0">
            <div className="card-header bg-white fw-semibold">
              <i className="bi bi-bar-chart-fill me-2 text-primary"></i>Répartition par niveau
            </div>
            <div className="card-body">
              {stats?.niveaux?.map(n => (
                <div key={n.niveau} className="mb-2">
                  <div className="d-flex justify-content-between small mb-1">
                    <span>{n.niveau}</span><span>{n.count} étudiant(s)</span>
                  </div>
                  <div className="progress" style={{ height: 6 }}>
                    <div className="progress-bar"
                         style={{ width: `${Math.min(100, (n.count / (stats.etudiants||1)) * 100)}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Dashboard Enseignant ─────────────────────────────────────
function EnseignantDashboard({ stats }) {
  return (
    <>
      <div className="row g-3 mb-4">
        <StatCard icon="bi-book-fill"      label="Mes cours"       value={stats?.cours}        color="primary" />
        <StatCard icon="bi-people-fill"    label="Étudiants suivis" value={stats?.etudiants}   color="success" />
        <StatCard icon="bi-clipboard2-x"   label="Notes à saisir"  value={stats?.notes_manquantes} color="warning" />
        <StatCard icon="bi-calendar-check" label="Séances cette semaine" value={stats?.seances} color="info" />
      </div>
      <div className="row g-3">
        <div className="col-12">
          <div className="card shadow-sm border-0">
            <div className="card-header bg-white fw-semibold">
              <i className="bi bi-book-fill me-2 text-primary"></i>Mes cours
            </div>
            <div className="card-body p-0">
              <table className="table table-hover mb-0">
                <thead className="table-light"><tr>
                  <th>Code</th><th>Cours</th><th>Niveau</th><th>Inscrits</th><th>Statut</th>
                </tr></thead>
                <tbody>
                  {stats?.liste_cours?.map(c => (
                    <tr key={c.id_cours}>
                      <td><code>{c.code_cours}</code></td>
                      <td>{c.nom}</td>
                      <td><span className="badge bg-secondary">{c.niveau}</span></td>
                      <td>{c.nb_inscrits}</td>
                      <td><span className={`badge bg-${c.statut === 'actif' ? 'success' : 'secondary'}`}>{c.statut}</span></td>
                    </tr>
                  ))}
                  {!stats?.liste_cours?.length && (
                    <tr><td colSpan="5" className="text-center text-muted py-3">Aucun cours assigné.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Dashboard Étudiant ───────────────────────────────────────
function EtudiantDashboard({ stats }) {
  return (
    <>
      <div className="row g-3 mb-4">
        <StatCard icon="bi-book-fill"      label="Cours suivis"   value={stats?.cours}    color="primary" />
        <StatCard icon="bi-award-fill"     label="Moyenne générale" value={stats?.moyenne != null ? `${stats.moyenne}/20` : '—'} color="success" />
        <StatCard icon="bi-calendar-x"     label="Absences"       value={stats?.absences} color="danger" />
        <StatCard icon="bi-check-circle"   label="Crédits validés" value={stats?.credits}  color="info" />
      </div>
      <div className="row g-3">
        <div className="col-md-7">
          <div className="card shadow-sm border-0">
            <div className="card-header bg-white fw-semibold">
              <i className="bi bi-clipboard2-data me-2 text-primary"></i>Mes notes récentes
            </div>
            <div className="card-body p-0">
              <table className="table table-hover mb-0">
                <thead className="table-light"><tr>
                  <th>Cours</th><th>Évaluation</th><th>Note</th>
                </tr></thead>
                <tbody>
                  {stats?.notes?.map((n, i) => (
                    <tr key={i}>
                      <td className="small">{n.cours}</td>
                      <td className="small text-muted">{n.type_eval}</td>
                      <td>
                        <span className={`badge ${n.valeur >= 10 ? 'bg-success' : 'bg-danger'}`}>
                          {n.valeur}/20
                        </span>
                      </td>
                    </tr>
                  ))}
                  {!stats?.notes?.length && (
                    <tr><td colSpan="3" className="text-center text-muted py-3">Aucune note disponible.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div className="col-md-5">
          <div className="card shadow-sm border-0">
            <div className="card-header bg-white fw-semibold">
              <i className="bi bi-calendar3 me-2 text-success"></i>Prochaines séances
            </div>
            <ul className="list-group list-group-flush">
              {stats?.prochaines_seances?.map((s, i) => (
                <li key={i} className="list-group-item">
                  <div className="fw-semibold small">{s.cours}</div>
                  <div className="text-muted" style={{ fontSize: '0.78rem' }}>
                    {s.jour} {s.heure_debut}–{s.heure_fin} · Salle {s.salle}
                  </div>
                </li>
              ))}
              {!stats?.prochaines_seances?.length && (
                <li className="list-group-item text-muted small">Aucune séance prochaine.</li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </>
  )
}

// ── Page principale Dashboard 
export default function Dashboard() {
  const { user } = useAuth()
  const [stats, setStats]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/dashboard/index.php')
      .then(res => setStats(res.data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const titleMap = {
    admin:      'Tableau de bord — Administration',
    enseignant: 'Tableau de bord — Enseignant',
    etudiant:   'Tableau de bord — Étudiant',
  }

  return (
    <Layout title={titleMap[user?.role]}>
      {loading
        ? <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
        : user?.role === 'admin'      ? <AdminDashboard stats={stats} />
        : user?.role === 'enseignant' ? <EnseignantDashboard stats={stats} />
        :                               <EtudiantDashboard stats={stats} />
      }
    </Layout>
  )
}
