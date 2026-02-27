import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';

export function Layout({ children, navItems = [], activeItemId, onNavigate }) {
  const { user, logout } = useAuth0();

  return (
    <div className="flex h-screen w-full bg-zinc-950 text-white font-sans">
      {/* 
        Persistent Sidebar 
        Dynamically renders navigation items passed from the parent page.
      */}
      <aside className="w-64 h-full flex flex-col border-r border-zinc-800 bg-zinc-900 p-4">
        <div className="font-bold text-xl mb-8 tracking-wider">SYS_CTRL</div>
        
        <nav className="flex-1 space-y-2 text-zinc-400">
          {navItems.map((item) => (
             <button
                key={item.id}
                onClick={() => onNavigate && onNavigate(item.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg text-sm font-medium transition-all text-left ${
                   activeItemId === item.id 
                     ? 'bg-zinc-800 text-white border border-zinc-700 shadow-sm' 
                     : 'hover:bg-zinc-800/50 hover:text-zinc-300 border border-transparent'
                }`}
             >
                {item.icon && <item.icon size={18} className={activeItemId === item.id ? 'text-electric-blue' : 'text-zinc-500'} />}
                {item.label}
             </button>
          ))}
          
          <div className="pt-4 mt-6 border-t border-zinc-800">
            <a href="/" className="flex items-center gap-3 p-3 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800/50 rounded transition-colors group">
              <span className="font-mono bg-zinc-800 px-2 py-0.5 rounded text-xs group-hover:bg-electric-blue/20 group-hover:text-electric-blue transition-colors">←</span>
              Back to Public Page
            </a>
          </div>
        </nav>

        <div className="mt-auto pt-4 border-t border-zinc-800">
          <div className="flex items-center gap-3 mb-4 p-2 bg-zinc-800/30 rounded-xl border border-zinc-800/50">
            <img 
               src={user?.picture} 
               alt={user?.name} 
               className="w-10 h-10 rounded-full border border-zinc-700 shadow-sm"
            />
            <div className="flex-1 min-w-0">
               <p className="text-sm font-medium text-white truncate">{user?.name}</p>
               <p className="text-[10px] text-zinc-500 truncate">{user?.email}</p>
            </div>
          </div>
          
          <div className="flex flex-col gap-2">
            <button 
               onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
               className="w-full text-left px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2"
            >
               <span>Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Dashboard Content gets injected here */}
          {children}
        </div>
      </main>
    </div>
  );
}
