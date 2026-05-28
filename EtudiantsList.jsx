import { useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import api from '../../services/api'

const niveaux = ['L1','L2','L3','M1','M2']
const empty = { nom:'', prenom:'', email:'', mot_de_passe:'', numero_etudiant:'', date_naissance:'', filiere:'', niveau:'L1', annee_inscription: new Date().getFullYear() }

export default function EtudiantsList() {
  const [etudiants, setEtudiants] = useState([])
  const [loading, setLoading]     = useState(true)
  const [search, setSearch]       = useState('')
  const [form, setForm]           = useState(empty)
  const [editId, setEditId]       = useState(null)
  const [error, setError]         = useState('')
  const [success, setSuccess]     = useState('')
  const [modalOpen, setModalOpen] = useState(false)

  const load = () => {
    setLoading(true)
    api.get('/etudiants/index.php')
      .then(res => setEtudiants(res.data.etudiants || []))
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const openCreate = () => { setForm(empty); setEditId(null); setError(''); setModalOpen(true) }
  const openEdit   = (e) => {
    setForm({
      nom: e.nom, prenom: e.prenom, email: e.email, mot_de_passe: '',
      numero_etudiant: e.numero_etudiant, date_naissance: e.date_naissance || '',
      filiere: e.filiere || '', niveau: e.niveau || 'L1',
      annee_inscription: e.annee_inscription || new Date().getFullYear()
    })
    setEditId(e.id_etudiant)
    setError('')
    setModalOpen(true)
  }

  const handleSubmit = async (ev) => {
    ev.preventDefault()
    setError('')
    try {
      if (editId) {
        await api.put('/etudiants/index.php', { ...form, id_etudiant: editId })
        setSuccess('Étudiant modifié avec succès.')
      } else {
        await api.post('/etudiants/index.php', form)
        setSuccess('Étudiant créé avec succès.')
      }
      setModalOpen(false)
      load()
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la sauvegarde.')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Supprimer cet étudiant ?')) return
    try {
      await api.delete('/etudiants/index.php', { data: { id_etudiant: id } })
      setSuccess('Étudiant supprimé.')
      load()
    } catch (err) {
      setError(err.response?.data?.message || 'Erreur lors de la suppression.')
    }
  }

  const filtered = etudiants.filter(e =>
    `${e.nom} ${e.prenom} ${e.email} ${e.numero_etudiant}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Layout title="Gestion des étudiants">
      {success && <div className="alert alert-success alert-dismissible py-2" onClick={() => setSuccess('')}>{success}<button className="btn-close"></button></div>}
      {error   && <div className="alert alert-danger  alert-dismissible py-2" onClick={() => setError('')}>{error}<button className="btn-close"></button></div>}

      <div className="card shadow-sm border-0">
        <div className="card-header bg-white d-flex justify-content-between align-items-center py-3">
          <div className="d-flex align-items-center gap-3">
            <h6 className="mb-0 fw-bold"><i className="bi bi-people-fill me-2 text-primary"></i>Étudiants ({filtered.length})</h6>
            <input
              type="text" className="form-control form-control-sm" style={{ width: 220 }}
              placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)}
            />
          </div>
          <button className="btn btn-primary btn-sm" onClick={openCreate}>
            <i className="bi bi-plus-lg me-1"></i>Ajouter un étudiant
          </button>
        </div>

        <div className="card-body p-0">
          {loading
            ? <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
            : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>N° étudiant</th><th>Nom</th><th>Prénom</th>
                      <th>Email</th><th>Filière</th><th>Niveau</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0
                      ? <tr><td colSpan="7" className="text-center text-muted py-4">Aucun étudiant trouvé.</td></tr>
                      : filtered.map(e => (
                        <tr key={e.id_etudiant}>
                          <td><code>{e.numero_etudiant}</code></td>
                          <td className="fw-semibold">{e.nom}</td>
                          <td>{e.prenom}</td>
                          <td className="text-muted small">{e.email}</td>
                          <td>{e.filiere || '—'}</td>
                          <td><span className="badge bg-primary">{e.niveau}</span></td>
                          <td>
                            <button className="btn btn-outline-primary btn-action me-1" onClick={() => openEdit(e)}>
                              <i className="bi bi-pencil"></i>
                            </button>
                            <button className="btn btn-outline-danger btn-action" onClick={() => handleDelete(e.id_etudiant)}>
                              <i className="bi bi-trash"></i>
                            </button>
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

      {/* Modal créer/modifier */}
      {modalOpen && (
        <div className="modal d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{editId ? 'Modifier' : 'Ajouter'} un étudiant</h5>
                <button className="btn-close" onClick={() => setModalOpen(false)}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  {error && <div className="alert alert-danger py-2 small">{error}</div>}
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">Nom *</label>
                      <input className="form-control" value={form.nom} onChange={e => setForm({...form, nom: e.target.value})} required />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Prénom *</label>
                      <input className="form-control" value={form.prenom} onChange={e => setForm({...form, prenom: e.target.value})} required />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Email *</label>
                      <input type="email" className="form-control" value={form.email} onChange={e => setForm({...form, email: e.target.value})} required />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">{editId ? 'Nouveau mot de passe (laisser vide = inchangé)' : 'Mot de passe *'}</label>
                      <input type="password" className="form-control" value={form.mot_de_passe} onChange={e => setForm({...form, mot_de_passe: e.target.value})} required={!editId} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">N° étudiant *</label>
                      <input className="form-control" value={form.numero_etudiant} onChange={e => setForm({...form, numero_etudiant: e.target.value})} required />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Niveau *</label>
                      <select className="form-select" value={form.niveau} onChange={e => setForm({...form, niveau: e.target.value})}>
                        {niveaux.map(n => <option key={n}>{n}</option>)}
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Année d'inscription</label>
                      <input type="number" className="form-control" value={form.annee_inscription} onChange={e => setForm({...form, annee_inscription: e.target.value})} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Filière</label>
                      <input className="form-control" value={form.filiere} onChange={e => setForm({...form, filiere: e.target.value})} placeholder="ex: Informatique" />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Date de naissance</label>
                      <input type="date" className="form-control" value={form.date_naissance} onChange={e => setForm({...form, date_naissance: e.target.value})} />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Annuler</button>
                  <button type="submit" className="btn btn-primary">
                    <i className="bi bi-check-lg me-1"></i>{editId ? 'Enregistrer' : 'Créer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
