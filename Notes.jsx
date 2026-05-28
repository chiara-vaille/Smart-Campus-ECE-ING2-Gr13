import { useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'

export default function Notes() {
  const { user } = useAuth()
  const isEnseignant = user?.role === 'enseignant'
  const isEtudiant   = user?.role === 'etudiant'
  const isAdmin      = user?.role === 'admin'

  const [cours, setCours]           = useState([])
  const [selectedCours, setSelectedCours] = useState('')
  const [evals, setEvals]           = useState([])
  const [notes, setNotes]           = useState([])
  const [etudiants, setEtudiants]   = useState([])
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const [success, setSuccess]       = useState('')

  // Pour la gestion des types d'évaluation
  const [newEvalNom, setNewEvalNom]   = useState('')
  const [newEvalCoef, setNewEvalCoef] = useState(1.0)
  const [showEvalForm, setShowEvalForm] = useState(false)

  // Charger les cours accessibles
  useEffect(() => {
    api.get('/cours/index.php').then(res => setCours(res.data.cours || []))
  }, [])

  // Charger notes + évals quand un cours est sélectionné
  useEffect(() => {
    if (!selectedCours) { setEvals([]); setNotes([]); setEtudiants([]); return }
    setLoading(true)
    Promise.all([
      api.get(`/notes/index.php?id_cours=${selectedCours}`),
      (isEnseignant || isAdmin) ? api.get(`/inscriptions/index.php?id_cours=${selectedCours}`) : Promise.resolve({ data: { inscriptions: [] } })
    ]).then(([nRes, iRes]) => {
      setEvals(nRes.data.evaluations || [])
      setNotes(nRes.data.notes || [])
      // Construire la liste des étudiants inscrits
      if (isEnseignant || isAdmin) {
        setEtudiants(iRes.data.inscriptions || [])
      }
    }).finally(() => setLoading(false))
  }, [selectedCours])

  const getNote = (id_etudiant, id_type_eval) => {
    return notes.find(n => n.id_etudiant === id_etudiant && n.id_type_eval === id_type_eval)
  }

  const handleSaveNote = async (id_etudiant, id_type_eval, valeur) => {
    if (valeur === '' || valeur === null) return
    const v = parseFloat(valeur)
    if (isNaN(v) || v < 0 || v > 20) { setError('La note doit être entre 0 et 20.'); return }
    const existing = getNote(id_etudiant, id_type_eval)
    if (existing?.verrouille) { setError('Cette note est verrouillée.'); return }
    try {
      await api.post('/notes/index.php', { id_etudiant, id_type_eval, valeur: v, id_cours: selectedCours })
      setSuccess('Note enregistrée.')
      // Rafraîchir les notes
      api.get(`/notes/index.php?id_cours=${selectedCours}`).then(r => { setNotes(r.data.notes||[]); setEvals(r.data.evaluations||[]) })
    } catch (err) { setError(err.response?.data?.message || 'Erreur.') }
  }

  const handleVerrouiller = async (id_cours) => {
    if (!window.confirm('Verrouiller toutes les notes de ce cours ? Cette action est irréversible.')) return
    try {
      await api.post('/notes/verrouiller.php', { id_cours })
      setSuccess('Notes verrouillées.')
      api.get(`/notes/index.php?id_cours=${selectedCours}`).then(r => { setNotes(r.data.notes||[]); setEvals(r.data.evaluations||[]) })
    } catch (err) { setError(err.response?.data?.message || 'Erreur.') }
  }

  const handleAddEval = async (e) => {
    e.preventDefault(); setError('')
    if (!newEvalNom) { setError('Nom de l\'évaluation requis.'); return }
    try {
      await api.post('/notes/evaluations.php', { id_cours: selectedCours, nom: newEvalNom, coefficient: newEvalCoef })
      setSuccess('Type d\'évaluation ajouté.')
      setNewEvalNom(''); setNewEvalCoef(1.0); setShowEvalForm(false)
      api.get(`/notes/index.php?id_cours=${selectedCours}`).then(r => { setNotes(r.data.notes||[]); setEvals(r.data.evaluations||[]) })
    } catch (err) { setError(err.response?.data?.message || 'Erreur.') }
  }

  // Calcul de la moyenne pondérée
  const calcMoyenne = (id_etudiant) => {
    let total = 0, coefTotal = 0
    evals.forEach(ev => {
      const n = getNote(id_etudiant, ev.id_type_eval)
      if (n) { total += n.valeur * ev.coefficient; coefTotal += ev.coefficient }
    })
    return coefTotal > 0 ? (total / coefTotal).toFixed(2) : '—'
  }

  const coursActuel = cours.find(c => c.id_cours == selectedCours)

  return (
    <Layout title={isEtudiant ? 'Mes notes' : 'Gestion des notes'}>
      {success && <div className="alert alert-success alert-dismissible py-2">{success}<button className="btn-close" onClick={() => setSuccess('')}></button></div>}
      {error   && <div className="alert alert-danger  alert-dismissible py-2">{error}<button className="btn-close" onClick={() => setError('')}></button></div>}

      {/* Sélecteur de cours */}
      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body">
          <div className="row align-items-end g-3">
            <div className="col-md-6">
              <label className="form-label fw-semibold">Sélectionner un cours</label>
              <select className="form-select" value={selectedCours} onChange={e => setSelectedCours(e.target.value)}>
                <option value="">— Choisir un cours —</option>
                {cours.map(c => <option key={c.id_cours} value={c.id_cours}>{c.code_cours} – {c.nom}</option>)}
              </select>
            </div>
            {(isEnseignant || isAdmin) && selectedCours && (
              <div className="col-auto">
                <button className="btn btn-outline-danger btn-sm" onClick={() => handleVerrouiller(selectedCours)}>
                  <i className="bi bi-lock-fill me-1"></i>Verrouiller les notes
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedCours && loading && <div className="text-center py-4"><div className="spinner-border text-primary"></div></div>}

      {selectedCours && !loading && (
        <>
          {/* Types d'évaluation */}
          <div className="card shadow-sm border-0 mb-4">
            <div className="card-header bg-white d-flex justify-content-between align-items-center py-3">
              <h6 className="mb-0 fw-bold"><i className="bi bi-list-stars me-2 text-warning"></i>Évaluations — {coursActuel?.nom}</h6>
              {(isEnseignant || isAdmin) && (
                <button className="btn btn-outline-warning btn-sm" onClick={() => setShowEvalForm(!showEvalForm)}>
                  <i className="bi bi-plus-lg me-1"></i>Ajouter une évaluation
                </button>
              )}
            </div>
            {showEvalForm && (isEnseignant || isAdmin) && (
              <div className="card-body border-bottom bg-light">
                <form onSubmit={handleAddEval} className="row g-3 align-items-end">
                  <div className="col-md-5">
                    <label className="form-label small">Nom de l'évaluation</label>
                    <input className="form-control form-control-sm" placeholder="ex: Contrôle continu 1" value={newEvalNom} onChange={e => setNewEvalNom(e.target.value)} />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label small">Coefficient (ex: 0.4 = 40%)</label>
                    <input type="number" className="form-control form-control-sm" step="0.1" min="0" max="1" value={newEvalCoef} onChange={e => setNewEvalCoef(e.target.value)} />
                  </div>
                  <div className="col-auto">
                    <button type="submit" className="btn btn-warning btn-sm text-dark">Ajouter</button>
                  </div>
                </form>
              </div>
            )}
            <div className="card-body p-0">
              {evals.length === 0
                ? <p className="text-muted small p-3">Aucune évaluation définie pour ce cours.</p>
                : (
                  <div className="table-responsive">
                    <table className="table table-sm align-middle mb-0">
                      <thead className="table-light">
                        <tr>
                          {!isEtudiant && <th>Étudiant</th>}
                          {evals.map(ev => (
                            <th key={ev.id_type_eval} className="text-center">
                              {ev.nom}
                              <br /><small className="text-muted">({(ev.coefficient * 100).toFixed(0)}%)</small>
                              {(ev.notes_verrouillee) && <i className="bi bi-lock-fill text-danger ms-1 small"></i>}
                            </th>
                          ))}
                          <th className="text-center">Moyenne</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* Vue enseignant/admin : tableau de saisie */}
                        {(isEnseignant || isAdmin) && etudiants.map(et => (
                          <tr key={et.id_etudiant}>
                            <td className="fw-semibold small">{et.etudiant_prenom} {et.etudiant_nom}</td>
                            {evals.map(ev => {
                              const n = getNote(et.id_etudiant, ev.id_type_eval)
                              return (
                                <td key={ev.id_type_eval} className="text-center" style={{ minWidth: 80 }}>
                                  {n?.verrouille
                                    ? <span className="badge bg-secondary">{n.valeur}/20 <i className="bi bi-lock-fill"></i></span>
                                    : (
                                      <input
                                        type="number" min="0" max="20" step="0.5"
                                        className="form-control form-control-sm text-center"
                                        style={{ width: 70, margin: 'auto' }}
                                        defaultValue={n?.valeur ?? ''}
                                        onBlur={e => handleSaveNote(et.id_etudiant, ev.id_type_eval, e.target.value)}
                                      />
                                    )
                                  }
                                </td>
                              )
                            })}
                            <td className="text-center fw-bold">
                              <span className={`badge ${calcMoyenne(et.id_etudiant) >= 10 ? 'bg-success' : calcMoyenne(et.id_etudiant) === '—' ? 'bg-secondary' : 'bg-danger'}`}>
                                {calcMoyenne(et.id_etudiant)}{calcMoyenne(et.id_etudiant) !== '—' && '/20'}
                              </span>
                            </td>
                          </tr>
                        ))}

                        {/* Vue étudiant : ses propres notes */}
                        {isEtudiant && (
                          <tr>
                            <td className="fw-semibold small">Mes notes</td>
                            {evals.map(ev => {
                              const n = notes.find(n => n.id_type_eval === ev.id_type_eval)
                              return (
                                <td key={ev.id_type_eval} className="text-center">
                                  {n
                                    ? <span className={`badge ${n.valeur >= 10 ? 'bg-success' : 'bg-danger'}`}>{n.valeur}/20</span>
                                    : <span className="text-muted small">—</span>
                                  }
                                </td>
                              )
                            })}
                            <td className="text-center fw-bold">
                              {notes.length > 0
                                ? <span className={`badge ${calcMoyenne(user.id_etudiant) >= 10 ? 'bg-success' : 'bg-danger'}`}>{calcMoyenne(user.id_etudiant)}/20</span>
                                : '—'
                              }
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                )
              }
            </div>
          </div>
        </>
      )}
    </Layout>
  )
}
