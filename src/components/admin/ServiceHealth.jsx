import React from 'react';
import { Globe, RefreshCw } from 'lucide-react';

export const ServiceHealth = ({ services = [], onRefresh }) => {
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
