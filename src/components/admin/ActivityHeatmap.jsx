import React from 'react';
import { Activity } from 'lucide-react';

export const ActivityHeatmap = ({ data = {} }) => {
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
