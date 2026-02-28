import React, { useState, useEffect, useCallback } from 'react';
import { Cpu, HardDrive, MemoryStick, Activity, RefreshCw, Circle } from 'lucide-react';

function MetricBar({ value, color = 'electric-blue' }) {
  const colorMap = {
    'electric-blue': 'bg-electric-blue shadow-[0_0_8px_rgba(0,240,255,0.5)]',
    'cyber-purple': 'bg-cyber-purple shadow-[0_0_8px_rgba(176,38,255,0.5)]',
    'amber': 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]',
    'red': 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]',
  };
  const pct = Math.min(Math.max(value || 0, 0), 100);
  const barColor = pct >= 90 ? colorMap.red : pct >= 70 ? colorMap.amber : colorMap[color];
  return (
    <div className="w-full h-1.5 rounded-full bg-zinc-800/60 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ${barColor}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function PM2Badge({ status }) {
  const map = {
    online: { dot: 'bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.7)]', text: 'text-emerald-400', label: 'online' },
    stopped: { dot: 'bg-zinc-500', text: 'text-zinc-400', label: 'stopped' },
    errored: { dot: 'bg-red-500 animate-pulse', text: 'text-red-400', label: 'errored' },
  };
  const s = map[status] || map.stopped;
  return (
    <span className={`flex items-center gap-1.5 text-xs font-medium ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}

export function SystemMetrics({ token }) {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchMetrics = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/system', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setMetrics(await res.json());
        setLastUpdated(new Date());
      }
    } catch (err) {
      console.error('[SystemMetrics] fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 15000); // refresh every 15s
    return () => clearInterval(interval);
  }, [fetchMetrics]);

  if (loading) {
    return (
      <div className="glass-panel p-6 rounded-2xl border border-glass-border animate-pulse">
        <div className="h-4 w-32 bg-zinc-800 rounded mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[0, 1, 2].map(i => <div key={i} className="h-24 bg-zinc-800/50 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!metrics) return null;

  const { cpu, memory, disk, uptime, pm2 } = metrics;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
          <Activity size={14} className="text-electric-blue" />
          Live Server Status
        </h2>
        <button
          onClick={fetchMetrics}
          title="Refresh"
          className="p-1.5 rounded-lg text-zinc-600 hover:text-electric-blue hover:bg-electric-blue/10 transition-all"
        >
          <RefreshCw size={13} />
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

        {/* CPU */}
        <div className="glass-panel hover-glow p-5 rounded-2xl border border-glass-border flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-electric-blue/10 border border-electric-blue/20 flex items-center justify-center">
                <Cpu size={16} className="text-electric-blue" />
              </div>
              <span className="text-sm font-medium text-zinc-300">CPU</span>
            </div>
            <span className="text-2xl font-bold text-white tabular-nums">{cpu.loadPercent}%</span>
          </div>
          <MetricBar value={cpu.loadPercent} color="electric-blue" />
          <div className="text-xs text-zinc-500 flex justify-between">
            <span>{cpu.cores} cores</span>
            <span>Load: {cpu.loadAvg[0]} / {cpu.loadAvg[1]} / {cpu.loadAvg[2]}</span>
          </div>
        </div>

        {/* Memory */}
        <div className="glass-panel hover-glow p-5 rounded-2xl border border-glass-border flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-cyber-purple/10 border border-cyber-purple/20 flex items-center justify-center">
                <MemoryStick size={16} className="text-cyber-purple" />
              </div>
              <span className="text-sm font-medium text-zinc-300">Memory</span>
            </div>
            <span className="text-2xl font-bold text-white tabular-nums">{memory.usedPercent}%</span>
          </div>
          <MetricBar value={memory.usedPercent} color="cyber-purple" />
          <div className="text-xs text-zinc-500 flex justify-between">
            <span>{memory.usedGb} GB used</span>
            <span>{memory.totalGb} GB total</span>
          </div>
        </div>

        {/* Disk */}
        <div className="glass-panel hover-glow p-5 rounded-2xl border border-glass-border flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-amber-400/10 border border-amber-400/20 flex items-center justify-center">
                <HardDrive size={16} className="text-amber-400" />
              </div>
              <span className="text-sm font-medium text-zinc-300">Storage</span>
            </div>
            <span className="text-2xl font-bold text-white tabular-nums">
              {disk ? disk.usedPercent : '--'}%
            </span>
          </div>
          <MetricBar value={disk?.usedPercent} color="amber" />
          <div className="text-xs text-zinc-500 flex justify-between">
            <span>{disk ? `${disk.usedGb} GB used` : 'n/a'}</span>
            <span>{disk ? `${disk.totalGb} GB total` : ''}</span>
          </div>
        </div>
      </div>

      {/* PM2 Processes + Uptime */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* PM2 */}
        {pm2 && pm2.length > 0 && (
          <div className="glass-panel p-5 rounded-2xl border border-glass-border">
            <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Services</h3>
            <div className="space-y-2">
              {pm2.map(proc => (
                <div key={proc.name} className="flex items-center justify-between py-1.5 border-b border-zinc-800/50 last:border-0">
                  <div className="flex items-center gap-2">
                    <PM2Badge status={proc.status} />
                    <span className="text-sm text-zinc-200 font-medium">{proc.name}</span>
                  </div>
                  <div className="text-xs text-zinc-500 flex gap-3">
                    <span>{proc.cpu}% CPU</span>
                    <span>{proc.memory}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Uptime */}
        <div className="glass-panel p-5 rounded-2xl border border-glass-border flex flex-col justify-between">
          <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Server Uptime</h3>
          <div className="text-3xl font-bold text-white tracking-tight">{uptime?.human || '--'}</div>
          <div className="text-xs text-zinc-600 mt-2">
            Last refreshed: {lastUpdated ? lastUpdated.toLocaleTimeString() : 'never'}
          </div>
        </div>
      </div>
    </div>
  );
}
