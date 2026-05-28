import { useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'

export default function Inscriptions() {
  const { user } = useAuth()
  const isAdmin  = user?.role === 'admin'
  const isEtudiant = user?.role === 'etudiant'

  const [inscriptions, setInscriptions] = useState([])
  const [coursDispos, setCoursDispos]   = useState([])
  const [etudiants, setEtudiants]       = useState([])
  const [loading, setLoading]           = useState(true)
  const [error, setError]               = useState('')
  const [success, setSuccess]           = useState('')
  const [selectedCours, setSelectedCours]     = useState('')
  const [selectedEtudiant, setSelectedEtudiant] = useState('')
  const [search, setSearch]             = useState('')

  const load = () => {
    setLoading(true)
    const calls = [api.get('/inscriptions/index.php')]
    if (!isEtudiant) calls.push(api.get('/cours/index.php'))
    if (isAdmin)     calls.push(api.get('/etudiants/index.php'))

    Promise.all(calls).then(results => {
      setInscriptions(results[0].data.inscriptions || [])
      if (results[1]) setCoursDispos(results[1].data.cours || [])
      if (results[2]) setEtudiants(results[2].data.etudiants || [])
    }).finally(() => setLoading(false))
  }

  useEffect(load, [])

  // Étudiant : s'inscrire à un cours
  const handleInscription = async (id_cours) => {
    setError(''); setSuccess('')
    try {
      await api.post('/inscriptions/index.php', { id_cours })
      setSuccess('Inscription réussie !')
      load()
    } catch (err) { setError(err.response?.data?.message || 'Erreur lors de l\'inscription.') }
  }

  // Admin : inscrire un étudiant à un cours
  const handleAdminInscription = async (e) => {
    e.preventDefault(); setError(''); setSuccess('')
    if (!selectedCours || !selectedEtudiant) { setError('Sélectionnez un étudiant et un cours.'); return }
    try {
      await api.post('/inscriptions/index.php', { id_cours: selectedCours, id_etudiant: selectedEtudiant })
      setSuccess('Inscription créée.')
      setSelectedCours(''); setSelectedEtudiant('')
      load()
    } catch (err) { setError(err.response?.data?.message || 'Erreur.') }
  }

  const handleDesinscription = async (id_inscription) => {
    if (!window.confirm('Supprimer cette inscription ?')) return
    try {
      await api.delete('/inscriptions/index.php', { data: { id_inscription } })
      setSuccess('Inscription supprimée.'); load()
    } catch (err) { setError(err.response?.data?.message || 'Erreur.') }
  }

  const filtered = inscriptions.filter(i =>
    `${i.cours_nom} ${i.etudiant_nom} ${i.etudiant_prenom}`.toLowerCase().includes(search.toLowerCase())
  )

  // Cours auxquels l'étudiant n'est pas encore inscrit
  const coursNonInscrits = coursDispos.filter(c =>
    !inscriptions.some(i => i.id_cours === c.id_cours)
  )

  return (
    <Layout title={isEtudiant ? "S'inscrire à des cours" : "Gestion des inscriptions"}>
      {success && <div className="alert alert-success alert-dismissible py-2">{success}<button className="btn-close" onClick={() => setSuccess('')}></button></div>}
      {error   && <div className="alert alert-danger  alert-dismissible py-2">{error}<button className="btn-close" onClick={() => setError('')}></button></div>}

      {/* ── Vue Étudiant : catalogue des cours disponibles ── */}
      {isEtudiant && (
        <div className="card shadow-sm border-0 mb-4">
          <div className="card-header bg-white fw-bold py-3">
            <i className="bi bi-plus-circle-fill me-2 text-success"></i>Cours disponibles
          </div>
          <div className="card-body p-0">
            <table className="table table-hover align-middle mb-0">
              <thead className="table-light">
                <tr><th>Code</th><th>Cours</th><th>Niveau</th><th>Enseignant</th><th>Places</th><th>Action</th></tr>
              </thead>
              <tbody>
                {coursNonInscrits.length === 0
                  ? <tr><td colSpan="6" className="text-center text-muted py-3">Vous êtes inscrit à tous les cours disponibles.</td></tr>
                  : coursNonInscrits.map(c => (
                    <tr key={c.id_cours}>
                      <td><code>{c.code_cours}</code></td>
                      <td className="fw-semibold">{c.nom}</td>
                      <td><span className="badge bg-primary">{c.niveau}</span></td>
                      <td className="small">{c.enseignant_prenom} {c.enseignant_nom}</td>
                      <td>
                        <span className={`badge ${c.nb_inscrits >= c.capacite_max ? 'bg-danger' : 'bg-success'}`}>
                          {c.nb_inscrits}/{c.capacite_max}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn btn-success btn-sm"
                          disabled={c.nb_inscrits >= c.capacite_max}
                          onClick={() => handleInscription(c.id_cours)}
                        >
                          {c.nb_inscrits >= c.capacite_max ? 'Complet' : <><i className="bi bi-plus-lg me-1"></i>S'inscrire</>}
                        </button>
                      </td>
                    </tr>
                  ))
                }
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Vue Admin : formulaire d'inscription manuelle ── */}
      {isAdmin && (
        <div className="card shadow-sm border-0 mb-4">
          <div className="card-header bg-white fw-bold py-3">
            <i className="bi bi-journal-plus me-2 text-primary"></i>Inscrire un étudiant manuellement
          </div>
          <div className="card-body">
            <form onSubmit={handleAdminInscription} className="row g-3 align-items-end">
              <div className="col-md-5">
                <label className="form-label">Étudiant</label>
                <select className="form-select" value={selectedEtudiant} onChange={e => setSelectedEtudiant(e.target.value)}>
                  <option value="">— Choisir un étudiant —</option>
                  {etudiants.map(e => <option key={e.id_etudiant} value={e.id_etudiant}>{e.prenom} {e.nom} ({e.numero_etudiant})</option>)}
                </select>
              </div>
              <div className="col-md-5">
                <label className="form-label">Cours</label>
                <select className="form-select" value={selectedCours} onChange={e => setSelectedCours(e.target.value)}>
                  <option value="">— Choisir un cours —</option>
                  {coursDispos.map(c => <option key={c.id_cours} value={c.id_cours}>{c.code_cours} – {c.nom} ({c.nb_inscrits}/{c.capacite_max})</option>)}
                </select>
              </div>
              <div className="col-md-2">
                <button type="submit" className="btn btn-primary w-100"><i className="bi bi-plus-lg me-1"></i>Inscrire</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Liste des inscriptions ── */}
      <div className="card shadow-sm border-0">
        <div className="card-header bg-white d-flex justify-content-between align-items-center py-3">
          <h6 className="mb-0 fw-bold"><i className="bi bi-list-check me-2"></i>
            {isEtudiant ? 'Mes inscriptions' : 'Toutes les inscriptions'} ({filtered.length})
          </h6>
          <input type="text" className="form-control form-control-sm" style={{ width: 220 }}
            placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="card-body p-0">
          {loading
            ? <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
            : (
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    {!isEtudiant && <th>Étudiant</th>}
                    <th>Cours</th><th>Date d'inscription</th><th>Statut</th><th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0
                    ? <tr><td colSpan="5" className="text-center text-muted py-4">Aucune inscription.</td></tr>
                    : filtered.map(i => (
                      <tr key={i.id_inscription}>
                        {!isEtudiant && <td className="fw-semibold small">{i.etudiant_prenom} {i.etudiant_nom}</td>}
                        <td>
                          <span className="fw-semibold">{i.cours_nom}</span>
                          <br /><code className="small text-muted">{i.cours_code}</code>
                        </td>
                        <td className="small text-muted">{new Date(i.date_inscription).toLocaleDateString('fr-FR')}</td>
                        <td>
                          <span className={`badge ${
                            i.statut === 'inscrit' ? 'bg-primary' :
                            i.statut === 'valide'  ? 'bg-success' :
                            i.statut === 'echec'   ? 'bg-danger'  : 'bg-secondary'
                          }`}>{i.statut}</span>
                        </td>
                        <td>
                          <button className="btn btn-outline-danger btn-action" onClick={() => handleDesinscription(i.id_inscription)}>
                            <i className="bi bi-x-circle"></i>
                          </button>
                        </td>
                      </tr>
                    ))
                  }
                </tbody>
              </table>
            )
          }
        </div>
      </div>
    </Layout>
  )
}
