import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'

// Page Components
import { PublicView } from './pages/PublicView'
import { AdminLogin } from './pages/AdminLogin'
import { AdminDashboard } from './pages/AdminDashboard'
import { Dashboard } from './pages/Dashboard'
import { Waitlist } from './pages/Waitlist'

// Custom RBAC Guard Route
function RoleRoute({ children, allowedRole, fallbackPath }) {
  const { user, isAuthenticated, isLoading } = useAuth0();

  if (isLoading) return <div>Loading...</div>;

  const userRoles = user?.['https://larsonserver.ddns.net/roles'] || [];
  
  console.log('User Roles (RoleRoute):', userRoles);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Strictly block waitlisted users from going anywhere but /waitlist
  if (userRoles.includes('waitlist')) {
    return <Navigate to="/waitlist" replace />;
  }

  // If they don't have the required role, bounce them
  if (!userRoles.includes(allowedRole)) {
    return <Navigate to={fallbackPath} replace />;
  }

  return children;
}

// Protected Route Wrapper
function ProtectedRoute({ children }) {
  const { user, isAuthenticated, isLoading } = useAuth0();

  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  
  const userRoles = user?.['https://larsonserver.ddns.net/roles'] || [];
  console.log('User Roles (ProtectedRoute):', userRoles);

  // Strictly block waitlisted users from the dashboard
  if (userRoles.includes('waitlist')) {
    return <Navigate to="/waitlist" replace />;
  }

  return children;
}

function App() {
  const { isAuthenticated, isLoading } = useAuth0();

  if (isLoading) return <div>Loading...</div>;

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Homepage / Link Hub */}
        <Route 
          path="/" 
          element={
            isAuthenticated ? <Navigate to="/dashboard" replace /> : <PublicView />
          } 
        />

        {/* Global Login Route */}
        <Route 
          path="/login" 
          element={
            isAuthenticated ? <Navigate to="/dashboard" replace /> : <AdminLogin />
          } 
        />

        {/* Waitlist Page */}
        <Route path="/waitlist" element={<ProtectedRoute><Waitlist /></ProtectedRoute>} />

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
