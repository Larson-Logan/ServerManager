import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Check } from 'lucide-react';

export const CustomRoleSelect = ({ user, currentRoles, isAdmin, onRoleChange, isOpen, onToggle }) => {
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
     if (isDisabled && roleId === 'admin') return; 
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
