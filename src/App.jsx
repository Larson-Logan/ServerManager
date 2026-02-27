import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'

// Page Components
import { PublicView } from './pages/PublicView'
import { AdminLogin } from './pages/AdminLogin'
import { AdminDashboard } from './pages/AdminDashboard'
import { Dashboard } from './pages/Dashboard'

// Custom RBAC Guard Route
function RoleRoute({ children, allowedRole, fallbackPath }) {
  const { user, isAuthenticated, isLoading } = useAuth0();

  if (isLoading) return <div>Loading...</div>;

  // Let's assume roles will come via custom claims or app_metadata mapped to user object
  // For now, if no role claim exists, fallback to standard permission checks based on generic login
  const userRoles = user?.['https://larsonserver.ddns.net/roles'] || [];

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If they don't have the required role, bounce them
  if (!userRoles.includes(allowedRole)) {
    return <Navigate to={fallbackPath} replace />;
  }

  return children;
}

// Protected Route Wrapper
function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth0();

  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  
  return children;
}

function App() {
  const { isAuthenticated, isLoading } = useAuth0();

  if (isLoading) return <div>Loading...</div>;

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Homepage / Link Hub */}
        <Route path="/" element={<PublicView />} />

        {/* Global Login Route */}
        <Route 
          path="/login" 
          element={
            isAuthenticated ? <Navigate to="/dashboard" replace /> : <AdminLogin />
          } 
        />

        {/* Protected Admin Panel (Requires 'admin' role) */}
        <Route 
          path="/admin" 
          element={
            <RoleRoute allowedRole="admin" fallbackPath="/dashboard">
              <AdminDashboard />
            </RoleRoute>
          } 
        />

        {/* Generic Dashboard - Just requires basic authentication */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } 
        />

        {/* Catch-all 404 redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
