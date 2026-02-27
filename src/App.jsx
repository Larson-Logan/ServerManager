import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { SignedIn, SignedOut, useUser } from '@clerk/clerk-react'

// Page Components
import { PublicView } from './pages/PublicView'
import { AdminLogin } from './pages/AdminLogin'
import { AdminDashboard } from './pages/AdminDashboard'
import { Dashboard } from './pages/Dashboard'

// Custom RBAC Guard Route
function RoleRoute({ children, allowedRole, fallbackPath }) {
  const { user, isLoaded } = useUser();

  if (!isLoaded) return null; // Wait for Clerk to load

  const userRoles = user?.publicMetadata?.roles || [];
  const legacyRole = user?.publicMetadata?.role;

  // If they don't have the required role in their array, bounce them to the fallback
  if (!userRoles.includes(allowedRole) && legacyRole !== allowedRole) {
    return <Navigate to={fallbackPath} replace />;
  }

  // They are authorized, render the route
  return children;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Homepage / Link Hub */}
        <Route path="/" element={<PublicView />} />

        {/* Global Login Route */}
        <Route 
          path="/login" 
          element={
            <>
              {/* If you are already signed in... */}
              <SignedIn>
                {/* 
                   We don't statically know their role right here in the JSX element,
                   so we just generically bounce them to /dashboard.
                   If they *are* an admin, they can navigate to /admin manually or we handle it inside Dashboard! 
                */}
                <Navigate to="/dashboard" replace />
              </SignedIn>
              {/* Show the sign in block if signed out */}
              <SignedOut>
                <AdminLogin />
              </SignedOut>
            </>
          } 
        />

        {/* Protected Admin Panel (Requires 'admin' role) */}
        <Route 
          path="/admin" 
          element={
            <>
              <SignedOut>
                <Navigate to="/login" replace />
              </SignedOut>
              <SignedIn>
                <RoleRoute allowedRole="admin" fallbackPath="/dashboard">
                  <AdminDashboard />
                </RoleRoute>
              </SignedIn>
            </>
          } 
        />

        {/* Generic Dashboard (Requires 'user' role natively, but Admins can theoretically see it too if you wanted. For now, we enforce 'user') */}
        <Route 
          path="/dashboard" 
          element={
            <>
              <SignedOut>
                <Navigate to="/login" replace />
              </SignedOut>
              <SignedIn>
                {/* We wrap dashboard differently: anyone who is NOT an admin should see this. */}
                {/* Actually, let's just let admins see it too, or strict role it. Let's strict role it to 'user' for now, or just leave it unprotected so admins can view it. */}
                {/* For simplicity: If you are authenticated, you can view the generic Dashboard. */}
                <Dashboard />
              </SignedIn>
            </>
          } 
        />

        {/* Catch-all 404 redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
