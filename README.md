# LarsonServer Web Portal & AMP Proxy

A custom, highly secure web dashboard and authentication proxy for managing a CubeCoders AMP (Application Management Panel) game server instance. Built with **React** (Vite), **Node.js** (Express), and **Auth0**.

## Features

- **Modern Dashboard UI:** A responsive, dark-themed dashboard built with React and Tailwind CSS.
- **Role-Based Access Control (RBAC):** Integrates tightly with Auth0 to provide dynamic `admin`, `manager`, `user`, and `waitlist` roles.
- **Admin Management Panel:** Real-time user management allowing admins to approve waitlisted users and mutate live roles directly via the Auth0 Management API.
- **Secure OIDC Proxy for AMP:** A custom Node.js backend that acts as the OIDC provider for CubeCoders AMP, completely restricting direct access to AMP.
- **Launch Token Security:** Users cannot simply browse to the Server Manager URL. They must launch it from the dashboard, which generates a short-lived, secure, `httpOnly` launch token required by the proxy to initiate the Auth0 handshake.

## Architecture

The project is split into two main parts:

1. **Frontend (`/src`)**: A React application served statically. Handles public views, the authenticated dashboard, admin panels, and user routing.
2. **Backend Proxy (`/server`)**: A Node.js Express server running on port `3001` (managed via PM2). It serves three critical functions:
   - Acting as a custom OIDC Identity Provider for AMP.
   - Securely fetching live Auth0 roles (bypassing stale JWT claims).
   - Validating the 2-minute "Launch Tokens" before allowing users to authenticate to AMP.

## Prerequisites

- Node.js v18+ 
- An active [Auth0](https://auth0.com/) tenant
- A running [CubeCoders AMP](https://cubecoders.com/AMP) instance configured for OIDC authentication.

## Environment Variables

### Backend (`/server/.env`)

```env
# Auth0 Tenant Application Credentials
AUTH0_DOMAIN=your-tenant.us.auth0.com
AUTH0_CLIENT_ID=your-client-id
AUTH0_CLIENT_SECRET=your-client-secret

# Node Express Port
PORT=3001
```

### Frontend (`/.env`)

```env
VITE_AUTH0_DOMAIN=your-tenant.us.auth0.com
VITE_AUTH0_CLIENT_ID=your-client-id
VITE_AUTH0_AUDIENCE=https://your-api-audience
```

## Setup & Local Development

1. **Install Dependencies**

   ```bash
   # Install frontend dependencies
   npm install

   # Install backend dependencies
   cd server && npm install
   ```

2. **Run the Backend Proxy**

   ```bash
   cd server
   node server.js
   ```

3. **Run the Frontend (Development)**

   ```bash
   # From the root directory
   npm run dev
   ```

## Production Deployment (Linux / PM2)

The application is designed to be served via Nginx with PM2 managing the Node backend.

1. **Build the Frontend**

   ```bash
   npm run build
   # The resulting /dist folder should be served by Nginx on port 80/443
   ```

2. **Start the Backend Proxy**

   ```bash
   cd server
   pm2 start server.js --name auth0-proxy
   pm2 save
   ```

3. **Configure Nginx**
   - Route `/` to the static `/dist` files.
   - Route `/api` and `/.well-known` to `http://localhost:3001`.

## Auth0 Configuration Details

- **Roles:** The application expects the Auth0 Management API to store roles under `app_metadata.roles`.
- **Connections:** By default, it supports Google Social Login and standard Username/Password (or passwordless depending on your Auth0 tier).
- **AMP Mapping:** The Node proxy automatically maps Auth0 roles into AMP Groups (e.g., `admin` -> `AMP_SuperAdmin`, `manager` -> `AMP_Instance Manager`).

## Security Note: AMP Local Logins

To enforce the Dashboard Launch system, **Local Logins must be disabled in AMP**. The proxy relies on AMP redirecting all unauthenticated traffic to the OIDC Flow, which the proxy then intercepts and blocks unless a valid launch token cookie (`amp_launch`) is present.
