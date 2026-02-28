import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Layout } from '../components/Layout'
import { User, Shield, Mail, Key, UserCheck, Monitor as MonitorIcon, Fingerprint, Home } from 'lucide-react'
import { useAuth0 } from '@auth0/auth0-react'
import { useNavigate } from 'react-router-dom'

const AUTH0_DOMAIN = import.meta.env.VITE_AUTH0_DOMAIN;
const AUTH0_CLIENT_ID = import.meta.env.VITE_AUTH0_CLIENT_ID;


export function Profile() {
  const { user, getAccessTokenSilently } = useAuth0();
  const navigate = useNavigate();
  const [userRoles, setUserRoles] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(true);

  // Password reset state
  const [resetState, setResetState] = useState('idle'); // idle | loading | success | error
  const [resetError, setResetError] = useState('');
  // MFA
  const [mfaLoading, setMfaLoading] = useState(false);
  const [authenticators, setAuthenticators] = useState([]);
  const [authLoading, setAuthLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [authError, setAuthError] = useState(null);

  // Active section for left nav
  const [activeSection, setActiveSection] = useState('profile');
  const profileRef = useRef(null);
  const securityRef = useRef(null);

  const isSocialUser = user?.sub && !user.sub.startsWith('auth0|');

  useEffect(() => {
    async function fetchRoles() {
      try {
        const token = await getAccessTokenSilently();
        const res = await fetch('/api/me', { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const data = await res.json();
          setUserRoles(data.roles || []);
        }
      } catch (err) {
        console.error('Failed to fetch roles:', err);
      } finally {
        setRolesLoading(false);
      }
    }
    fetchRoles();
  }, [getAccessTokenSilently]);

  // Fetch enrolled authenticators
  const fetchAuth = useCallback(async () => {
    try {
      setAuthLoading(true);
      const token = await getAccessTokenSilently();
      const res = await fetch('/api/authenticators', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (res.ok) setAuthenticators(Array.isArray(data) ? data : []);
      else setAuthError(data.error || `Error ${res.status}`);
    } catch (err) {
      console.error('Failed to fetch authenticators:', err);
      setAuthError(err.message);
    }
    finally { setAuthLoading(false); }
  }, [getAccessTokenSilently]);

  useEffect(() => {
    fetchAuth();
  }, [fetchAuth]);

  useEffect(() => { document.title = 'Account | LarsonServer'; }, []);

  // Intersection observer to highlight active nav section
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(e => {
          if (e.isIntersecting) setActiveSection(e.target.dataset.section);
        });
      },
      { threshold: 0.5 }
    );
    if (profileRef.current) observer.observe(profileRef.current);
    if (securityRef.current) observer.observe(securityRef.current);
    return () => observer.disconnect();
  }, []);

  const handleResetPassword = async () => {
    setResetState('loading');
    setResetError('');
    try {
      const token = await getAccessTokenSilently();
      const res = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Unknown error');
      setResetState('success');
    } catch (err) {
      setResetError(err.message);
      setResetState('error');
    }
  };

  const handleMfaEnroll = async () => {
    setMfaLoading(true);
    try {
      const token = await getAccessTokenSilently();
      const res = await fetch('/api/mfa-enrollment', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else throw new Error(data.error || 'No enrollment URL returned');
    } catch (err) {
      console.error('[MFA enroll]', err);
      alert('Could not start MFA enrollment: ' + err.message);
    } finally {
      setMfaLoading(false);
    }
  };

  const handlePasskeyEnroll = () => {
    const domain = import.meta.env.VITE_AUTH0_DOMAIN;
    const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID;
    const redirectUri = window.location.origin;
    
    // Force re-auth with max_age=0 and specify WebAuthn via acr_values
    const url = `https://${domain}/authorize?` + 
      `response_type=code&` +
      `client_id=${clientId}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `scope=openid profile email&` +
      `acr_values=${encodeURIComponent('https://schemas.openid.net/pape/policies/2007/06/webauthn')}&` +
      `prompt=login&` +
      `max_age=0`;
    
    window.location.href = url;
  };

  const handleDeleteAuthenticator = async (auth) => {
    if (!window.confirm(`Remove this ${auth.factor_type === 'webauthn' ? 'passkey' : 'authenticator'}? You can re-enroll afterwards.`)) return;
    setDeletingId(auth.id);
    try {
      const token = await getAccessTokenSilently();
      const res = await fetch(`/api/authenticators/${auth.id}?factor_type=${auth.factor_type}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setAuthenticators(prev => prev.filter(a => a.id !== auth.id));
      } else {
        const d = await res.json();
        alert('Error: ' + d.error);
      }
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
    finally { setDeletingId(null); }
  };

  const mfaTypeLabel = (method) => ({
    'totp': 'Authenticator App (TOTP)',
    'sms': 'SMS',
    'email': 'Email OTP',
    'push-notification': 'Auth0 Guardian Push',
    'duo': 'Duo Security',
    'recovery-code': 'Recovery Codes',
    'webauthn-roaming': 'Security Key (Passkey)',
    'webauthn-platform': 'Device Biometrics (Passkey)',
  })[method] || method || 'Unknown';

  const navItems = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'security', label: 'Security', icon: Shield },
  ];

  const handleNavClick = (id) => {
    if (id === 'dashboard') { navigate('/dashboard'); return; }
    const ref = id === 'profile' ? profileRef : securityRef;
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveSection(id);
  };

  const roleBadgeColor = (role) => {
    if (role === 'admin') return 'bg-electric-blue/10 text-electric-blue border-electric-blue/20';
    if (role === 'server_manager') return 'bg-cyber-purple/10 text-cyber-purple border-cyber-purple/20';
    return 'bg-zinc-800 text-zinc-300 border-zinc-700';
  };

  return (
    <Layout navItems={navItems} activeItemId={activeSection} onNavigate={handleNavClick}>
      <div className="mb-6 border-b border-zinc-800 pb-4 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold">Account Management</h1>
          <p className="text-zinc-500 text-sm mt-1">Review your profile details and security status.</p>
        </div>
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-md text-sm font-medium transition-colors border border-zinc-700"
        >
          <Home size={14} /> Dashboard
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="lg:col-span-2 space-y-6">

          {/* ── Profile Card ── */}
          <div
            ref={profileRef}
            data-section="profile"
            className="glass-panel hover-glow p-8 rounded-3xl border border-glass-border shadow-xl overflow-hidden relative"
          >
            <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
              <User size={120} />
            </div>

            <div className="flex flex-col md:flex-row items-center gap-8 mb-8 relative z-10">
              <img
                src={user?.picture}
                alt={user?.name}
                className="w-24 h-24 rounded-full border-2 border-electric-blue shadow-[0_0_20px_rgba(0,240,255,0.2)]"
              />
              <div className="text-center md:text-left">
                <h2 className="text-3xl font-bold text-white">{user?.nickname || user?.name}</h2>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mt-2">
                  {rolesLoading ? (
                    <span className="px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-500 text-xs font-medium border border-zinc-700 animate-pulse">Loading...</span>
                  ) : userRoles.length > 0 ? (
                    userRoles.map(role => (
                      <span key={role} className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border flex items-center gap-1.5 uppercase tracking-wider drop-shadow-md ${roleBadgeColor(role)}`}>
                        <Shield size={10} /> {role}
                      </span>
                    ))
                  ) : (
                    <span className="px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-400 text-xs font-medium border border-zinc-700 uppercase tracking-wider">No Assigned Roles</span>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800/50 hover:bg-zinc-900/80 transition-colors">
                <div className="flex items-center gap-2 text-zinc-500 text-xs mb-1"><Mail size={12} /> Email Address</div>
                <div className="text-white font-medium">{user?.email}</div>
                {user?.email_verified && (
                  <div className="flex items-center gap-1.5 text-electric-blue text-[10px] mt-1 font-semibold uppercase tracking-tighter drop-shadow-md">
                    <UserCheck size={10} /> Verified Identity
                  </div>
                )}
              </div>

              <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800/50 hover:bg-zinc-900/80 transition-colors">
                <div className="flex items-center gap-2 text-zinc-500 text-xs mb-1"><MonitorIcon size={12} /> Account Type</div>
                <div className="text-white font-medium uppercase tracking-wider text-xs">
                  {userRoles.includes('admin') ? 'Staff Administrator' : 'Standard User'}
                </div>
                <div className="text-zinc-600 text-[10px] mt-1 italic">
                  Provider: {isSocialUser ? user.sub.split('|')[0] : 'auth0 (password)'}
                </div>
              </div>
            </div>
          </div>

          {/* ── Security & Identity ── */}
          <div
            ref={securityRef}
            data-section="security"
            className="glass-panel p-6 rounded-2xl border border-glass-border hover-glow"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2 text-cyber-purple drop-shadow-md">
                  <Shield size={20} /> Security & Identity
                </h3>
                <p className="text-zinc-400 text-xs mt-1">Manage your credentials and authentication methods.</p>
              </div>
              <div className="px-3 py-1 rounded-full bg-cyber-purple/10 border border-cyber-purple/20 text-[10px] font-bold text-cyber-purple drop-shadow-md uppercase tracking-tighter">
                Secured by Auth0
              </div>
            </div>

            <div className="space-y-4">

              {/* Password Reset */}
              <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-zinc-900/50 rounded-xl border border-zinc-800/50 hover:border-zinc-700 transition-colors gap-4">
                <div className="flex items-center gap-4 w-full sm:w-auto">
                  <div className={`w-10 h-10 rounded-full flex flex-shrink-0 items-center justify-center ${isSocialUser ? 'bg-zinc-800 text-zinc-600' : 'bg-zinc-800 text-zinc-400'}`}>
                    <Key size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Account Password</p>
                    <p className="text-[10px] text-zinc-500">
                      {isSocialUser
                        ? `Managed by ${user.sub.split('|')[0]} — no password to reset`
                        : resetState === 'success'
                          ? '✓ Reset email sent — check your inbox'
                          : 'Send a fresh password reset link to your email'}
                    </p>
                    {resetState === 'error' && <p className="text-[10px] text-red-400 mt-0.5">{resetError}</p>}
                  </div>
                </div>
                <button
                  onClick={handleResetPassword}
                  disabled={isSocialUser || resetState === 'loading' || resetState === 'success'}
                  className={`w-full sm:w-auto px-4 py-2 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap
                    ${isSocialUser || resetState === 'success'
                      ? 'bg-zinc-800/50 border-zinc-700/50 text-zinc-600 cursor-not-allowed'
                      : resetState === 'loading'
                        ? 'bg-zinc-700 border-zinc-600 text-zinc-400 cursor-wait'
                        : 'bg-zinc-800 hover:bg-zinc-700 text-white border-zinc-700'
                    }`}
                >
                  {resetState === 'loading' ? 'Sending...' : resetState === 'success' ? 'Email Sent ✓' : 'Send Reset Email'}
                </button>
              </div>
              <div className="bg-zinc-900/40 rounded-2xl border border-zinc-800/80 p-6 space-y-6">
                <div className="flex flex-col gap-4">
                  {/* MFA List */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-cyber-cyan/10 flex flex-shrink-0 items-center justify-center text-cyber-cyan shadow-[0_0_15px_rgba(0,255,242,0.15)]">
                        <Shield size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">Multi-Factor Authentication</p>
                        <p className="text-[10px] text-zinc-500">Traditional OTP and Push methods.</p>
                      </div>
                    </div>
                    <button
                      onClick={handleMfaEnroll}
                      disabled={mfaLoading}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors whitespace-nowrap
                        ${mfaLoading ? 'bg-zinc-700 border-zinc-600 text-zinc-400 cursor-wait' : 'bg-cyber-cyan/10 hover:bg-cyber-cyan/20 text-cyber-cyan border-cyber-cyan/20'}`}
                    >
                      {mfaLoading ? 'Opening...' : '+ Add MFA'}
                    </button>
                  </div>

                  {authLoading ? (
                    <div className="text-xs text-zinc-500 animate-pulse pl-14">Loading...</div>
                  ) : authError ? (
                    <div className="text-xs text-red-400 bg-red-400/5 border border-red-400/10 p-2 rounded-lg ml-14">
                      Error: {authError}
                    </div>
                  ) : (
                    <div className="space-y-2 ml-14">
                      {authenticators.filter(a => !a.auth_method?.includes('webauthn')).length === 0 ? (
                        <p className="text-xs text-zinc-600 italic">No MFA methods enrolled.</p>
                      ) : (
                        authenticators.filter(a => !a.auth_method?.includes('webauthn')).map(auth => (
                          <div key={auth.id} className="flex items-center justify-between pr-1 py-2 rounded-lg bg-zinc-900/80 border border-zinc-800/50 group">
                            <div>
                              <p className="text-xs font-medium text-white">{mfaTypeLabel(auth.auth_method)}</p>
                              {auth.friendly_name && <p className="text-[10px] text-zinc-500">{auth.friendly_name}</p>}
                              <p className="text-[10px] text-zinc-600">
                                {auth.confirmed ? '✓ Confirmed' : '⚠ Not confirmed'}{auth.enrolled_at ? ` · ${new Date(auth.enrolled_at).toLocaleDateString()}` : ''}
                              </p>
                            </div>
                            <button
                              onClick={() => handleDeleteAuthenticator(auth)}
                              disabled={deletingId === auth.id}
                              className="px-2.5 py-1 text-[10px] font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg border border-transparent hover:border-red-500/20 transition-colors disabled:opacity-50"
                            >
                              {deletingId === auth.id ? 'Removing...' : 'Remove'}
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  <div className="h-px bg-zinc-800/50 my-2" />

                  {/* Passkeys List */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-cyber-purple/10 flex flex-shrink-0 items-center justify-center text-cyber-purple shadow-[0_0_15px_rgba(176,38,255,0.15)]">
                        <Fingerprint size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">Passkeys & Biometrics</p>
                        <p className="text-[10px] text-zinc-500">Login with fingerprint, face, or hardware key.</p>
                      </div>
                    </div>
                    <button
                      onClick={handlePasskeyEnroll}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border bg-cyber-purple/10 hover:bg-cyber-purple/20 text-cyber-purple border-cyber-purple/20 transition-colors whitespace-nowrap"
                    >
                      + Add Passkey
                    </button>
                  </div>

                  <div className="space-y-2 ml-14">
                    {authenticators.filter(a => a.auth_method?.includes('webauthn')).length === 0 && !authLoading ? (
                      <p className="text-xs text-zinc-600 italic">No passkeys enrolled.</p>
                    ) : (
                      authenticators.filter(a => a.auth_method?.includes('webauthn')).map(auth => (
                        <div key={auth.id} className="flex items-center justify-between pr-1 py-2 rounded-lg bg-zinc-900/80 border border-zinc-800/50 group">
                          <div>
                            <p className="text-xs font-medium text-white">{mfaTypeLabel(auth.auth_method)}</p>
                            <p className="text-[10px] text-zinc-500">{auth.friendly_name || 'Generic Passkey'}</p>
                            <p className="text-[10px] text-zinc-600">
                              {auth.confirmed ? '✓ Secure Method' : '⚠ Not confirmed'}{auth.enrolled_at ? ` · ${new Date(auth.enrolled_at).toLocaleDateString()}` : ''}
                            </p>
                          </div>
                          <button
                            onClick={() => handleDeleteAuthenticator(auth)}
                            disabled={deletingId === auth.id}
                            className="px-2.5 py-1 text-[10px] font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg border border-transparent hover:border-red-500/20 transition-colors disabled:opacity-50"
                          >
                            {deletingId === auth.id ? 'Removing...' : 'Remove'}
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Sidebar ── */}
        <div className="space-y-6">
          <div className="glass-panel p-6 rounded-2xl border border-glass-border hover-glow">
            <h4 className="font-semibold text-cyber-purple mb-2 flex items-center gap-2 drop-shadow-md">
              <Shield size={16} /> Access Control
            </h4>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Your roles determine which server clusters and management panels you can view. If you believe your roles are incorrect, contact the system administrator.
            </p>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-glass-border hover-glow">
            <h4 className="font-semibold text-zinc-300 mb-3 flex items-center gap-2">
              <Key size={16} /> Linked Identities
            </h4>
            <div className="space-y-2">
              <div className="flex items-center gap-3 p-3 bg-zinc-900/50 rounded-xl border border-zinc-800/50">
                <div className="w-8 h-8 rounded-full overflow-hidden border border-zinc-700">
                  <img src={user?.picture} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white truncate">{user?.email}</p>
                  <p className="text-[10px] text-zinc-500 capitalize">
                    {isSocialUser ? user.sub.split('|')[0].replace(/-/g, ' ') : 'Username & Password'}
                  </p>
                </div>
                <div className="text-[10px] text-emerald-400 font-semibold bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20">Primary</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
