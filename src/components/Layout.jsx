import { useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

// Shared sidebar content — used in both desktop sidebar and mobile drawer
function SidebarContent({ navItems, activeItemId, onNavigate, user, logout, onClose }) {
  const handleNav = (id) => {
    if (onClose) onClose();
    if (onNavigate) onNavigate(id);
  };

  return (
    <>
      <div className="font-bold text-xl mb-8 tracking-wider">SYS_CTRL</div>

      <nav className="flex-1 space-y-2 text-zinc-400">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleNav(item.id)}
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
          <a
            href="/"
            className="flex items-center gap-3 p-3 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800/50 rounded transition-colors group"
          >
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
          <Link
            to="/profile"
            onClick={onClose}
            className="w-full text-left px-3 py-2 text-zinc-400 hover:text-white hover:bg-zinc-800/50 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2"
          >
            <span>Manage Account</span>
          </Link>
          <button
            onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
            className="w-full text-left px-3 py-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg text-xs font-semibold transition-colors flex items-center gap-2"
          >
            <span>Sign Out</span>
          </button>
        </div>
      </div>
    </>
  );
}

export function Layout({ children, navItems = [], activeItemId, onNavigate }) {
  const { user, logout } = useAuth0();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen w-full bg-zinc-950 text-white font-sans">

      {/* ── DESKTOP SIDEBAR (hidden on mobile) ── */}
      <aside className="hidden md:flex w-64 h-full flex-col border-r border-zinc-800 bg-zinc-900 p-4">
        <SidebarContent
          navItems={navItems}
          activeItemId={activeItemId}
          onNavigate={onNavigate}
          user={user}
          logout={logout}
        />
      </aside>

      {/* ── MOBILE OVERLAY DRAWER ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-72 flex flex-col bg-zinc-900 border-r border-zinc-800 p-4 transform transition-transform duration-300 ease-in-out md:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Close button inside drawer */}
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
        >
          <X size={18} />
        </button>

        <SidebarContent
          navItems={navItems}
          activeItemId={activeItemId}
          onNavigate={onNavigate}
          user={user}
          logout={logout}
          onClose={() => setMobileOpen(false)}
        />
      </aside>

      {/* ── MAIN CONTENT ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

        {/* Mobile top bar (hidden on desktop) */}
        <header className="md:hidden flex items-center gap-4 px-4 py-3 border-b border-zinc-800 bg-zinc-900 shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
          >
            <Menu size={20} />
          </button>
          <span className="font-bold tracking-wider text-sm">SYS_CTRL</span>
          <img
            src={user?.picture}
            alt={user?.name}
            className="w-8 h-8 rounded-full border border-zinc-700 ml-auto"
          />
        </header>

        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto space-y-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
