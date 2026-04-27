import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/queryClient'
import { AuthProvider, useAuth } from './context/AuthContext'
import { useProfile } from './hooks/useProfile'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import LandingPage from './pages/LandingPage'
import DashboardPage from './pages/DashboardPage'
import NewSessionPage from './pages/NewSessionPage'
import SessionPage from './pages/SessionPage'
import SharePage from './pages/SharePage'
import ProfilePage from './pages/ProfilePage'
import GroupsPage from './pages/GroupsPage'
import GroupPage from './pages/GroupPage'
import SavedPage from './pages/SavedPage'
import AdminDashboardPage from './pages/admin/AdminDashboardPage'
import AdminUsersPage from './pages/admin/AdminUsersPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) return null
  return session ? <>{children}</> : <Navigate to="/login" replace />
}

function GuestRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth()
  if (loading) return null
  return session ? <Navigate to="/dashboard" replace /> : <>{children}</>
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { session, loading: authLoading } = useAuth()
  const { profile, loading: profileLoading } = useProfile()
  if (authLoading || profileLoading) return null
  if (!session) return <Navigate to="/login" replace />
  if (!profile?.is_admin) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
      <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
      <Route path="/forgot-password" element={<GuestRoute><ForgotPasswordPage /></GuestRoute>} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/new" element={<ProtectedRoute><NewSessionPage /></ProtectedRoute>} />
      <Route path="/session/:public_id" element={<ProtectedRoute><SessionPage /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="/s/:public_id" element={<SharePage />} />
      <Route path="/g/:public_id" element={<GroupPage />} />
      <Route path="/groups" element={<ProtectedRoute><GroupsPage /></ProtectedRoute>} />
      <Route path="/saved" element={<ProtectedRoute><SavedPage /></ProtectedRoute>} />
      <Route path="/admin" element={<AdminRoute><AdminDashboardPage /></AdminRoute>} />
      <Route path="/admin/users" element={<AdminRoute><AdminUsersPage /></AdminRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  )
}
