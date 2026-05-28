import { useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import api from '../../services/api'

const grades = ['Professeur','Maitre_conferences','Maitre_assistant','Vacataire']
const gradeLabel = { Professeur:'Professeur', Maitre_conferences:'Maître de conférences', Maitre_assistant:'Maître assistant', Vacataire:'Vacataire' }
const empty = { nom:'', prenom:'', email:'', mot_de_passe:'', departement:'', grade:'Professeur', telephone:'' }

export default function EnseignantsList() {
  const [enseignants, setEnseignants] = useState([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [form, setForm]               = useState(empty)
  const [editId, setEditId]           = useState(null)
  const [error, setError]             = useState('')
  const [success, setSuccess]         = useState('')
  const [modalOpen, setModalOpen]     = useState(false)

  const load = () => {
    setLoading(true)
    api.get('/enseignants/index.php')
      .then(res => setEnseignants(res.data.enseignants || []))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const openCreate = () => { setForm(empty); setEditId(null); setError(''); setModalOpen(true) }
  const openEdit   = (e) => {
    setForm({ nom: e.nom, prenom: e.prenom, email: e.email, mot_de_passe: '',
              departement: e.departement || '', grade: e.grade || 'Professeur', telephone: e.telephone || '' })
    setEditId(e.id_enseignant)
    setError('')
    setModalOpen(true)
  }

  const handleSubmit = async (ev) => {
    ev.preventDefault(); setError('')
    try {
      if (editId) await api.put('/enseignants/index.php', { ...form, id_enseignant: editId })
      else        await api.post('/enseignants/index.php', form)
      setSuccess(editId ? 'Enseignant modifié.' : 'Enseignant créé.')
      setModalOpen(false); load()
    } catch (err) { setError(err.response?.data?.message || 'Erreur.') }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cet enseignant ?')) return
    try {
      await api.delete('/enseignants/index.php', { data: { id_enseignant: id } })
      setSuccess('Enseignant supprimé.'); load()
    } catch (err) { setError(err.response?.data?.message || 'Erreur.') }
  }

  const filtered = enseignants.filter(e =>
    `${e.nom} ${e.prenom} ${e.email} ${e.departement}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Layout title="Gestion des enseignants">
      {success && <div className="alert alert-success alert-dismissible py-2">{success}<button className="btn-close" onClick={() => setSuccess('')}></button></div>}
      {error   && <div className="alert alert-danger  alert-dismissible py-2">{error}<button className="btn-close" onClick={() => setError('')}></button></div>}

      <div className="card shadow-sm border-0">
        <div className="card-header bg-white d-flex justify-content-between align-items-center py-3">
          <div className="d-flex align-items-center gap-3">
            <h6 className="mb-0 fw-bold"><i className="bi bi-person-badge me-2 text-success"></i>Enseignants ({filtered.length})</h6>
            <input type="text" className="form-control form-control-sm" style={{ width: 220 }}
              placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <button className="btn btn-success btn-sm" onClick={openCreate}>
            <i className="bi bi-plus-lg me-1"></i>Ajouter un enseignant
          </button>
        </div>

        <div className="card-body p-0">
          {loading
            ? <div className="text-center py-5"><div className="spinner-border text-success"></div></div>
            : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr><th>Nom</th><th>Prénom</th><th>Email</th><th>Département</th><th>Grade</th><th>Téléphone</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0
                      ? <tr><td colSpan="7" className="text-center text-muted py-4">Aucun enseignant trouvé.</td></tr>
                      : filtered.map(e => (
                        <tr key={e.id_enseignant}>
                          <td className="fw-semibold">{e.nom}</td>
                          <td>{e.prenom}</td>
                          <td className="text-muted small">{e.email}</td>
                          <td>{e.departement || '—'}</td>
                          <td><span className="badge bg-success">{gradeLabel[e.grade] || e.grade}</span></td>
                          <td className="small">{e.telephone || '—'}</td>
                          <td>
                            <button className="btn btn-outline-primary btn-action me-1" onClick={() => openEdit(e)}><i className="bi bi-pencil"></i></button>
                            <button className="btn btn-outline-danger  btn-action" onClick={() => handleDelete(e.id_enseignant)}><i className="bi bi-trash"></i></button>
                          </td>
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

      {modalOpen && (
        <div className="modal d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{editId ? 'Modifier' : 'Ajouter'} un enseignant</h5>
                <button className="btn-close" onClick={() => setModalOpen(false)}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  {error && <div className="alert alert-danger py-2 small">{error}</div>}
                  <div className="row g-3">
                    <div className="col-md-6"><label className="form-label">Nom *</label>
                      <input className="form-control" value={form.nom} onChange={e => setForm({...form, nom: e.target.value})} required /></div>
                    <div className="col-md-6"><label className="form-label">Prénom *</label>
                      <input className="form-control" value={form.prenom} onChange={e => setForm({...form, prenom: e.target.value})} required /></div>
                    <div className="col-md-6"><label className="form-label">Email *</label>
                      <input type="email" className="form-control" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required /></div>
                    <div className="col-md-6"><label className="form-label">{editId ? 'Nouveau mot de passe' : 'Mot de passe *'}</label>
                      <input type="password" className="form-control" value={form.mot_de_passe} onChange={e => setForm({...form, mot_de_passe: e.target.value})} required={!editId} /></div>
                    <div className="col-md-6"><label className="form-label">Département</label>
                      <input className="form-control" value={form.departement} onChange={e => setForm({...form, departement: e.target.value})} placeholder="ex: Informatique" /></div>
                    <div className="col-md-6"><label className="form-label">Grade</label>
                      <select className="form-select" value={form.grade} onChange={e => setForm({...form, grade: e.target.value})}>
                        {grades.map(g => <option key={g} value={g}>{gradeLabel[g]}</option>)}
                      </select></div>
                    <div className="col-md-6"><label className="form-label">Téléphone</label>
                      <input className="form-control" value={form.telephone} onChange={e => setForm({...form, telephone: e.target.value})} /></div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Annuler</button>
                  <button type="submit" className="btn btn-success"><i className="bi bi-check-lg me-1"></i>{editId ? 'Enregistrer' : 'Créer'}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
