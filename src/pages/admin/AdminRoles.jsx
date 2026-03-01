import React from 'react';
import { useOutletContext } from 'react-router-dom';
import { Shield, Plus, Check } from 'lucide-react';

export const AdminRoles = () => {
  const { 
    availableRolesList, 
    editingRole, 
    setEditingRole,
    rolePermissions, 
    availablePermissions, 
    handleEditRole, 
    handleUpdateRole, 
    handleCreateRole, 
    togglePermission 
  } = useOutletContext();

  return (
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
  );
};
