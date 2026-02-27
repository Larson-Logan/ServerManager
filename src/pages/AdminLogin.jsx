import React from 'react'
import { SignIn } from '@clerk/clerk-react'

export function AdminLogin() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 font-sans">
      {/* 
        This is an isolated route exactly for signing in.
      */}
      <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-electric-blue/5 blur-[150px] pointer-events-none rounded-full" />
      <div className="absolute bottom-[-10%] left-[20%] w-[400px] h-[400px] bg-cyber-purple/5 blur-[150px] pointer-events-none rounded-full" />
      
      <div className="relative z-10 space-y-6 flex flex-col items-center">
         <h2 className="text-xl font-bold text-zinc-300">Admin Authorization Required</h2>
         {/* Embed the SignIn component directly for a seamless experience */}
         <SignIn redirectUrl="/admin" />
      </div>
    </div>
  )
}
