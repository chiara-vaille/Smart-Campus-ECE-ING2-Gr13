import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'

import Login           from './pages/Login'
import Dashboard       from './pages/Dashboard'
import EtudiantsList   from './pages/etudiants/EtudiantsList'
import EnseignantsList from './pages/enseignants/EnseignantsList'
import CoursList       from './pages/cours/CoursList'
import Inscriptions    from './pages/inscriptions/Inscriptions'
import Notes           from './pages/notes/Notes'
import EmploiDuTemps   from './pages/emploidutemps/EmploiDuTemps'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Protégées — tous les utilisateurs connectés */}
          <Route path="/dashboard" element={
            <ProtectedRoute><Dashboard /></ProtectedRoute>
          } />
          <Route path="/cours" element={
            <ProtectedRoute><CoursList /></ProtectedRoute>
          } />
          <Route path="/notes" element={
            <ProtectedRoute><Notes /></ProtectedRoute>
          } />
          <Route path="/emploidutemps" element={
            <ProtectedRoute><EmploiDuTemps /></ProtectedRoute>
          } />
          <Route path="/inscriptions" element={
            <ProtectedRoute><Inscriptions /></ProtectedRoute>
          } />

          {/* Admin seulement */}
          <Route path="/etudiants" element={
            <ProtectedRoute roles={['admin']}><EtudiantsList /></ProtectedRoute>
          } />
          <Route path="/enseignants" element={
            <ProtectedRoute roles={['admin']}><EnseignantsList /></ProtectedRoute>
          } />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
