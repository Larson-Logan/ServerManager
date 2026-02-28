import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'

// Page Components
import { PublicView } from './pages/PublicView'
import { AdminDashboard } from './pages/AdminDashboard'
import { Dashboard } from './pages/Dashboard'
import { Waitlist } from './pages/Waitlist'
import { Profile } from './pages/Profile'

// Custom RBAC Guard Route
function RoleRoute({ children, allowedRole, fallbackPath }) {
  const { user, isAuthenticated, isLoading, loginWithRedirect } = useAuth0();

  if (isLoading) return <div>Loading...</div>;

  if (!isAuthenticated) {
    loginWithRedirect();
    return <div>Redirecting to login...</div>;
  }

  const userRoles = user?.['https://larsonserver.ddns.net/roles'] || [];
  
  console.log('User Roles (RoleRoute):', userRoles);

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
function ProtectedRoute({ children, allowWaitlist = false }) {
  const { user, isAuthenticated, isLoading, loginWithRedirect } = useAuth0();

  if (isLoading) return <div>Loading...</div>;
  if (!isAuthenticated) {
    loginWithRedirect();
    return <div>Redirecting to login...</div>;
  }
  
  // Strictly block waitlisted users from the dashboard, UNLESS they are specifically allowed (like on the waitlist page itself)
  if (userRoles.includes('waitlist') && !allowWaitlist) {
    return <Navigate to="/waitlist" replace />;
  }

  // If we are on the waitlist page but the user is already approved, send them to the dashboard
  if (allowWaitlist && !userRoles.includes('waitlist')) {
     return <Navigate to="/dashboard" replace />;
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
            <ProtectedRoute>
               <Navigate to="/dashboard" replace />
            </ProtectedRoute>
          } 
        />

        {/* Waitlist Page */}
        <Route path="/waitlist" element={<ProtectedRoute allowWaitlist={true}><Waitlist /></ProtectedRoute>} />

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

        {/* Profile Page */}
        <Route 
          path="/profile" 
          element={
            <ProtectedRoute>
              <Profile />
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
