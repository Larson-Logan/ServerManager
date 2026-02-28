import React, { useState, useEffect } from 'react'
import { Layout } from '../components/Layout'
import { User, Shield, Mail, Key, UserCheck, Monitor as MonitorIcon } from 'lucide-react'
import { useAuth0 } from '@auth0/auth0-react'

export function Profile() {
  const { user, getAccessTokenSilently } = useAuth0();
  const [userRoles, setUserRoles] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(true);

  useEffect(() => {
    async function fetchRoles() {
      try {
        const token = await getAccessTokenSilently();
        const res = await fetch('/api/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
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

  useEffect(() => { document.title = 'Account | LarsonServer'; }, []);

  return (
    <Layout activeItemId="profile">
      <div className="mb-6 border-b border-zinc-800 pb-4">
        <h1 className="text-2xl font-bold">Account Management</h1>
        <p className="text-zinc-500 text-sm mt-1">Review your profile details and security status.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {/* Profile Card */}
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-panel p-8 rounded-3xl border border-zinc-800 shadow-xl overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 opacity-5">
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
                 <div className="flex items-center justify-center md:justify-start gap-2 mt-2">
                   {rolesLoading ? (
                     <span className="px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-500 text-xs font-medium border border-zinc-700 animate-pulse">Loading roles...</span>
                   ) : userRoles.length > 0 ? (
                     userRoles.map(role => (
                       <span key={role} className="px-2.5 py-0.5 rounded-full bg-electric-blue/10 text-electric-blue text-xs font-semibold border border-electric-blue/20 flex items-center gap-1.5 uppercase tracking-wider">
                         <Shield size={10} /> {role}
                       </span>
                     ))
                   ) : (
                     <span className="px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-400 text-xs font-medium border border-zinc-700 uppercase tracking-wider">
                       No Assigned Roles
                     </span>
                   )}
                 </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800">
                  <div className="flex items-center gap-2 text-zinc-500 text-xs mb-1">
                    <Mail size={12} /> Email Address
                  </div>
                  <div className="text-white font-medium">{user?.email}</div>
                  {user?.email_verified && (
                    <div className="flex items-center gap-1.5 text-green-400 text-[10px] mt-1 font-semibold uppercase tracking-tighter">
                      <UserCheck size={10} /> Verified Identity
                    </div>
                  )}
               </div>
               
               <div className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800">
                  <div className="flex items-center gap-2 text-zinc-500 text-xs mb-1">
                    <MonitorIcon size={12} /> Account Type
                  </div>
                  <div className="text-white font-medium uppercase tracking-wider text-xs">
                    {userRoles.includes('admin') ? 'Staff Administrator' : 'Standard User'}
                  </div>
                  <div className="text-zinc-600 text-[10px] mt-1 italic">Provider: {user?.sub?.split('|')[0]}</div>
               </div>
            </div>
          </div>

          <div className="glass-panel p-6 rounded-2xl border border-zinc-800/50 bg-cyber-purple/5">
             <div className="flex items-center justify-between mb-6">
                <div>
                   <h3 className="text-lg font-semibold flex items-center gap-2 text-cyber-purple">
                      <Shield size={20} /> Security & Identity
                   </h3>
                   <p className="text-zinc-500 text-xs mt-1">Manage your credentials and authentication methods.</p>
                </div>
                <div className="px-3 py-1 rounded-full bg-cyber-purple/10 border border-cyber-purple/20 text-[10px] font-bold text-cyber-purple uppercase tracking-tighter">
                   Secured by Auth0
                </div>
             </div>

             <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-zinc-900/50 rounded-xl border border-zinc-800">
                   <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400">
                         <Key size={18} />
                      </div>
                      <div>
                         <p className="text-sm font-semibold">Account Password</p>
                         <p className="text-[10px] text-zinc-500">Update your account password via email</p>
                      </div>
                   </div>
                   <button 
                      onClick={() => window.location.href = `https://${import.meta.env.VITE_AUTH0_DOMAIN}/u/reset-password?client_id=${import.meta.env.VITE_AUTH0_CLIENT_ID}`}
                      className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-medium border border-zinc-700 transition-colors"
                   >
                      Reset Password
                   </button>
                </div>

                <div className="p-4 bg-zinc-900/50 rounded-xl border border-zinc-800">
                   <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-electric-blue/10 flex items-center justify-center text-electric-blue">
                         <Shield size={18} />
                      </div>
                      <div className="flex-1">
                         <p className="text-sm font-semibold">Multi-Factor Authentication (MFA)</p>
                         <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
                            To enable MFA, please log out and choose the "Security Settings" or "Enable MFA" option during your next login attempt, or contact the cluster admin to force enrollment.
                         </p>
                         <div className="mt-3 flex items-center gap-2">
                             <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                             <span className="text-[10px] text-zinc-400 uppercase font-bold tracking-widest">Active Protection Available</span>
                         </div>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        </div>

        {/* Info Sidebar */}
        <div className="space-y-6">
           <div className="glass-panel p-6 rounded-2xl border border-zinc-800/50 bg-cyber-purple/5">
              <h4 className="font-semibold text-cyber-purple mb-2 flex items-center gap-2">
                 <Shield size={16} /> Access Control
              </h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                 Your roles determine which server clusters and management panels you can view. If you believe your roles are incorrect, contact the system administrator.
              </p>
           </div>
        </div>
      </div>
    </Layout>
  )
}
