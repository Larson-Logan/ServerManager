import React, { useEffect } from 'react'

import { Layout } from '../components/Layout'
import { Clock, Mail, ShieldAlert } from 'lucide-react'
import { useAuth0 } from '@auth0/auth0-react'

export function Waitlist() {
  const { user, logout } = useAuth0();

  useEffect(() => { document.title = 'Waitlist | LarsonServer'; }, []);


  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans flex items-center justify-center p-6">
      <div className="max-w-md w-full glass-panel p-8 rounded-3xl border border-zinc-800 shadow-2xl animate-in fade-in zoom-in duration-500 text-center">
        <div className="h-16 w-16 rounded-2xl bg-electric-blue/10 flex items-center justify-center mb-6 mx-auto border border-electric-blue/20">
          <Clock size={32} className="text-electric-blue animate-pulse" />
        </div>
        
        <h1 className="text-2xl font-bold mb-2">You're on the Waitlist</h1>
        <p className="text-zinc-400 mb-8">
          Thanks for joining, <span className="text-white font-medium">{user?.name || 'User'}</span>! Your account has been created, but it requires manual approval by an administrator before you can access the server dashboard.
        </p>

        <div className="space-y-4 mb-8 text-left">
          <div className="flex items-start gap-3 p-4 bg-zinc-900/50 rounded-xl border border-zinc-800">
            <Mail className="text-electric-blue mt-1" size={18} />
            <div>
              <p className="text-sm font-medium text-white">Check your Email</p>
              <p className="text-xs text-zinc-500">We'll send an invitation to <span className="text-zinc-300">{user?.email}</span> once you've been approved.</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3 p-4 bg-zinc-900/50 rounded-xl border border-zinc-800">
            <ShieldAlert className="text-cyber-purple mt-1" size={18} />
            <div>
              <p className="text-sm font-medium text-white">Status: Pending</p>
              <p className="text-xs text-zinc-500">Your current role is restricted to 'Waitlist' until further notice.</p>
            </div>
          </div>
        </div>

        <button 
          onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
          className="w-full py-3 px-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-semibold transition-all border border-zinc-700 hover:border-zinc-600"
        >
          Sign Out of Account
        </button>
        
        <p className="mt-6 text-xs text-zinc-600">
          Need help? Contact the server administrator directly.
        </p>
      </div>
    </div>
  )
}
