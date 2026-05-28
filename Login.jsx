import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const { login } = useAuth()
  const navigate  = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/dashboard')
    } catch (err) {
      setError(err.response?.data?.message || 'Email ou mot de passe incorrect.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center"
         style={{ background: 'linear-gradient(135deg, #1a3a5c 0%, #2d6a9f 100%)' }}>
      <div className="card shadow-lg border-0" style={{ width: '100%', maxWidth: 420 }}>
        <div className="card-body p-5">
          {/* Logo */}
          <div className="text-center mb-4">
            <div className="d-inline-flex align-items-center justify-content-center rounded-circle bg-primary mb-3"
                 style={{ width: 64, height: 64 }}>
              <i className="bi bi-mortarboard-fill text-white" style={{ fontSize: '1.8rem' }}></i>
            </div>
            <h4 className="fw-bold text-dark mb-0">SmartCampus</h4>
            <p className="text-muted small mb-0">Gestion académique</p>
          </div>

          {error && (
            <div className="alert alert-danger alert-dismissible py-2" role="alert">
              <i className="bi bi-exclamation-circle me-2"></i>{error}
              <button type="button" className="btn-close" onClick={() => setError('')}></button>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label fw-semibold">Adresse email</label>
              <div className="input-group">
                <span className="input-group-text"><i className="bi bi-envelope"></i></span>
                <input
                  type="email"
                  className="form-control"
                  placeholder="prenom.nom@smartcampus.fr"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="form-label fw-semibold">Mot de passe</label>
              <div className="input-group">
                <span className="input-group-text"><i className="bi bi-lock"></i></span>
                <input
                  type="password"
                  className="form-control"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" className="btn btn-primary w-100 py-2 fw-semibold" disabled={loading}>
              {loading
                ? <><span className="spinner-border spinner-border-sm me-2"></span>Connexion…</>
                : <><i className="bi bi-box-arrow-in-right me-2"></i>Se connecter</>
              }
            </button>
          </form>

          {/* Comptes de test */}
          <hr className="my-4" />
          <p className="text-muted small text-center mb-2 fw-semibold">Comptes de test</p>
          <div className="d-flex gap-2 justify-content-center flex-wrap">
            {[
              { label: 'Admin',      email: 'admin@smartcampus.fr',      pass: 'admin123' },
              { label: 'Enseignant', email: 'prof@smartcampus.fr',       pass: 'prof123' },
              { label: 'Étudiant',   email: 'etudiant@smartcampus.fr',   pass: 'etudiant123' },
            ].map(c => (
              <button key={c.label}
                className="btn btn-outline-secondary btn-sm"
                onClick={() => { setEmail(c.email); setPassword(c.pass) }}>
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
