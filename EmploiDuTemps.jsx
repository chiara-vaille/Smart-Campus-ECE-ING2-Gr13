import { useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'

const JOURS = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi']
const HORAIRES = ['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00']
const typeColors = { CM: 'cm', TD: 'td', TP: 'tp' }

const emptySeance = { id_cours:'', jour_semaine:'Lundi', heure_debut:'08:00', heure_fin:'10:00', salle:'', type_seance:'CM', date_debut:'', date_fin:'' }

export default function EmploiDuTemps() {
  const { user }  = useAuth()
  const isAdmin   = user?.role === 'admin'
  const [seances, setSeances]   = useState([])
  const [cours, setCours]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')
  const [form, setForm]         = useState(emptySeance)
  const [editId, setEditId]     = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [vue, setVue]           = useState('semaine') // 'semaine' | 'liste'

  const load = () => {
    setLoading(true)
    Promise.all([
      api.get('/seances/index.php'),
      api.get('/cours/index.php')
    ]).then(([sRes, cRes]) => {
      setSeances(sRes.data.seances || [])
      setCours(cRes.data.cours || [])
    }).finally(() => setLoading(false))
  }

  useEffect(load, [])

  const openCreate = () => { setForm(emptySeance); setEditId(null); setError(''); setModalOpen(true) }
  const openEdit   = (s) => {
    setForm({ id_cours: s.id_cours, jour_semaine: s.jour_semaine, heure_debut: s.heure_debut.slice(0,5),
              heure_fin: s.heure_fin.slice(0,5), salle: s.salle || '', type_seance: s.type_seance,
              date_debut: s.date_debut || '', date_fin: s.date_fin || '' })
    setEditId(s.id_seance); setError(''); setModalOpen(true)
  }

  const handleSubmit = async (ev) => {
    ev.preventDefault(); setError('')
    if (form.heure_fin <= form.heure_debut) { setError('L\'heure de fin doit être après l\'heure de début.'); return }
    try {
      if (editId) await api.put('/seances/index.php', { ...form, id_seance: editId })
      else        await api.post('/seances/index.php', form)
      setSuccess(editId ? 'Séance modifiée.' : 'Séance créée.')
      setModalOpen(false); load()
    } catch (err) { setError(err.response?.data?.message || 'Erreur — conflit d\'emploi du temps possible.') }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cette séance ?')) return
    try { await api.delete('/seances/index.php', { data: { id_seance: id } }); setSuccess('Séance supprimée.'); load() }
    catch (err) { setError(err.response?.data?.message || 'Erreur.') }
  }

  // Construire la grille de l'emploi du temps
  const getSeancesFor = (jour, heure) => {
    return seances.filter(s => s.jour_semaine === jour && s.heure_debut.slice(0,5) === heure)
  }

  const getCours = (id) => cours.find(c => c.id_cours == id)

  return (
    <Layout title="Emploi du temps">
      {success && <div className="alert alert-success alert-dismissible py-2">{success}<button className="btn-close" onClick={() => setSuccess('')}></button></div>}
      {error   && <div className="alert alert-danger  alert-dismissible py-2">{error}<button className="btn-close" onClick={() => setError('')}></button></div>}

      {/* Contrôles */}
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <div className="btn-group">
          <button className={`btn btn-sm ${vue === 'semaine' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setVue('semaine')}>
            <i className="bi bi-calendar-week me-1"></i>Vue semaine
          </button>
          <button className={`btn btn-sm ${vue === 'liste' ? 'btn-primary' : 'btn-outline-primary'}`} onClick={() => setVue('liste')}>
            <i className="bi bi-list-ul me-1"></i>Vue liste
          </button>
        </div>
        {isAdmin && (
          <button className="btn btn-primary btn-sm" onClick={openCreate}>
            <i className="bi bi-plus-lg me-1"></i>Ajouter une séance
          </button>
        )}
      </div>

      {/* Légende */}
      <div className="d-flex gap-3 mb-3 small">
        <span><span className="badge bg-primary me-1">CM</span>Cours magistral</span>
        <span><span className="badge bg-success me-1">TD</span>Travaux dirigés</span>
        <span><span className="badge bg-warning text-dark me-1">TP</span>Travaux pratiques</span>
      </div>

      {loading
        ? <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
        : vue === 'semaine'
          ? (
            /* ── Vue semaine ── */
            <div className="card shadow-sm border-0">
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-bordered edt-table mb-0" style={{ minWidth: 700 }}>
                    <thead>
                      <tr>
                        <th style={{ width: 70 }}>Heure</th>
                        {JOURS.map(j => <th key={j}>{j}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {HORAIRES.map(heure => (
                        <tr key={heure} style={{ height: 60 }}>
                          <td className="text-center text-muted small align-middle">{heure}</td>
                          {JOURS.map(jour => {
                            const cells = getSeancesFor(jour, heure)
                            return (
                              <td key={jour} className="align-top p-1">
                                {cells.map(s => {
                                  const c = getCours(s.id_cours)
                                  return (
                                    <div key={s.id_seance} className={`edt-cell ${typeColors[s.type_seance] || ''}`}>
                                      <div className="fw-semibold">{c?.code_cours || '?'}</div>
                                      <div className="text-truncate small">{c?.nom || '—'}</div>
                                      <div className="text-muted" style={{ fontSize: '0.7rem' }}>
                                        {s.heure_debut.slice(0,5)}–{s.heure_fin.slice(0,5)} · {s.salle || 'N/A'}
                                        <span className="ms-1 badge bg-opacity-75 bg-dark">{s.type_seance}</span>
                                      </div>
                                      {isAdmin && (
                                        <div className="d-flex gap-1 mt-1">
                                          <button className="btn btn-xs btn-outline-secondary p-0 px-1" style={{ fontSize: '0.7rem' }} onClick={() => openEdit(s)}>✏</button>
                                          <button className="btn btn-xs btn-outline-danger   p-0 px-1" style={{ fontSize: '0.7rem' }} onClick={() => handleDelete(s.id_seance)}>✕</button>
                                        </div>
                                      )}
                                    </div>
                                  )
                                })}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )
          : (
            /* ── Vue liste ── */
            <div className="card shadow-sm border-0">
              <div className="card-body p-0">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr><th>Cours</th><th>Jour</th><th>Horaires</th><th>Salle</th><th>Type</th>{isAdmin && <th>Actions</th>}</tr>
                  </thead>
                  <tbody>
                    {seances.length === 0
                      ? <tr><td colSpan="6" className="text-center text-muted py-4">Aucune séance programmée.</td></tr>
                      : seances.map(s => {
                        const c = getCours(s.id_cours)
                        return (
                          <tr key={s.id_seance}>
                            <td>
                              <span className="fw-semibold">{c?.nom || '—'}</span>
                              <br /><code className="small text-muted">{c?.code_cours}</code>
                            </td>
                            <td>{s.jour_semaine}</td>
                            <td className="small">{s.heure_debut.slice(0,5)} → {s.heure_fin.slice(0,5)}</td>
                            <td>{s.salle || '—'}</td>
                            <td>
                              <span className={`badge ${s.type_seance === 'CM' ? 'bg-primary' : s.type_seance === 'TD' ? 'bg-success' : 'bg-warning text-dark'}`}>
                                {s.type_seance}
                              </span>
                            </td>
                            {isAdmin && (
                              <td>
                                <button className="btn btn-outline-primary btn-action me-1" onClick={() => openEdit(s)}><i className="bi bi-pencil"></i></button>
                                <button className="btn btn-outline-danger  btn-action" onClick={() => handleDelete(s.id_seance)}><i className="bi bi-trash"></i></button>
                              </td>
                            )}
                          </tr>
                        )
                      })
                    }
                  </tbody>
                </table>
              </div>
            </div>
          )
      }

      {/* Modal séance */}
      {modalOpen && isAdmin && (
        <div className="modal d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{editId ? 'Modifier' : 'Ajouter'} une séance</h5>
                <button className="btn-close" onClick={() => setModalOpen(false)}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  {error && <div className="alert alert-danger py-2 small">{error}</div>}
                  <div className="row g-3">
                    <div className="col-12"><label className="form-label">Cours *</label>
                      <select className="form-select" value={form.id_cours} onChange={e => setForm({...form, id_cours: e.target.value})} required>
                        <option value="">— Choisir un cours —</option>
                        {cours.map(c => <option key={c.id_cours} value={c.id_cours}>{c.code_cours} – {c.nom}</option>)}
                      </select></div>
                    <div className="col-md-6"><label className="form-label">Jour</label>
                      <select className="form-select" value={form.jour_semaine} onChange={e => setForm({...form, jour_semaine: e.target.value})}>
                        {JOURS.concat(['Samedi']).map(j => <option key={j}>{j}</option>)}
                      </select></div>
                    <div className="col-md-6"><label className="form-label">Type</label>
                      <select className="form-select" value={form.type_seance} onChange={e => setForm({...form, type_seance: e.target.value})}>
                        <option value="CM">CM – Cours magistral</option>
                        <option value="TD">TD – Travaux dirigés</option>
                        <option value="TP">TP – Travaux pratiques</option>
                      </select></div>
                    <div className="col-md-6"><label className="form-label">Heure début</label>
                      <input type="time" className="form-control" value={form.heure_debut} onChange={e => setForm({...form, heure_debut: e.target.value})} required /></div>
                    <div className="col-md-6"><label className="form-label">Heure fin</label>
                      <input type="time" className="form-control" value={form.heure_fin} onChange={e => setForm({...form, heure_fin: e.target.value})} required /></div>
                    <div className="col-md-6"><label className="form-label">Salle</label>
                      <input className="form-control" value={form.salle} onChange={e => setForm({...form, salle: e.target.value})} placeholder="ex: B204" /></div>
                    <div className="col-md-3"><label className="form-label">Date début</label>
                      <input type="date" className="form-control" value={form.date_debut} onChange={e => setForm({...form, date_debut: e.target.value})} /></div>
                    <div className="col-md-3"><label className="form-label">Date fin</label>
                      <input type="date" className="form-control" value={form.date_fin} onChange={e => setForm({...form, date_fin: e.target.value})} /></div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Annuler</button>
                  <button type="submit" className="btn btn-primary"><i className="bi bi-check-lg me-1"></i>{editId ? 'Enregistrer' : 'Créer'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
