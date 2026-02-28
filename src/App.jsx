import React, { useEffect, useState, useCallback } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useSearchParams } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'

// Page Components
import { PublicView } from './pages/PublicView'
import { AdminDashboard } from './pages/AdminDashboard'
import { Dashboard } from './pages/Dashboard'
import { Waitlist } from './pages/Waitlist'
import { Profile } from './pages/Profile'

// Error Handler Component
function AuthErrorHandler({ children }) {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Read initial error directly from params (no effect needed)
  const initialError = searchParams.get('error');
  const initialErrorDesc = searchParams.get('error_description');
  
  const [errorMsg, setErrorMsg] = useState(() => {
    if (initialError === 'access_denied' && initialErrorDesc) {
      return decodeURIComponent(initialErrorDesc);
    }
    return '';
  });

  // Clean URL strictly once if there was an error
  useEffect(() => {
    if (initialError === 'access_denied') {
      searchParams.delete('error');
      searchParams.delete('error_description');
      searchParams.delete('state');
      setSearchParams(searchParams, { replace: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      {errorMsg && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="glass-panel max-w-md w-full p-6 sm:p-8 rounded-2xl flex flex-col items-center text-center border-red-500/20 bg-zinc-900/80">
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-6 border border-red-500/20">
              <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
            <p className="text-zinc-400 mb-8">{errorMsg}</p>
            <button 
              onClick={() => setErrorMsg('')}
              className="w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors"
            >
              Acknowledge
            </button>
          </div>
        </div>
      )}
      {children}
    </>
  );
}

// Hook to fetch LIVE roles from our backend (bypasses stale JWT cache)
function useLiveRoles() {
  const { isAuthenticated, isLoading, getAccessTokenSilently } = useAuth0();
  const [roles, setRoles] = useState(null); // null = still loading
  const [rolesError, setRolesError] = useState(false);

  const fetchRoles = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const token = await getAccessTokenSilently();
      const res = await fetch('/api/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch roles');
      const data = await res.json();
      console.log('[useLiveRoles] Live roles from server:', data.roles);
      setRoles(data.roles);
    } catch (err) {
      console.error('[useLiveRoles] Error:', err);
      setRolesError(true);
      setRoles([]); // fail-safe: treat as no roles (waitlisted)
    }
  }, [isAuthenticated, getAccessTokenSilently]);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      fetchRoles();
    }
  }, [isLoading, isAuthenticated, fetchRoles]);

  return { roles, rolesError };
}

// Custom RBAC Guard Route
function RoleRoute({ children, allowedRole, fallbackPath }) {
  const { isAuthenticated, isLoading, loginWithRedirect } = useAuth0();
  const { roles } = useLiveRoles();

  if (isLoading || roles === null) return <div>Loading...</div>;

  if (!isAuthenticated) {
    loginWithRedirect();
    return <div>Redirecting to login...</div>;
  }

  if (roles.includes('waitlist')) return <Navigate to="/waitlist" replace />;
  if (!roles.includes(allowedRole)) return <Navigate to={fallbackPath} replace />;

  return children;
}

// Protected Route Wrapper
function ProtectedRoute({ children, allowWaitlist = false }) {
  const { isAuthenticated, isLoading, loginWithRedirect } = useAuth0();
  const { roles } = useLiveRoles();

  if (isLoading || roles === null) return <div>Loading...</div>;
  if (!isAuthenticated) {
    loginWithRedirect();
    return <div>Redirecting to login...</div>;
  }

  const isWaitlist = roles.includes('waitlist') || roles.length === 0;

  if (isWaitlist && !allowWaitlist) return <Navigate to="/waitlist" replace />;
  if (allowWaitlist && !isWaitlist) return <Navigate to="/dashboard" replace />;

  return children;
}

// Simple component for /login: immediately trigger Auth0 or bounce to dashboard
function LoginRedirect() {
  const { isAuthenticated, isLoading, loginWithRedirect } = useAuth0();
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      loginWithRedirect();
    }
  }, [isLoading, isAuthenticated, loginWithRedirect]);
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <div>Redirecting to login...</div>;
}

function App() {
  const { isAuthenticated, isLoading } = useAuth0();

  if (isLoading) return <div>Loading...</div>;

  return (
    <BrowserRouter>
      <AuthErrorHandler>
        <Routes>
        {/* Public Homepage / Link Hub */}
        <Route 
          path="/" 
          element={
            isAuthenticated ? (
              <ProtectedRoute>
                <Navigate to="/dashboard" replace />
              </ProtectedRoute>
            ) : (
              <PublicView />
            )
          } 
        />

        {/* Global Login Route - directly triggers Auth0 */}
        <Route 
          path="/login" 
          element={<LoginRedirect />}
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
      </AuthErrorHandler>
    </BrowserRouter>
  )
}

export default App
