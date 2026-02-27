import React, { useState } from 'react'
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion'
import { Github, Twitter, Mail, ExternalLink, TerminalSquare, Check, X, Send } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth0 } from '@auth0/auth0-react'

export function PublicView() {
  const { isAuthenticated } = useAuth0();
  const [copied, setCopied] = useState(false);
  
  const handleCopyEmail = async (e) => {
    e.preventDefault();
    try {
      await navigator.clipboard.writeText('loganblarson@gmail.com');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy natively, using fallback:', err);
      // Fallback for non-https localhost
      const textArea = document.createElement("textarea");
      textArea.value = "loganblarson@gmail.com";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Fallback failed', err);
      }
      document.body.removeChild(textArea);
    }
  };
  const links = [
    { name: 'GitHub', url: 'https://github.com/Larson-Logan', icon: Github, color: 'group-hover:text-white', isAction: false },
    { name: copied ? 'Email Copied!' : 'Contact Me', url: '#', icon: copied ? Check : Mail, color: copied ? 'text-green-400' : 'group-hover:text-electric-blue', isAction: true, onClick: handleCopyEmail },
    { name: 'Login / Request Access', url: '/login', icon: TerminalSquare, color: 'group-hover:text-cyber-purple', isAction: false },
  ];

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 font-sans text-white overflow-hidden relative">
      {/* Ambient background glow */}
      <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-electric-blue/5 blur-[150px] pointer-events-none rounded-full" />
      <div className="absolute bottom-[-10%] left-[20%] w-[400px] h-[400px] bg-cyber-purple/5 blur-[150px] pointer-events-none rounded-full" />
      
      <main className="relative z-10 max-w-lg w-full px-6 flex flex-col items-center">
        
        {/* Profile Avatar / Logo */}
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, type: 'spring' }}
          className="relative mb-6"
        >
          <div className="h-28 w-28 rounded-full bg-gradient-to-tr from-cyber-purple to-electric-blue p-1 shadow-[0_0_30px_rgba(176,38,255,0.2)]">
            <div className="h-full w-full rounded-full bg-zinc-900 flex items-center justify-center border-4 border-zinc-950 overflow-hidden">
               {/* Placeholder Avatar Image - you can replace src later */}
               <img src="https://api.dicebear.com/7.x/notionists/svg?seed=Logan" alt="Profile" className="w-full h-full object-cover opacity-80" />
            </div>
          </div>
        </motion.div>

        {/* Bio */}
        <motion.div 
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="text-center mb-10"
        >
          <h1 className="text-3xl font-bold tracking-tight mb-2">Logan Larson</h1>
        </motion.div>

        {/* Links Grid */}
        <div className="w-full space-y-4">
          {links.map((link, idx) => (
            <motion.a
              key={link.name}
              href={link.url}
              onClick={link.isAction ? link.onClick : undefined}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 + (idx * 0.1), duration: 0.4 }}
              className="group glass-panel w-full p-4 rounded-2xl flex items-center justify-between transition-all duration-300 hover:scale-[1.02] hover:bg-white/5 border border-zinc-800/50 hover:border-zinc-700 cursor-pointer"
            >
              <div className="flex items-center gap-4">
                 <div className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 transition-colors">
                    <link.icon size={20} className={`text-zinc-400 transition-colors ${link.color}`} />
                 </div>
                 <span className={`font-medium transition-colors ${copied && link.name.includes('Copied') ? 'text-green-400' : 'text-zinc-200 group-hover:text-white'}`}>{link.name}</span>
              </div>
            </motion.a>
          ))}
        </div>
      </main>

      {/* Subtle Admin Footer */}
      <footer className="absolute bottom-6 w-full text-center z-10 flex flex-col items-center gap-4">
        {/* Only hide footer entirely if we are already logged in to Dashboard */}
        {!isAuthenticated && (
           <p className="text-xs text-zinc-600 font-mono tracking-wider">SECURE_NODE_01</p>
        )}
      </footer>
    </div>
  )
}
