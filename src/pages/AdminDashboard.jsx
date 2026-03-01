import React, { useState, useEffect, useCallback } from 'react'
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom'
import { Layout } from '../components/Layout'
import { Activity, Users, Shield, History, Monitor as MonitorIcon } from 'lucide-react'
import { useAuth0 } from '@auth0/auth0-react'

export function AdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { getAccessTokenSilently: getToken } = useAuth0();

  // Determine active tab from URL path
  const currentPath = location.pathname;
  let activeTab = 'metrics';
  if (currentPath.includes('/admin/users')) activeTab = 'users';
  else if (currentPath.includes('/admin/roles')) activeTab = 'roles';
  else if (currentPath.includes('/admin/audit')) activeTab = 'audit';

  useEffect(() => { document.title = 'Admin Panel | LarsonServer'; }, []);

  const [accessToken, setAccessToken] = useState(null);

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
    // Logic for subpage navigation
    const path = id === 'metrics' ? '/admin' : `/admin/${id}`;
    navigate(path);
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

  const fetchExtendedData = useCallback(async () => {
    try {
      const token = await getToken();
      
      const auditRes = await fetch('/api/admin/audit-log', { headers: { Authorization: `Bearer ${token}` } });
      if (auditRes.ok) setAuditLogs(await auditRes.json());

      const statusRes = await fetch('/api/admin/status', { headers: { Authorization: `Bearer ${token}` } });
      if (statusRes.ok) setServiceStatus(await statusRes.json());

      const statsRes = await fetch('/api/admin/stats', { headers: { Authorization: `Bearer ${token}` } });
      if (statsRes.ok) {
         const data = await statsRes.json();
         setHeatmapData(data.heatmap || {});
      }

      const rolesRes = await fetch('/api/admin/roles', { headers: { Authorization: `Bearer ${token}` } });
      if (rolesRes.ok) setAvailableRolesList(await rolesRes.json());

      const permsRes = await fetch('/api/admin/permissions', { headers: { Authorization: `Bearer ${token}` } });
      if (permsRes.ok) setAvailablePermissions(await permsRes.json());

    } catch (err) {
      console.error('[ExtendedDataFetch] Error:', err);
    }
  }, [getToken]);

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
        fetch('/api/waitlist', { headers }),
        fetch('/api/admin/users', { headers })
      ]);

      if (reqRes.ok) setRequests(await reqRes.json());
      if (usersRes.ok) setUsers(await usersRes.json());
      
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Connection failed. Backend proxy might be down.');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    if (activeTab === 'users') fetchData();
  }, [activeTab, fetchData]);

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
        fetchData(); 
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRoleChange = async (userId, roles) => {
    try {
      const token = await getToken();
      const res = await fetch('/api/admin/users/roles', {
        method: 'POST',
        headers: { 
           'Content-Type': 'application/json',
           'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId, roles })
      });
      if (res.ok) {
        setUsers(users.map(u => u.id === userId ? { ...u, publicMetadata: { ...u.publicMetadata, roles } } : u));
      }
    } catch (err) {
      console.error('Role update failed:', err);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to revoke access? This deletes the user from Auth0.')) return;
    try {
      const token = await getToken();
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setUsers(users.filter(u => u.id !== userId));
      }
    } catch (err) {
      console.error('Delete failed:', err);
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

  // State to pass to subpages via context
  const contextValue = {
    accessToken,
    requests,
    users,
    currentPage,
    setCurrentPage,
    pageSize,
    loading,
    error,
    openDropdownUserId,
    setOpenDropdownUserId,
    auditLogs,
    serviceStatus,
    heatmapData,
    availableRolesList,
    editingRole,
    setEditingRole,
    rolePermissions,
    availablePermissions,
    fetchExtendedData,
    fetchData,
    handleEditRole,
    handleUpdateRole,
    togglePermission,
    handleCreateRole,
    handleApprove,
    handleDeny,
    handleDeleteUser,
    handleRoleChange
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

      <Outlet context={contextValue} />
    </Layout>
  )
}
