import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/clerk-react'
import { enUS } from '@clerk/localizations'
import './index.css'
import App from './App.jsx'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

if (!PUBLISHABLE_KEY) {
  throw new Error("Missing Clerk Publishable Key")
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ClerkProvider 
      publishableKey={PUBLISHABLE_KEY} 
      afterSignOutUrl="/"
      localization={{
        ...enUS,
        signIn: {
          ...enUS.signIn,
          start: {
            ...enUS.signIn.start,
            actionText__join_waitlist: "",
            actionLink__join_waitlist: "Request Access"
          }
        }
      }}
    >
      <App />
    </ClerkProvider>
  </StrictMode>,
)
