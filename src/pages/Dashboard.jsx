import React, { useState, useEffect } from 'react'
import { Layout } from '../components/Layout'
import { BookOpen, Map, MessageSquare, Compass, Rocket, Server, Shield, Dices } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'

export function Dashboard() {
  const [activeTab, setActiveTab] = useState('hub');
  const navigate = useNavigate();
  
  const { getAccessTokenSilently } = useAuth0();
  const [userRoles, setUserRoles] = useState([]);

  useEffect(() => {
    async function fetchRoles() {
      try {
        const token = await getAccessTokenSilently();
        const res = await fetch('/api/me', { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) {
          const data = await res.json();
          setUserRoles(data.roles || []);
        }
      } catch (err) {
        console.error('Dashboard: failed to fetch roles', err);
      }
    }
    fetchRoles();
  }, [getAccessTokenSilently]);

  // Dynamic tab title
  useEffect(() => {
    const titles = { hub: 'Dashboard', explore: 'Explore' };
    document.title = `${titles[activeTab] || 'Dashboard'} | LarsonServer`;
  }, [activeTab]);

  const isServerManager = userRoles.includes('server_manager') || userRoles.includes('admin');
  
  const navItems = [
    { id: 'hub', label: 'Launch Hub', icon: Rocket },
    { id: 'explore', label: 'Explore', icon: Compass }
  ];

  if (userRoles.includes('admin')) {
    navItems.push({ id: 'admin-panel', label: 'Admin Panel', icon: Shield });
  }

  const handleAMPLaunch = async () => {
    try {
      const token = await getAccessTokenSilently();
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
  };

  const handleNavClick = async (id) => {
    if (id === 'admin-panel') {
      navigate('/admin');
      return;
    }

    setActiveTab(id);
  };

  return (
    <Layout navItems={navItems} activeItemId={activeTab} onNavigate={handleNavClick}>
      <div className="mb-6 border-b border-zinc-800 pb-4">
        <h1 className="text-2xl font-bold">User Hub</h1>
        <p className="text-zinc-500 text-sm mt-1">Welcome! Launch your applications below.</p>
      </div>

      {activeTab === 'hub' ? (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <a href="#" className="glass-panel p-6 rounded-2xl hover-glow group cursor-pointer block">
              <div className="h-10 w-10 rounded-xl bg-electric-blue/10 flex items-center justify-center mb-4 group-hover:bg-electric-blue/20 transition-all border border-electric-blue/20 shadow-[0_0_15px_rgba(0,240,255,0.1)]">
                <BookOpen size={20} className="text-electric-blue group-hover:drop-shadow-[0_0_8px_rgba(0,240,255,0.8)] transition-all" />
              </div>
              <h3 className="font-semibold text-white mb-2 group-hover:text-electric-blue transition-colors">Documentation</h3>
              <p className="text-sm text-zinc-400">Read the documentation and learn how to use the platform.</p>
            </a>

            <a href="#" className="glass-panel p-6 rounded-2xl hover-glow group cursor-pointer block">
              <div className="h-10 w-10 rounded-xl bg-cyber-purple/10 flex items-center justify-center mb-4 group-hover:bg-cyber-purple/20 transition-all border border-cyber-purple/20 shadow-[0_0_15px_rgba(176,38,255,0.1)]">
                <Map size={20} className="text-cyber-purple group-hover:drop-shadow-[0_0_8px_rgba(176,38,255,0.8)] transition-all" />
              </div>
              <h3 className="font-semibold text-white mb-2 group-hover:text-cyber-purple transition-colors">Roadmap</h3>
              <p className="text-sm text-zinc-400">View upcoming features and track our development progress.</p>
            </a>

            <a href="#" className="glass-panel p-6 rounded-2xl hover-glow group cursor-pointer block">
              <div className="h-10 w-10 rounded-xl bg-zinc-800/80 flex items-center justify-center mb-4 group-hover:bg-zinc-700 transition-all border border-zinc-700">
                <MessageSquare size={20} className="text-zinc-300" />
              </div>
              <h3 className="font-semibold text-white mb-2">Community Forum</h3>
              <p className="text-sm text-zinc-400">Join the discussion and connect with other users.</p>
            </a>
          </div>

        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {isServerManager && (
              <div 
                onClick={handleAMPLaunch}
                className="glass-panel p-6 rounded-2xl hover-glow group cursor-pointer block border-electric-blue/10 hover:border-electric-blue/30"
              >
                <div className="h-10 w-10 rounded-xl bg-electric-blue/10 flex items-center justify-center mb-4 group-hover:bg-electric-blue/20 transition-all border border-electric-blue/20 shadow-[0_0_15px_rgba(0,240,255,0.1)]">
                  <Server size={20} className="text-electric-blue group-hover:drop-shadow-[0_0_8px_rgba(0,240,255,0.8)] transition-all" />
                </div>
                <h3 className="font-semibold text-white mb-2 group-hover:text-electric-blue transition-colors">Manage Server</h3>
                <p className="text-sm text-zinc-400">Access the AMP console to manage game instances and files.</p>
              </div>
            )}

            <a href="https://foundry.larsonserver.ddns.net" target="_blank" rel="noopener noreferrer" className="glass-panel p-6 rounded-2xl hover-glow group cursor-pointer block border-orange-500/10 hover:border-orange-500/30">
              <div className="h-10 w-10 rounded-xl bg-orange-500/10 flex items-center justify-center mb-4 group-hover:bg-orange-500/20 transition-all border border-orange-500/20 shadow-[0_0_15px_rgba(249,115,22,0.1)]">
                <Dices size={20} className="text-orange-500 group-hover:drop-shadow-[0_0_8px_rgba(249,115,22,0.8)] transition-all" />
              </div>
              <h3 className="font-semibold text-white mb-2 group-hover:text-orange-500 transition-colors">Foundry VTT</h3>
              <p className="text-sm text-zinc-400">Launch Foundry Virtual Tabletop for your roleplaying campaigns.</p>
            </a>
          </div>
        </div>
      )}
    </Layout>
  )
}
