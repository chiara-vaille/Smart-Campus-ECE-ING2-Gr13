import { createContext, useContext, useState, useEffect } from 'react'
import api from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  // Pour vérifier la session au chargement, utilisation de useEffect en dep, l'effet ne s'execute qu'une suele fois au montage 
  useEffect(() => {
    api.get('/auth/me.php') //recup de l'utilisateur connecté 
      .then(res => setUser(res.data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false))
  }, [])

  const login = async (email, password) => {
    const res = await api.post('/auth/login.php', { email, password })
    setUser(res.data.user)
    return res.data.user
  }

  const logout = async () => {
    await api.post('/auth/logout.php')
    setUser(null)
  }
//fonction login et logout
  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}> 
      {children}
    </AuthContext.Provider>
  )
}
//valeur partagé à toute l'appli 
export const useAuth = () => useContext(AuthContext)
