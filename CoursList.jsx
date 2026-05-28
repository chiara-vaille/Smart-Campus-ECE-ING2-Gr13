import { useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import { useAuth } from '../../context/AuthContext'
import api from '../../services/api'

const niveaux   = ['L1','L2','L3','M1','M2']
const semestres = ['S1','S2','S3','S4','S5','S6','S7','S8','S9','S10']
const empty = { code_cours:'', nom:'', description:'', credits:3, coefficient:1.0, capacite_max:30, semestre:'S1', niveau:'L1', departement:'', id_enseignant:'', annee_academique:'2025-2026' }

export default function CoursList() {
  const { user } = useAuth()
  const isAdmin  = user?.role === 'admin'

  const [cours, setCours]           = useState([])
  const [enseignants, setEnseignants] = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [filtreNiveau, setFiltreNiveau] = useState('')
  const [form, setForm]             = useState(empty)
  const [editId, setEditId]         = useState(null)
  const [error, setError]           = useState('')
  const [success, setSuccess]       = useState('')
  const [modalOpen, setModalOpen]   = useState(false)

  const load = () => {
    setLoading(true)
    Promise.all([
      api.get('/cours/index.php'),
      isAdmin ? api.get('/enseignants/index.php') : Promise.resolve({ data: { enseignants: [] } })
    ])
    .then(([cRes, eRes]) => {
      setCours(cRes.data.cours || [])
      setEnseignants(eRes.data.enseignants || [])
    })
    .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const openCreate = () => { setForm(empty); setEditId(null); setError(''); setModalOpen(true) }
  const openEdit   = (c) => {
    setForm({ code_cours: c.code_cours, nom: c.nom, description: c.description || '',
              credits: c.credits, coefficient: c.coefficient, capacite_max: c.capacite_max,
              semestre: c.semestre, niveau: c.niveau, departement: c.departement || '',
              id_enseignant: c.id_enseignant || '', annee_academique: c.annee_academique })
    setEditId(c.id_cours); setError(''); setModalOpen(true)
  }

  const handleSubmit = async (ev) => {
    ev.preventDefault(); setError('')
    try {
      if (editId) await api.put('/cours/index.php', { ...form, id_cours: editId })
      else        await api.post('/cours/index.php', form)
      setSuccess(editId ? 'Cours modifié.' : 'Cours créé.')
      setModalOpen(false); load()
    } catch (err) { setError(err.response?.data?.message || 'Erreur.') }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer ce cours ?')) return
    try {
      await api.delete('/cours/index.php', { data: { id_cours: id } })
      setSuccess('Cours supprimé.'); load()
    } catch (err) { setError(err.response?.data?.message || 'Erreur.') }
  }

  const filtered = cours.filter(c => {
    const matchSearch = `${c.code_cours} ${c.nom} ${c.departement}`.toLowerCase().includes(search.toLowerCase())
    const matchNiveau = !filtreNiveau || c.niveau === filtreNiveau
    return matchSearch && matchNiveau
  })

  const title = user?.role === 'etudiant' ? 'Mes cours' : user?.role === 'enseignant' ? 'Mes cours' : 'Gestion des cours'

  return (
    <Layout title={title}>
      {success && <div className="alert alert-success alert-dismissible py-2">{success}<button className="btn-close" onClick={() => setSuccess('')}></button></div>}
      {error   && <div className="alert alert-danger  alert-dismissible py-2">{error}<button className="btn-close" onClick={() => setError('')}></button></div>}

      <div className="card shadow-sm border-0">
        <div className="card-header bg-white py-3">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <h6 className="mb-0 fw-bold"><i className="bi bi-book-fill me-2 text-warning"></i>Cours ({filtered.length})</h6>
              <input type="text" className="form-control form-control-sm" style={{ width: 200 }}
                placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)} />
              <select className="form-select form-select-sm" style={{ width: 100 }} value={filtreNiveau} onChange={e => setFiltreNiveau(e.target.value)}>
                <option value="">Tous</option>
                {niveaux.map(n => <option key={n}>{n}</option>)}
              </select>
            </div>
            {isAdmin && (
              <button className="btn btn-warning btn-sm text-dark fw-semibold" onClick={openCreate}>
                <i className="bi bi-plus-lg me-1"></i>Nouveau cours
              </button>
            )}
          </div>
        </div>

        <div className="card-body p-0">
          {loading
            ? <div className="text-center py-5"><div className="spinner-border text-warning"></div></div>
            : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr><th>Code</th><th>Nom</th><th>Niveau</th><th>Semestre</th><th>Crédits</th><th>Coeff.</th><th>Capacité</th><th>Enseignant</th>{isAdmin && <th>Actions</th>}</tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0
                      ? <tr><td colSpan="9" className="text-center text-muted py-4">Aucun cours trouvé.</td></tr>
                      : filtered.map(c => (
                        <tr key={c.id_cours}>
                          <td><code className="text-warning">{c.code_cours}</code></td>
                          <td className="fw-semibold">{c.nom}</td>
                          <td><span className="badge bg-primary">{c.niveau}</span></td>
                          <td><span className="badge bg-secondary">{c.semestre}</span></td>
                          <td>{c.credits}</td>
                          <td>{c.coefficient}</td>
                          <td>
                            <span className={`badge ${c.nb_inscrits >= c.capacite_max ? 'bg-danger' : 'bg-success'}`}>
                              {c.nb_inscrits}/{c.capacite_max}
                            </span>
                          </td>
                          <td className="small">{c.enseignant_nom ? `${c.enseignant_prenom} ${c.enseignant_nom}` : '—'}</td>
                          {isAdmin && (
                            <td>
                              <button className="btn btn-outline-primary btn-action me-1" onClick={() => openEdit(c)}><i className="bi bi-pencil"></i></button>
                              <button className="btn btn-outline-danger  btn-action" onClick={() => handleDelete(c.id_cours)}><i className="bi bi-trash"></i></button>
                            </td>
                          )}
                        </tr>
                      ))
                    }
                  </tbody>
                </table>
              </div>
            )
          }
        </div>
      </div>

      {modalOpen && isAdmin && (
        <div className="modal d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{editId ? 'Modifier' : 'Créer'} un cours</h5>
                <button className="btn-close" onClick={() => setModalOpen(false)}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  {error && <div className="alert alert-danger py-2 small">{error}</div>}
                  <div className="row g-3">
                    <div className="col-md-4"><label className="form-label">Code cours *</label>
                      <input className="form-control" value={form.code_cours} onChange={e => setForm({...form, code_cours: e.target.value})} placeholder="INFO101" required /></div>
                    <div className="col-md-8"><label className="form-label">Nom du cours *</label>
                      <input className="form-control" value={form.nom} onChange={e => setForm({...form, nom: e.target.value})} required /></div>
                    <div className="col-12"><label className="form-label">Description</label>
                      <textarea className="form-control" rows="2" value={form.description} onChange={e => setForm({...form, description: e.target.value})}></textarea></div>
                    <div className="col-md-3"><label className="form-label">Niveau</label>
                      <select className="form-select" value={form.niveau} onChange={e => setForm({...form, niveau: e.target.value})}>
                        {niveaux.map(n => <option key={n}>{n}</option>)}
                      </select></div>
                    <div className="col-md-3"><label className="form-label">Semestre</label>
                      <select className="form-select" value={form.semestre} onChange={e => setForm({...form, semestre: e.target.value})}>
                        {semestres.map(s => <option key={s}>{s}</option>)}
                      </select></div>
                    <div className="col-md-2"><label className="form-label">Crédits</label>
                      <input type="number" className="form-control" min="0" value={form.credits} onChange={e => setForm({...form, credits: e.target.value})} /></div>
                    <div className="col-md-2"><label className="form-label">Coefficient</label>
                      <input type="number" className="form-control" step="0.1" min="0" value={form.coefficient} onChange={e => setForm({...form, coefficient: e.target.value})} /></div>
                    <div className="col-md-2"><label className="form-label">Capacité max</label>
                      <input type="number" className="form-control" min="1" value={form.capacite_max} onChange={e => setForm({...form, capacite_max: e.target.value})} /></div>
                    <div className="col-md-6"><label className="form-label">Département</label>
                      <input className="form-control" value={form.departement} onChange={e => setForm({...form, departement: e.target.value})} /></div>
                    <div className="col-md-6"><label className="form-label">Enseignant responsable</label>
                      <select className="form-select" value={form.id_enseignant} onChange={e => setForm({...form, id_enseignant: e.target.value})}>
                        <option value="">— Aucun —</option>
                        {enseignants.map(e => <option key={e.id_enseignant} value={e.id_enseignant}>{e.prenom} {e.nom}</option>)}
                      </select></div>
                    <div className="col-md-4"><label className="form-label">Année académique</label>
                      <input className="form-control" value={form.annee_academique} onChange={e => setForm({...form, annee_academique: e.target.value})} placeholder="2025-2026" /></div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Annuler</button>
                  <button type="submit" className="btn btn-warning text-dark fw-semibold"><i className="bi bi-check-lg me-1"></i>{editId ? 'Enregistrer' : 'Créer'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
