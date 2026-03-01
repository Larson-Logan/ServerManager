# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Development Tasks

- **Install Dependencies:**
  - Frontend: `npm install` (in the root directory)
  - Backend: Navigate to `server/` and run `npm install`

- **Run Frontend Development Server:**
  - `npm run dev`

- **Build Frontend for Production:**
  - `npm run build`

- **Lint Frontend Code:**
  - `npm run lint`

- **Preview Frontend Production Build Locally:**
  - `npm run preview`

- **Run Backend Server:**
  - Navigate to `server/` and run `node server.js`

## High-Level Code Architecture

The repository is structured into two main parts: a frontend React application and a Node.js Express backend server.

- **Frontend (`src/`):**
  - Built with React, Vite, and Tailwind CSS.
  - Handles public views, authenticated dashboards, admin panels, and user routing.
  - Production build output is located in `dist/`.
  - Static assets are in `public/`.

- **Backend Proxy (`server/`):**
  - A Node.js Express server.
  - Acts as a custom OIDC Identity Provider for CubeCoders AMP.
  - Securely fetches live Auth0 roles.
  - Validates 2-minute "Launch Tokens" before user authentication to AMP.

- **Key Technologies:**
  - **Auth0:** Used for role-based access control (RBAC) and authentication.
  - **CubeCoders AMP:** Integration for game server management.
  - **Vite:** Frontend build tool.
  - **ESLint:** Code linting.

- **Use this command to commit and push changes to the server:**

  ```bash
  cd "d:\github stuff\Webdev" && git add . && git commit -m "<commit message>" && git push && ssh root@192.168.86.249 "cd /var/www/larsonserver && git pull && npm run build && pm2 restart all"
  ```
