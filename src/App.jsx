import React, { useEffect, useState, useCallback, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useSearchParams } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'

// Page Components
const PublicView = lazy(() => import('./pages/PublicView').then(m => ({ default: m.PublicView })));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Waitlist = lazy(() => import('./pages/Waitlist').then(m => ({ default: m.Waitlist })));
const Profile = lazy(() => import('./pages/Profile').then(m => ({ default: m.Profile })));

// Admin Subpages (lazy loaded for bundle optimization)
const AdminMetrics = lazy(() => import('./pages/admin/AdminMetrics').then(m => ({ default: m.AdminMetrics })));
const AdminUsers = lazy(() => import('./pages/admin/AdminUsers').then(m => ({ default: m.AdminUsers })));
const AdminRoles = lazy(() => import('./pages/admin/AdminRoles').then(m => ({ default: m.AdminRoles })));
const AdminAuditLog = lazy(() => import('./pages/admin/AdminAuditLog').then(m => ({ default: m.AdminAuditLog })));

// Loading Fallback Component
const LoadingScreen = () => (
  <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#09090b]">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-2 border-electric-blue/20 border-t-electric-blue rounded-full animate-spin"></div>
      <p className="text-zinc-500 font-medium text-sm animate-pulse">Initializing System...</p>
    </div>
  </div>
);

// Error Handler Component
function AuthErrorHandler({ children }) {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const initialError = searchParams.get('error');
  const initialErrorDesc = searchParams.get('error_description');
  
  const [errorMsg, setErrorMsg] = useState(() => {
    if (initialError === 'access_denied' && initialErrorDesc) {
      return decodeURIComponent(initialErrorDesc);
    }
    return '';
  });

  useEffect(() => {
    if (initialError === 'access_denied') {
      searchParams.delete('error');
      searchParams.delete('error_description');
      searchParams.delete('state');
      setSearchParams(searchParams, { replace: true });
    }
  }, [initialError, searchParams, setSearchParams]);

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

function useLiveRoles() {
  const { isAuthenticated, isLoading, getAccessTokenSilently } = useAuth0();
  const [roles, setRoles] = useState(null); 
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
      setRoles(data.roles);
    } catch (err) {
      console.error('[useLiveRoles] Error:', err);
      setRolesError(true);
      setRoles([]); 
    }
  }, [isAuthenticated, getAccessTokenSilently]);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      fetchRoles();
    }
  }, [isLoading, isAuthenticated, fetchRoles]);

  return { roles, rolesError };
}

function RoleRoute({ children, allowedRole, fallbackPath }) {
  const { isAuthenticated, isLoading, loginWithRedirect } = useAuth0();
  const { roles } = useLiveRoles();

  if (isLoading || roles === null) return <LoadingScreen />;

  if (!isAuthenticated) {
    loginWithRedirect();
    return <LoadingScreen />;
  }

  if (roles.includes('waitlist')) return <Navigate to="/waitlist" replace />;
  if (!roles.includes(allowedRole)) return <Navigate to={fallbackPath} replace />;

  return children;
}

function ProtectedRoute({ children, allowWaitlist = false }) {
  const { isAuthenticated, isLoading, loginWithRedirect } = useAuth0();
  const { roles } = useLiveRoles();

  if (isLoading || roles === null) return <LoadingScreen />;
  if (!isAuthenticated) {
    loginWithRedirect();
    return <LoadingScreen />;
  }

  const isWaitlist = roles.includes('waitlist') || roles.length === 0;

  if (isWaitlist && !allowWaitlist) return <Navigate to="/waitlist" replace />;
  if (allowWaitlist && !isWaitlist) return <Navigate to="/dashboard" replace />;

  return children;
}

function LoginRedirect() {
  const { isAuthenticated, isLoading, loginWithRedirect } = useAuth0();
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      loginWithRedirect();
    }
  }, [isLoading, isAuthenticated, loginWithRedirect]);
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return <LoadingScreen />;
}

function App() {
  const { isAuthenticated, isLoading } = useAuth0();

  if (isLoading) return <LoadingScreen />;

  return (
    <BrowserRouter>
      <AuthErrorHandler>
        <Suspense fallback={<LoadingScreen />}>
          <Routes>
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

            <Route path="/login" element={<LoginRedirect />} />
            <Route path="/waitlist" element={<ProtectedRoute allowWaitlist={true}><Waitlist /></ProtectedRoute>} />

            <Route 
              path="/admin" 
              element={
                <RoleRoute allowedRole="admin" fallbackPath="/dashboard">
                  <AdminDashboard />
                </RoleRoute>
              } 
            >
              <Route index element={<Navigate to="metrics" replace />} />
              <Route path="metrics" element={<AdminMetrics />} />
              <Route path="users" element={<AdminUsers />} />
              <Route path="roles" element={<AdminRoles />} />
              <Route path="audit" element={<AdminAuditLog />} />
            </Route>

            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />

            <Route 
              path="/profile" 
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } 
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AuthErrorHandler>
    </BrowserRouter>
  )
}


export default App
