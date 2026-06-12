import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { AdminRoute, ProtectedRoute } from './components/ProtectedRoute'
import Layout from './components/Layout'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Rules from './pages/Rules'
import Predictions from './pages/Predictions'
import SpecialPredictions from './pages/SpecialPredictions'
import Dashboard from './pages/Dashboard'
import LeagueDetail from './pages/LeagueDetail'
import Profile from './pages/Profile'
import Admin from './pages/Admin'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Landing />} />
            <Route path="reglas" element={<Rules />} />
            <Route path="login" element={<Login />} />
            <Route path="signup" element={<Signup />} />

            <Route element={<ProtectedRoute />}>
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="predictions" element={<Predictions />} />
              <Route path="predictions/especiales" element={<SpecialPredictions />} />
              <Route path="leagues/:id" element={<LeagueDetail />} />
              <Route path="perfil" element={<Profile />} />
            </Route>

            <Route element={<AdminRoute />}>
              <Route path="admin" element={<Admin />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
