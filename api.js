import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,         // pour envoyer les cookies de session PHP
  headers: { 'Content-Type': 'application/json' }
})

// Intercepteur : redirige vers /login si 401
// SAUF pour me.php (vérification de session au chargement)
api.interceptors.response.use(
  res => res,
  err => {
    const url = err.config?.url || ''
    if (err.response?.status === 401 && !url.includes('/auth/me.php')) {
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api
