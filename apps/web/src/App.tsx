import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { StartupAnimation } from './components/StartupAnimation'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AppLayout } from './components/AppLayout'

// Public Pages
import { HomePage } from './pages/HomePage'
import { SignInPage } from './pages/SignInPage'
import { SignUpPage } from './pages/SignUpPage'
import { ForgotPasswordPage } from './pages/ForgotPasswordPage'
import { AuthCallbackPage } from './pages/AuthCallbackPage'

// Workspace Pages
import { LandingPage } from './pages/LandingPage'
import { ScanProgressPage } from './pages/ScanProgressPage'
import { DashboardPage } from './pages/DashboardPage'
import { ReportPage } from './pages/ReportPage'
import { HistoryPage } from './pages/HistoryPage'
import { ProfilePage } from './pages/ProfilePage'

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <StartupAnimation />
        <Routes>
        {/* Public Marketing & Auth Routes */}
        <Route path="/" element={<HomePage />} />
        <Route path="/signin" element={<SignInPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />

        {/* Protected Workspace Routes (wrapped in AppLayout) */}
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <AppLayout>
                <LandingPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/scans/:id"
          element={
            <ProtectedRoute>
              <AppLayout>
                <ScanProgressPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/scans/:id/dashboard"
          element={
            <ProtectedRoute>
              <AppLayout>
                <DashboardPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/scans/:id/report"
          element={
            <ProtectedRoute>
              <AppLayout>
                <ReportPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/app/history"
          element={
            <ProtectedRoute>
              <AppLayout>
                <HistoryPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/app/profile"
          element={
            <ProtectedRoute>
              <AppLayout>
                <ProfilePage />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        {/* Backwards Compatibility / Direct Shortcut Redirects */}
        <Route path="/scans/:id" element={<Navigate to="/app/scans/:id" replace />} />
        <Route path="/scans/:id/dashboard" element={<Navigate to="/app/scans/:id/dashboard" replace />} />
        <Route path="/scans/:id/report" element={<Navigate to="/app/scans/:id/report" replace />} />
        <Route path="/history" element={<Navigate to="/app/history" replace />} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
    </ThemeProvider>
  )
}
