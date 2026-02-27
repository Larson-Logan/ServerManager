/* eslint-env node */
/* eslint-disable no-undef */
// server.js
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const jwt = require('jsonwebtoken'); // For parsing incoming Auth0 tokens
const jwksClient = require('jwks-rsa'); // For verifying Auth0 JWT signatures
const { ManagementClient } = require('auth0');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN;
const AUTH0_CLIENT_ID = process.env.AUTH0_CLIENT_ID;
const AUTH0_CLIENT_SECRET = process.env.AUTH0_CLIENT_SECRET;

// ------------------------------------------------------------------
// Auth0 JWT Verification Middleware (Protects Admin Dashboard Routes)
// ------------------------------------------------------------------
const client = jwksClient({
  jwksUri: `https://${AUTH0_DOMAIN}/.well-known/jwks.json`
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, function(err, key) {
    if (err) {
      return callback(err);
    }
    const signingKey = key.publicKey || key.rsaPublicKey;
    callback(null, signingKey);
  });
}

// Middleware to ensure request has a valid Auth0 token
const requireAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid Authorization header' });
  }

  const token = authHeader.split(' ')[1];

  jwt.verify(token, getKey, {
    algorithms: ['RS256'],
    issuer: `https://${AUTH0_DOMAIN}/`,
    audience: process.env.AUTH0_AUDIENCE,
  }, (err, decoded) => {
    if (err) {
      console.error("JWT Verification failed:", err.message);
      return res.status(401).json({ error: 'Invalid token' });
    }
    req.user = decoded; // The decoded token payload (contains sub, claims, etc)
    next();
  });
};

// Middleware to ensure the user has the 'admin' role
const requireAdmin = (req, res, next) => {
  // We expect roles to be added to the token via an Auth0 Action as a custom claim.
  const customRolesClaim = `https://larsonserver.ddns.net/roles`;
  const roles = req.user[customRolesClaim] || [];

  if (!roles.includes('admin')) {
     return res.status(403).json({ error: 'Forbidden: Admin access only' });
  }
  next();
};

// ------------------------------------------------------------------
// Auth0 Management API Client (For Admin Dashboard Controls)
// ------------------------------------------------------------------
// Note: You must enable "Client Credentials" grant type on your Auth0 Application
// and give it access to the Auth0 Management API for this to work natively.
const management = new ManagementClient({
  domain: AUTH0_DOMAIN,
  clientId: AUTH0_CLIENT_ID,
  clientSecret: AUTH0_CLIENT_SECRET,
});

// ------------------------------------------------------------------
// OIDC PROXY ROUTE: /api/oidc/authorize
// CubeCoders AMP sends a broken OIDC request with an empty `state=`.
// We intercept it, generate a secure state, and forward them to Auth0.
// ------------------------------------------------------------------
app.get('/api/oidc/authorize', (req, res) => {
  try {
    const queryParams = { ...req.query };
    
    // Inject a cryptographically secure state if AMP forgot it
    if (!queryParams.state) {
        queryParams.state = crypto.randomBytes(8).toString('hex');
    }

    const searchParams = new URLSearchParams(queryParams);
    // Explicitly ask for standard OIDC scopes
    if (!searchParams.has('scope')) {
        searchParams.append('scope', 'openid profile email');
    }
    
    const auth0Url = `https://${AUTH0_DOMAIN}/authorize?${searchParams.toString()}`;
    
    console.log(`Intercepted AMP OIDC Login. Forwarding to Auth0 with state: ${queryParams.state}`);
    res.redirect(auth0Url);
  } catch (error) {
    console.error("OIDC Proxy Error:", error);
    res.status(500).send("Internal Server Error processing OIDC redirect.");
  }
});

// ------------------------------------------------------------------
// OIDC PROXY ROUTE: /api/oidc/token
// AMP exchanges the code for a token. We just pass this straight to Auth0.
// ------------------------------------------------------------------
app.post('/api/oidc/token', express.urlencoded({ extended: true }), async (req, res) => {
  try {
    // AMP sends this as x-www-form-urlencoded
    const formData = new URLSearchParams();
    for (const key in req.body) {
      formData.append(key, req.body[key]);
    }

    const tokenResponse = await fetch(`https://${AUTH0_DOMAIN}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString()
    });

    const data = await tokenResponse.json();
    return res.status(tokenResponse.status).json(data);
  } catch (err) {
    console.error("Token Exchange Error:", err);
    return res.status(500).json({ error: "Failed to exchange token" });
  }
});

// ------------------------------------------------------------------
// OIDC PROXY ROUTE: /api/oidc/userinfo
// AMP fetches this to figure out the user's role. Auth0 attaches custom roles to our `https://larsonserver.ddns.net/roles` namespace.
// We intercept this, fetch the Auth0 identity, map the custom role to AMP's "groups" array, and return it.
// ------------------------------------------------------------------
app.get('/api/oidc/userinfo', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Missing Authorization header" });

    const auth0Response = await fetch(`https://${AUTH0_DOMAIN}/userinfo`, {
      headers: { 'Authorization': authHeader }
    });

    if (!auth0Response.ok) {
      return res.status(auth0Response.status).json({ error: "Failed to fetch from Auth0" });
    }

    const userData = await auth0Response.json();

    // The AMP Role Mapping Logic
    // Grab the roles array we injected via an Auth0 Action
    const customRolesNamespace = 'https://larsonserver.ddns.net/roles';
    const auth0Roles = userData[customRolesNamespace] || [];

    userData.groups = [];
    
    if (auth0Roles.includes('admin') || auth0Roles.includes('server_manager')) {
       // If they are an Admin or Server Manager in our system, force AMP to make them a SuperAdmin.
       userData.groups.push("AMP_SuperAdmin", "AMP_Super Admins", "AMP_InstanceMgr");
    } else {
       // Regular users get nothing. AMP will deny them.
       userData.groups.push("Waitlist"); 
    }

    console.log(`Mapped UserInfo for ${userData.email}. Assigned to AMP Groups: ${userData.groups.join(', ')}`);
    res.json(userData);

  } catch (error) {
    console.error("UserInfo Proxy Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});


// ------------------------------------------------------------------
// Admin Dashboard API - Waitlist & User Management
// Auth0 doesn't have a native 'Waitlist' concept, but we simulate it 
// by assigning the 'waitlist' role in our custom namespace to users 
// who haven't been manually approved yet.
// ------------------------------------------------------------------

app.get('/api/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const users = await management.users.getAll();
    // Map Auth0 users to the expected frontend format
    const mappedUsers = users.data.map(u => ({
       id: u.user_id,
       firstName: u.given_name || u.name?.split(' ')[0] || 'Unknown',
       lastName: u.family_name || u.name?.split(' ')[1] || '',
       emailAddresses: [{ id: 'primary', emailAddress: u.email }],
       primaryEmailAddressId: 'primary',
       imageUrl: u.picture,
       publicMetadata: {
          roles: u.app_metadata?.roles || [] 
       }
    }));
    res.json(mappedUsers);
  } catch (error) {
    console.error("Auth0 Get Users Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Update a user's role
app.post('/api/users/:id/roles', requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { roles } = req.body;
  if (!id || !Array.isArray(roles)) return res.status(400).json({ error: 'ID and Roles array required' });

  try {
    await management.users.update({ id }, {
      app_metadata: { roles: roles }
    });
    console.log(`Successfully updated roles for user ${id} to: ${roles.join(', ')}`);
    res.json({ message: 'Roles updated successfully' });
  } catch (error) {
    console.error("Auth0 Roles Update Error:", error);
    res.status(500).json({ error: 'Failed to update user roles', details: error.message });
  }
});

// Mocking Requests since Auth0 natively drops everyone into the Database pool immediately via social logins
app.get('/api/requests', requireAuth, requireAdmin, async (req, res) => {
   // To simulate a waitlist, we could fetch users who have `app_metadata.roles = ['waitlist']`
   // But for now, we just return an empty array and use the main `users` table to assign roles.
   res.json([]); 
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Backend proxy running locally on http://localhost:${PORT}`);
});
