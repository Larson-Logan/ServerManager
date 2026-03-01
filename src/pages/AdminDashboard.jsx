import React, { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Layout } from '../components/Layout'
import { SystemMetrics } from '../components/SystemMetrics'
import { Check, X, Clock, Mail, Activity, Users, Monitor as MonitorIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'

// Custom Animated Multi-Select Component
const CustomRoleSelect = ({ user, currentRoles, isAdmin, onRoleChange, isOpen, onToggle }) => {
  const dropdownRef = useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
  
  // Prevent locking yourself out
  const isDisabled = isAdmin && user.id === 'user_2taX1gW3wH1zXF8z5D4W7d7z8b8';

  const availableRoles = [
    { id: 'user', label: 'User', color: 'text-zinc-300', bg: 'bg-zinc-800' },
    { id: 'server_manager', label: 'Server Mngr', color: 'text-cyber-purple', bg: 'bg-cyber-purple/20' },
    { id: 'admin', label: 'Admin', color: 'text-electric-blue', bg: 'bg-electric-blue/20' }
  ];

  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect();
      setCoords({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onToggle(null);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onToggle]);

  const toggleRole = (roleId) => {
     if (isDisabled && roleId === 'admin') return; // Don't let superadmin remove their own admin role
     let newRoles = [...currentRoles];
     if (newRoles.includes(roleId)) {
         newRoles = newRoles.filter(r => r !== roleId);
     } else {
         newRoles.push(roleId);
     }
     onRoleChange(user.id, newRoles);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={() => !isDisabled && onToggle(isOpen ? null : user.id)}
        className={`px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-2 transition-all ${isDisabled ? 'opacity-50 cursor-not-allowed border-zinc-700 bg-zinc-800/50 text-zinc-400' : 'border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-white shadow-sm'}`}
      >
        {currentRoles.length === 0 ? (
          <span className="text-zinc-500">No Roles</span>
        ) : (
           <div className="flex gap-1 flex-wrap">
             {currentRoles.map(r => {
               const def = availableRoles.find(a => a.id === r);
               if (!def) return null;
               return (
                  <span key={r} className={`px-2 py-0.5 rounded ${def.bg} ${def.color}`}>
                     {def.label}
                  </span>
               )
             })}
           </div>
        )}
        <svg className={`w-4 h-4 text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
      </button>

      {isOpen && createPortal(
        <div 
          style={{ 
            position: 'absolute', 
            top: coords.top + 8,
            left: coords.left,
            width: 192,
            zIndex: 9999
          }}
          className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-2 animate-in fade-in slide-in-from-top-2 duration-200"
        >
          {availableRoles.map(role => {
            const hasRole = currentRoles.includes(role.id);
            return (
              <label 
                key={role.id} 
                onMouseDown={(e) => {
                  e.stopPropagation();
                }}
                onClick={(e) => { 
                  e.preventDefault();
                  e.stopPropagation();
                  toggleRole(role.id); 
                }}
                className="flex items-center gap-3 p-2 hover:bg-zinc-800 rounded-lg cursor-pointer transition-colors group"
              >
                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${hasRole ? 'bg-electric-blue border-electric-blue' : 'border-zinc-600 group-hover:border-zinc-500'}`}>
                  {hasRole && <Check size={12} className="text-zinc-900 stroke-[3]" />}
                </div>
                <span className={`text-sm font-medium ${role.color}`}>{role.label}</span>
              </label>
            );
          })}
        </div>,
        document.body
      )}
    </div>
  );
};

export function AdminDashboard() {
  useEffect(() => { document.title = 'Admin Panel | LarsonServer'; }, []);

  const [activeTab, setActiveTab] = useState('metrics'); // 'metrics' or 'users'
  const [accessToken, setAccessToken] = useState(null);
  const { getAccessTokenSilently: getToken } = useAuth0();

  useEffect(() => {
    getToken().then(setAccessToken).catch(console.error);
  }, [getToken]);
  
  const navItems = [
    { id: 'metrics', label: 'System Metrics', icon: Activity },
    { id: 'users', label: 'User Management', icon: Users },
    { id: 'external-amp', label: 'CubeCoders AMP', icon: MonitorIcon }
  ];

  const handleNavClick = async (id) => {
    if (id === 'external-amp') {
      try {
        const token = await getToken();
        const res = await fetch('/api/amp-launch', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          window.open('https://manage.larsonserver.ddns.net', '_blank');
        } else {
          console.error('Failed to get launch token from server');
          alert('Could not launch server manager. Please check your permissions.');
        }
      } catch (err) {
        console.error('Launch request failed:', err);
      }
      return;
    }
    setActiveTab(id);
  };


  const [requests, setRequests] = useState([]);
  const [users, setUsers] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openDropdownUserId, setOpenDropdownUserId] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getToken();
      const headers = { Authorization: `Bearer ${token}` };

      const [reqRes, usersRes] = await Promise.all([
         fetch('/api/requests', { headers }),
         fetch('/api/users', { headers })
      ]);

      if (!reqRes.ok || !usersRes.ok) throw new Error('Failed to fetch data (ensure you are an admin)');
      
      const reqData = await reqRes.json();
      const usersData = await usersRes.json();
      
      setRequests(reqData);
      setUsers(usersData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to permanently delete this user? This action cannot be undone.')) return;
    
    try {
      const token = await getToken();
      // Important: Use encodeURIComponent because Auth0 IDs contain pipes (|)
      const res = await fetch(`/api/users/${encodeURIComponent(userId)}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${token}` 
        }
      });
      
      if (res.ok) {
        setUsers(users.filter(u => u.id !== userId));
      } else {
        const err = await res.json().catch(() => ({ error: 'Non-JSON response from server' }));
        alert(`Error deleting user: ${err.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Delete User Failure:', err);
      alert(`Failed to delete user: ${err.message || 'Network error'}`);
    }
  };

  const handleRoleChange = async (userId, newRolesArray) => {
    try {
      // Optimistically update the UI
      setUsers(users.map(u => {
         if (u.id === userId) {
            return { ...u, publicMetadata: { ...u.publicMetadata, roles: newRolesArray } };
         }
         return u;
      }));

      const token = await getToken();
      const res = await fetch(`/api/users/${userId}/roles`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ roles: newRolesArray })
      });

      if (!res.ok) {
        throw new Error('Failed to update roles on backend');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to update roles. Please refresh and try again.');
      // Ideally we would revert the optimistic update here, simple refresh will do for admin
      fetchData();
    }
  };

  const handleApprove = async (id, email) => {
    try {
      const token = await getToken();
      const res = await fetch('/api/approve-request', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ id, email })
      });
      if (res.ok) {
        setRequests(requests.filter(req => req.id !== id));
        fetchData(); // Immediately refresh the Provisioned Accounts list
      } else {
        const err = await res.json();
        alert(`Error approving: ${err.error}`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeny = async (id) => {
    try {
      const token = await getToken();
      const res = await fetch('/api/deny-request', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        setRequests(requests.filter(req => req.id !== id));
      }
    } catch (err) {
      console.error(err);
    }
  };
  return (
    <Layout navItems={navItems} activeItemId={activeTab} onNavigate={handleNavClick}>
      <div className="mb-6 border-b border-zinc-800 pb-4 flex items-end justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-zinc-500 text-sm mt-1">Overview of system metrics and access controls</p>
          </div>
          <Link to="/dashboard" className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-md text-sm font-medium transition-colors ml-4 border border-zinc-700">
            View User Dashboard
          </Link>
        </div>
      </div>

      {activeTab === 'metrics' ? (
        <div className="mb-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {accessToken ? (
            <SystemMetrics token={accessToken} />
          ) : (
            <div className="text-zinc-500 text-sm animate-pulse">Loading metrics...</div>
          )}
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                  Auth0 Waitlist Requests
              </h2>
              <span className="bg-electric-blue/10 text-electric-blue text-xs px-2.5 py-1 rounded-full border border-electric-blue/20 font-medium">
                 {requests.length} Pending
              </span>
            </div>
            <button 
              onClick={fetchData}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors border border-zinc-700"
            >
              <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {loading ? 'Refreshing...' : 'Refresh Data'}
            </button>
          </div>

        {loading ? (
          <div className="text-zinc-500 text-sm animate-pulse">Loading data...</div>
        ) : error ? (
          <div className="text-red-400 text-sm bg-red-400/10 p-4 rounded-xl border border-red-400/20">{error}</div>
        ) : (
          <div className="space-y-10">
            {/* Waitlist Table */}
            <div>
               <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                 Pending Approvals <span className="bg-electric-blue/20 text-electric-blue px-2 py-0.5 rounded-full text-xs">{requests.length}</span>
               </h3>
               {requests.length === 0 ? (
                 <div className="text-zinc-500 text-sm italic glass-panel hover-glow cursor-default p-6 text-center rounded-2xl border border-dashed border-zinc-800 flex flex-col items-center">
                    <Mail className="opacity-20 mb-2" size={24} />
                    Waitlist is clear.
                 </div>
               ) : (
                  <div className="glass-panel border border-glass-border rounded-2xl shadow-xl overflow-visible">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[560px] text-left text-sm text-zinc-400">
                      <thead className="bg-zinc-900/50 text-zinc-300">
                        <tr>
                          <th className="px-6 py-4 font-medium border-b border-zinc-800">User / Username</th>
                          <th className="px-6 py-4 font-medium border-b border-zinc-800">Requested On</th>
                          <th className="px-6 py-4 font-medium border-b border-zinc-800 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {requests.map((req) => (
                          <tr key={req.id} className="border-b border-zinc-800/50 hover:bg-white/5 transition-colors">
                            <td className="px-6 py-4 flex flex-col">
                               <div className="flex items-center gap-2">
                                 <span className="font-medium text-white">{req.firstName} {req.lastName}</span>
                                 <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded border border-zinc-700">@{req.username}</span>
                               </div>
                               <span className="text-[10px] text-zinc-500">{req.emailAddress}</span>
                            </td>
                            <td className="px-6 py-4 text-zinc-400">
                               {new Date(req.createdAt).toLocaleDateString()} at {new Date(req.createdAt).toLocaleTimeString()}
                            </td>
                            <td className="px-6 py-4 flex justify-end gap-2">
                               <button 
                                  onClick={() => handleDeny(req.id)}
                                  className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                                  title="Deny Access"
                               >
                                  <X size={18} />
                               </button>
                               <button 
                                  onClick={() => handleApprove(req.id, req.emailAddress)}
                                  className="px-4 py-1.5 flex items-center gap-2 bg-electric-blue/10 text-electric-blue border border-electric-blue/30 hover:bg-electric-blue/20 rounded-lg transition-colors font-medium shadow-[0_0_10px_rgba(0,240,255,0.1)]"
                                  title="Approve & Send Email Invite"
                               >
                                  <Check size={16} /> Approve
                               </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      </table>
                    </div>
                  </div>
               )}
            </div>

            {/* Existing Users Table */}
            <div>
               <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                 Provisioned Accounts <span className="bg-cyber-purple/20 text-cyber-purple px-2 py-0.5 rounded-full text-xs">{users.length}</span>
               </h3>
               {users.length === 0 ? (
                 <div className="text-zinc-500 text-sm italic glass-panel hover-glow cursor-default p-6 text-center rounded-2xl border border-dashed border-zinc-800 flex flex-col items-center">
                    <Users className="opacity-20 mb-2" size={24} />
                    No registered users yet.
                 </div>
               ) : (
                  <div className="glass-panel border border-glass-border rounded-2xl shadow-xl overflow-visible flex flex-col min-h-[300px]">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[560px] text-left text-sm text-zinc-400">
                        <thead>
                          <tr className="bg-zinc-900/50 text-zinc-300">
                            <th className="px-6 py-4 font-medium border-b border-zinc-800">User / Email</th>
                            <th className="px-6 py-4 font-medium border-b border-zinc-800">Role</th>
                            <th className="px-6 py-4 font-medium border-b border-zinc-800 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {users.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((u) => {
                            const primaryEmail = u.emailAddresses.find(e => e.id === u.primaryEmailAddressId)?.emailAddress || 'No Email';
                            const legacyRole = u.publicMetadata?.role;
                            const rolesArray = Array.isArray(u.publicMetadata?.roles) ? u.publicMetadata.roles : (legacyRole ? [legacyRole] : ['user']);
                            const isAdmin = rolesArray.includes('admin') || legacyRole === 'admin';
                            
                            const isOpen = openDropdownUserId === u.id;
                          
                            return (
                              <tr key={u.id} className={`border-b border-zinc-800/50 hover:bg-white/5 transition-colors relative ${isOpen ? 'z-50' : 'z-0'}`}>
                                <td className="px-6 py-4 flex items-center gap-3">
                                   <img src={u.imageUrl} alt="Avatar" className="w-8 h-8 rounded-full border border-zinc-700" />
                                   <div>
                                     <div className="font-medium text-white flex items-center gap-2">
                                       {u.firstName} {u.lastName}
                                       <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded border border-zinc-700">@{u.username}</span>
                                     </div>
                                     <div className="text-xs text-zinc-500">{primaryEmail}</div>
                                   </div>
                                </td>
                                <td className="px-6 py-4">
                                   <CustomRoleSelect 
                                      user={u} 
                                      currentRoles={rolesArray} 
                                      isAdmin={isAdmin} 
                                      onRoleChange={handleRoleChange} 
                                      isOpen={isOpen}
                                      onToggle={setOpenDropdownUserId}
                                   />
                                </td>
                                <td className="px-6 py-4 flex justify-end">
                                   <button 
                                      onClick={() => handleDeleteUser(u.id)}
                                      className="p-2 text-zinc-500 hover:text-red-400 transition-colors"
                                      title="Revoke Access"
                                      disabled={isAdmin}
                                   >
                                      <X size={18} className={isAdmin ? 'opacity-30' : ''} />
                                   </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination Controls */}
                    {users.length > pageSize && (
                      <div className="px-6 py-4 border-t border-zinc-800/50 bg-zinc-900/10 flex items-center justify-between">
                        <div className="text-xs text-zinc-500">
                          Showing <span className="text-zinc-300">{(currentPage - 1) * pageSize + 1}</span> to <span className="text-zinc-300">{Math.min(currentPage * pageSize, users.length)}</span> of <span className="text-zinc-300">{users.length}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-30 transition-all text-zinc-400 hover:text-white"
                          >
                            <ChevronLeft size={16} />
                          </button>
                          
                          <div className="text-xs font-medium text-zinc-300 px-2 min-w-[50px] text-center">
                            Page {currentPage} of {Math.ceil(users.length / pageSize)}
                          </div>

                          <button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(users.length / pageSize)))}
                            disabled={currentPage >= Math.ceil(users.length / pageSize)}
                            className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-30 transition-all text-zinc-400 hover:text-white"
                          >
                            <ChevronRight size={16} />
                          </button>
                        </div>
                      </div>
                    )}
                 </div>
               )}
            </div>
          </div>
        )}
        </div>
      )}
    </Layout>
  )
}
