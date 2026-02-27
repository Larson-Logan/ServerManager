import React, { useState } from 'react'
import { Layout } from '../components/Layout'
import { BookOpen, Map, MessageSquare, Compass, Rocket, Server } from 'lucide-react'
import { useAuth0 } from '@auth0/auth0-react'

export function Dashboard() {
  const [activeTab, setActiveTab] = useState('hub');
  
  const { user } = useAuth0();
  const userRoles = user?.['https://larsonserver.ddns.net/roles'] || [];
  console.log('Dashboard User Roles:', userRoles);
  
  const isServerManager = userRoles.includes('server_manager') || userRoles.includes('admin');
  
  const navItems = [
    { id: 'hub', label: 'Launch Hub', icon: Rocket },
    { id: 'explore', label: 'Explore', icon: Compass }
  ];

  if (isServerManager) {
    navItems.push({ id: 'external-amp', label: 'Manage Server', icon: Server });
  }

  const handleNavClick = (id) => {
    if (id === 'external-amp') {
      window.open('http://manage.larsonserver.ddns.net', '_blank');
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <a href="#" className="glass-panel p-6 rounded-2xl border border-zinc-800/50 hover:border-zinc-700 transition-colors group cursor-pointer">
            <div className="h-10 w-10 rounded-lg bg-electric-blue/10 flex items-center justify-center mb-4 group-hover:bg-electric-blue/20 transition-colors border border-electric-blue/20">
              <BookOpen size={20} className="text-electric-blue" />
            </div>
            <h3 className="font-semibold text-white mb-2">Documentation</h3>
            <p className="text-sm text-zinc-400">Read the documentation and learn how to use the platform.</p>
          </a>

          <a href="#" className="glass-panel p-6 rounded-2xl border border-zinc-800/50 hover:border-zinc-700 transition-colors group cursor-pointer">
            <div className="h-10 w-10 rounded-lg bg-cyber-purple/10 flex items-center justify-center mb-4 group-hover:bg-cyber-purple/20 transition-colors border border-cyber-purple/20">
              <Map size={20} className="text-cyber-purple" />
            </div>
            <h3 className="font-semibold text-white mb-2">Roadmap</h3>
            <p className="text-sm text-zinc-400">View upcoming features and track our development progress.</p>
          </a>

          <a href="#" className="glass-panel p-6 rounded-2xl border border-zinc-800/50 hover:border-zinc-700 transition-colors group cursor-pointer">
            <div className="h-10 w-10 rounded-lg bg-zinc-800 flex items-center justify-center mb-4 group-hover:bg-zinc-700 transition-colors border border-zinc-700">
              <MessageSquare size={20} className="text-zinc-300" />
            </div>
            <h3 className="font-semibold text-white mb-2">Community Forum</h3>
            <p className="text-sm text-zinc-400">Join the discussion and connect with other users.</p>
          </a>
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
           {/* Placeholder for future explore sections */}
           <div className="text-zinc-500 text-sm italic glass-panel p-8 text-center rounded-2xl flex flex-col items-center">
             <Compass className="opacity-20 mb-3" size={32} />
             More applications coming soon.
           </div>
        </div>
      )}
    </Layout>
  )
}
