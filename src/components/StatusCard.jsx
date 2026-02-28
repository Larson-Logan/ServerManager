import React from 'react';

export function StatusCard({ title = "Placeholder Title" }) {
  return (
    <div className="glass-panel p-6 rounded-2xl hover-glow transition-all">
      <div className="font-semibold text-white mb-4 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-electric-blue animate-pulse"></div>
        {title}
      </div>
      
      <div className="text-sm text-zinc-400 bg-zinc-950/50 p-4 rounded-xl border border-zinc-800/50 shadow-inner">
        [Data Visualization / Metric Placeholder]
      </div>
    </div>
  );
}
