import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { LoadingScreen } from './components/ui/UIComponents';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ProfilePage from './pages/ProfilePage';
import DashboardPage from './pages/DashboardPage';
import DataUploadPage from './pages/DataUploadPage';
import AdvisorPage from './pages/AdvisorPage';
import AdminPage from './pages/AdminPage';
import PlannerPage from './pages/PlannerPage';
import ReportsPage from './pages/ReportsPage';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, loading } = useAuth();
  if (loading) return <LoadingScreen message="Loading workspace settings..." />;
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, user, loading } = useAuth();
  if (loading) return <LoadingScreen message="Verifying admin credentials..." />;
  if (!token || user?.role !== 'admin') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

const PublicOnlyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { token, loading } = useAuth();
  if (loading) return <LoadingScreen message="Checking session..." />;
  if (token) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
            <Route path="/register" element={<PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>} />
            <Route path="/forgot-password" element={<PublicOnlyRoute><ForgotPasswordPage /></PublicOnlyRoute>} />

            {/* Protected User Routes */}
            <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
            <Route path="/upload" element={<ProtectedRoute><DataUploadPage /></ProtectedRoute>} />
            <Route path="/assistant" element={<ProtectedRoute><AdvisorPage /></ProtectedRoute>} />
            <Route path="/planner" element={<ProtectedRoute><PlannerPage /></ProtectedRoute>} />
            <Route path="/reports" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />

            {/* Admin Routes */}
            <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;
