import React from 'react';
import { useOutletContext } from 'react-router-dom';

export const AdminAuditLog = () => {
  const { auditLogs } = useOutletContext();

  return (
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
  );
};
