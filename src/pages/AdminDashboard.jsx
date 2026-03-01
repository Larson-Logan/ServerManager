import React, { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Layout } from '../components/Layout'
import { SystemMetrics } from '../components/SystemMetrics'
import { Check, X, Clock, Mail, Activity, Users, Monitor as MonitorIcon, ChevronLeft, ChevronRight, Shield, Globe, History, Plus, AlertCircle, RefreshCw } from 'lucide-react'
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

// ── Activity Heatmap Component ───────────────────────────────────────────────
const ActivityHeatmap = ({ data = {} }) => {
  const days = 91; // 13 weeks
  const today = new Date();
  const cells = [];

  for (let i = days; i >= 0; i--) {
     const date = new Date(today);
     date.setDate(today.getDate() - i);
     const dateStr = date.toISOString().split('T')[0];
     const count = data[dateStr] || 0;
     
     // Determine color based on intensity
     let color = 'bg-zinc-800/50';
     if (count > 0 && count < 3) color = 'bg-cyber-purple/20';
     else if (count >= 3 && count < 6) color = 'bg-cyber-purple/50';
     else if (count >= 6) color = 'bg-cyber-purple';
     
     cells.push({ date: dateStr, count, color });
  }

  return (
    <div className="glass-panel p-6 border border-glass-border rounded-2xl">
      <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2">
        <Activity size={14} className="text-cyber-purple" /> User Activity (90 Days)
      </h3>
      <div className="flex flex-wrap gap-1.5 justify-center">
        {cells.map((cell, idx) => (
          <div 
            key={idx}
            title={`${cell.date}: ${cell.count} events`}
            className={`w-3 h-3 rounded-sm ${cell.color} transition-all hover:scale-125 cursor-help`}
          />
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between text-[10px] text-zinc-500">
        <span>{cells[0]?.date}</span>
        <div className="flex items-center gap-2">
           <span>Less</span>
           <div className="flex gap-1">
              <div className="w-2 h-2 rounded-sm bg-zinc-800/50" />
              <div className="w-2 h-2 rounded-sm bg-cyber-purple/20" />
              <div className="w-2 h-2 rounded-sm bg-cyber-purple/50" />
              <div className="w-2 h-2 rounded-sm bg-cyber-purple" />
           </div>
           <span>More</span>
        </div>
        <span>Today</span>
      </div>
    </div>
  );
};

// ── Service Health Component ─────────────────────────────────────────────────
const ServiceHealth = ({ services = [], onRefresh }) => {
  return (
    <div className="glass-panel p-6 border border-glass-border rounded-2xl">
       <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
             <Globe size={14} className="text-electric-blue" /> Service Health
          </h3>
          <button 
            onClick={onRefresh}
            className="p-1 hover:bg-white/5 rounded transition-colors text-zinc-500 hover:text-white"
          >
             <RefreshCw size={14} />
          </button>
       </div>
       <div className="space-y-3">
          {services.map(s => (
            <div key={s.name} className="flex items-center justify-between group">
               <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${s.online ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]'}`} />
                  <span className="text-sm font-medium text-zinc-300 group-hover:text-white transition-colors">{s.name}</span>
               </div>
               <div className="text-[10px] font-mono text-zinc-500">
                  {s.latency ? `${s.latency}ms` : s.online ? 'Online' : 'Offline'}
               </div>
            </div>
          ))}
          {services.length === 0 && (
             <div className="text-xs text-zinc-500 italic text-center py-2">Polling services...</div>
          )}
       </div>
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
    { id: 'users', label: 'Users', icon: Users },
    { id: 'roles', label: 'Roles', icon: Shield },
    { id: 'audit', label: 'Audit Log', icon: History },
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
  const [auditLogs, setAuditLogs] = useState([]);
  const [serviceStatus, setServiceStatus] = useState([]);
  const [heatmapData, setHeatmapData] = useState({});
  const [availableRolesList, setAvailableRolesList] = useState([]);
  const [editingRole, setEditingRole] = useState(null);
  const [rolePermissions, setRolePermissions] = useState([]);
  const [availablePermissions, setAvailablePermissions] = useState([]);
  const [syncing, setSyncing] = useState(false);

  const fetchExtendedData = useCallback(async () => {
    try {
      const token = await getToken();
      
      // Fetch Audit Logs
      const auditRes = await fetch('/api/admin/audit-log', { headers: { Authorization: `Bearer ${token}` } });
      if (auditRes.ok) setAuditLogs(await auditRes.json());

      // Fetch Service Status
      const statusRes = await fetch('/api/admin/status', { headers: { Authorization: `Bearer ${token}` } });
      if (statusRes.ok) setServiceStatus(await statusRes.json());

      // Fetch Stats for Heatmap
      const statsRes = await fetch('/api/admin/stats', { headers: { Authorization: `Bearer ${token}` } });
      if (statsRes.ok) {
         const data = await statsRes.json();
         setHeatmapData(data.heatmap || {});
      }

      // Fetch All Available Roles
      const rolesRes = await fetch('/api/admin/roles', { headers: { Authorization: `Bearer ${token}` } });
      if (rolesRes.ok) setAvailableRolesList(await rolesRes.json());

      // Fetch Global Permissions
      const permsRes = await fetch('/api/admin/permissions', { headers: { Authorization: `Bearer ${token}` } });
      if (permsRes.ok) setAvailablePermissions(await permsRes.ok ? await permsRes.json() : []);

    } catch (err) {
      console.error('[ExtendedDataFetch] Error:', err);
    }
  }, [getToken]);

  const handleSyncDefaults = async () => {
    setSyncing(true);
    try {
      const token = await getToken();
      const res = await fetch('/api/admin/roles/seed', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        alert('Sync complete: ' + data.results.join(', '));
        fetchExtendedData();
      } else {
        alert('Sync failed: ' + (data.error || 'Unknown error') + '\n\nTIP: Check your Auth0 Management API Application permissions for create:roles scope.');
      }
    } catch (err) {
      console.error('Sync failed:', err);
      alert('Network error during sync.');
    } finally {
      setSyncing(false);
    }
  };

  const handleEditRole = async (role) => {
    setEditingRole(role);
    try {
      const token = await getToken();
      const res = await fetch(`/api/admin/roles/${role.id}/permissions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setRolePermissions(await res.json());
    } catch (err) {
      console.error('Permissions fetch failed:', err);
    }
  };

  const handleUpdateRole = async (e) => {
    e.preventDefault();
    const name = e.target.roleName.value;
    const description = e.target.roleDesc.value;
    try {
      const token = await getToken();
      const res = await fetch(`/api/admin/roles/${editingRole.id}`, {
        method: 'PATCH',
        headers: { 
           'Content-Type': 'application/json',
           'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name, description })
      });
      if (res.ok) {
         setEditingRole(null);
         fetchExtendedData();
      }
    } catch (err) {
      console.error('Update failed:', err);
    }
  };

  const togglePermission = async (permissionName, hasPermission) => {
    try {
      const token = await getToken();
      const res = await fetch(`/api/admin/roles/${editingRole.id}/permissions`, {
        method: 'POST',
        headers: { 
           'Content-Type': 'application/json',
           'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          permissions: [permissionName],
          action: hasPermission ? 'remove' : 'associate'
        })
      });
      if (res.ok) {
        // Refresh local perms
        const permsRes = await fetch(`/api/admin/roles/${editingRole.id}/permissions`, {
           headers: { Authorization: `Bearer ${token}` }
        });
        if (permsRes.ok) setRolePermissions(await permsRes.json());
      }
    } catch (err) {
      console.error('Toggle permission failed:', err);
    }
  };


  useEffect(() => {
     if (activeTab === 'metrics' || activeTab === 'audit' || activeTab === 'roles') {
        fetchExtendedData();
     }
  }, [activeTab, fetchExtendedData]);

  const handleCreateRole = async (e) => {
    e.preventDefault();
    const name = e.target.roleName.value;
    const description = e.target.roleDesc.value;
    
    try {
      const token = await getToken();
      const res = await fetch('/api/admin/roles', {
        method: 'POST',
        headers: { 
           'Content-Type': 'application/json',
           'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name, description })
      });
      if (res.ok) {
         e.target.reset();
         fetchExtendedData();
      }
    } catch (err) {
      console.error('Role create failed:', err);
    }
  };

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
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
               <ActivityHeatmap data={heatmapData} />
               <ServiceHealth services={serviceStatus} onRefresh={fetchExtendedData} />
            </div>
            <SystemMetrics token={accessToken} />
          </>
        </div>
      ) : activeTab === 'roles' ? (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Left Column: Form (Create or Edit) */}
              <div className="md:col-span-1">
                 <div className="glass-panel p-6 border border-glass-border rounded-2xl sticky top-6">
                    <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
                       {editingRole ? <Shield size={16} className="text-cyber-purple" /> : <Plus size={16} className="text-electric-blue" />}
                       {editingRole ? 'Edit Role' : 'Create New Role'}
                    </h3>
                    <form onSubmit={editingRole ? handleUpdateRole : handleCreateRole} className="space-y-4">
                       <div>
                          <label className="block text-[10px] uppercase tracking-wider text-zinc-500 mb-1 ml-1">Role Name</label>
                          <input name="roleName" required defaultValue={editingRole?.name || ''} placeholder="e.g. Moderator" className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-electric-blue/50 transition-colors" />
                       </div>
                       <div>
                          <label className="block text-[10px] uppercase tracking-wider text-zinc-500 mb-1 ml-1">Description</label>
                          <textarea name="roleDesc" defaultValue={editingRole?.description || ''} placeholder="What can this role do?" rows={3} className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-electric-blue/50 transition-colors" />
                       </div>
                       
                       <div className="flex gap-2">
                          <button type="submit" className="flex-1 py-2 bg-electric-blue/10 hover:bg-electric-blue/20 text-electric-blue border border-electric-blue/30 rounded-xl text-sm font-bold transition-all">
                             {editingRole ? 'Save Changes' : 'Create Role'}
                          </button>
                          {editingRole && (
                             <button type="button" onClick={() => setEditingRole(null)} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 rounded-xl text-sm border border-zinc-700 transition-all">
                                Cancel
                             </button>
                          )}
                       </div>
                    </form>

                    {/* RBAC (Permissions) Section - Only when editing */}
                    {editingRole && (
                      <div className="mt-8 pt-6 border-t border-zinc-800/50">
                        <h4 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-4">Granular Permissions</h4>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                           {availablePermissions.map(p => {
                              const hasPerm = rolePermissions.some(rp => rp.permission_name === p.value);
                              return (
                                <button
                                  key={p.value}
                                  onClick={() => togglePermission(p.value, hasPerm)}
                                  className={`w-full flex items-center justify-between p-2 rounded-lg border transition-all text-left ${
                                    hasPerm 
                                    ? 'bg-cyber-purple/10 border-cyber-purple/30 text-cyber-purple' 
                                    : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:border-zinc-700'
                                  }`}
                                >
                                  <div className="flex flex-col">
                                    <span className="text-xs font-medium">{p.value}</span>
                                    <span className="text-[9px] opacity-60">{p.description}</span>
                                  </div>
                                  <div className={`w-3 h-3 rounded-full border flex items-center justify-center ${hasPerm ? 'bg-cyber-purple border-cyber-purple' : 'border-zinc-700'}`}>
                                     {hasPerm && <Check size={8} className="text-zinc-900 stroke-[4]" />}
                                  </div>
                                </button>
                              );
                           })}
                        </div>
                      </div>
                    )}
                 </div>
              </div>

              {/* Right Column: Role List */}
              <div className="md:col-span-2 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-900/40 p-4 rounded-2xl border border-zinc-800/50">
                    <div>
                       <h3 className="text-sm font-bold text-white flex items-center gap-2">
                          <Shield size={16} className="text-cyber-purple" /> Existing System Roles
                       </h3>
                       <p className="text-[10px] text-zinc-500 mt-1 uppercase tracking-wider">Fetched from Auth0 Management API</p>
                    </div>
                 </div>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {availableRolesList.map(role => (
                       <div 
                         key={role.id} 
                         onClick={() => handleEditRole(role)}
                         className={`glass-panel p-4 border rounded-2xl cursor-pointer transition-all hover:scale-[1.02] group ${
                           editingRole?.id === role.id 
                           ? 'border-cyber-purple shadow-[0_0_15px_rgba(176,38,255,0.2)]' 
                           : 'border-glass-border hover:border-zinc-700'
                         }`}
                       >
                          <div className="flex items-center justify-between mb-2">
                             <span className="text-sm font-bold text-white group-hover:text-cyber-purple transition-colors">{role.name}</span>
                             <Shield size={14} className={editingRole?.id === role.id ? 'text-cyber-purple' : 'text-zinc-500'} />
                          </div>
                          <p className="text-xs text-zinc-500 line-clamp-2">{role.description || 'No description provided.'}</p>
                       </div>
                    ))}
                    {availableRolesList.length === 0 && <div className="col-span-full py-12 text-center text-zinc-500 italic">No custom roles found.</div>}
                 </div>
              </div>
           </div>
        </div>
      ) : activeTab === 'audit' ? (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
           <div className="glass-panel border border-glass-border rounded-2xl shadow-xl overflow-hidden">
              <table className="w-full text-left text-sm text-zinc-400">
                 <thead className="bg-zinc-900/50 text-zinc-300 border-b border-zinc-800">
                    <tr>
                       <th className="px-6 py-4 font-medium">Time</th>
                       <th className="px-6 py-4 font-medium">Admin</th>
                       <th className="px-6 py-4 font-medium">Action</th>
                       <th className="px-6 py-4 font-medium text-right">Target</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-zinc-800/30">
                    {auditLogs.map((entry, idx) => (
                       <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-xs text-zinc-500">
                             {new Date(entry.timestamp).toLocaleString()}
                          </td>
                          <td className="px-6 py-4">
                             <div className="flex items-center gap-2">
                                <div className="w-5 h-5 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[10px] text-zinc-300">
                                   {entry.actor?.charAt(0).toUpperCase() || 'A'}
                                </div>
                                <span className="text-zinc-300">{entry.actor}</span>
                             </div>
                          </td>
                          <td className="px-6 py-4">
                             <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                entry.action.includes('DELETE') ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                entry.action.includes('CREATE') ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                                'bg-electric-blue/10 text-electric-blue border-electric-blue/20'
                             }`}>
                                {entry.action}
                             </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                             <code className="text-[10px] bg-zinc-900 px-1.5 py-0.5 rounded text-zinc-400 border border-zinc-800">{entry.target}</code>
                          </td>
                       </tr>
                    ))}
                    {auditLogs.length === 0 && (
                       <tr><td colSpan={4} className="px-6 py-12 text-center text-zinc-500 italic">No audit trail recorded yet.</td></tr>
                    )}
                 </tbody>
              </table>
           </div>
        </div>
      ) : ( // This 'else' now corresponds to activeTab === 'users'
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
                  <div className="glass-panel border border-glass-border rounded-2xl shadow-xl overflow-visible flex flex-col">
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
                              <tr key={u.id} className="border-b border-zinc-800/50 hover:bg-white/5 transition-colors">
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
