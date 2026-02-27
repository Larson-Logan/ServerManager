import React from 'react'


import { useAuth0 } from '@auth0/auth0-react'

export function AdminLogin() {
  const { loginWithRedirect } = useAuth0();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 font-sans">
      <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-electric-blue/5 blur-[150px] pointer-events-none rounded-full" />
      <div className="absolute bottom-[-10%] left-[20%] w-[400px] h-[400px] bg-cyber-purple/5 blur-[150px] pointer-events-none rounded-full" />
      
      <div className="relative z-10 space-y-6 flex flex-col items-center">
         <h2 className="text-xl font-bold text-zinc-300">Admin Authorization Required</h2>
         <button 
           onClick={() => loginWithRedirect()}
           className="px-6 py-2 bg-indigo-600 text-white rounded font-medium hover:bg-indigo-700 transition"
         >
           Access Auth0 Login
         </button>
      </div>
    </div>
  )
}
