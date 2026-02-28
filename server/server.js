/* eslint-env node */
/* eslint-disable no-undef */
// server.js
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
console.log(`>>> AUTH0 PROXY VERSION 2.3 STARTING - Domain: ${process.env.AUTH0_DOMAIN || 'UNDEFINED'} <<<`);
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const { ManagementClient } = require('auth0');

const app = express();
app.use(cors());
app.use(express.json());

const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN;
const AUTH0_CLIENT_ID = process.env.AUTH0_CLIENT_ID;
const AUTH0_CLIENT_SECRET = process.env.AUTH0_CLIENT_SECRET;

// Lazy JWKS client - created after env vars are confirmed loaded
function getJwksClient() {
  return jwksClient({
    jwksUri: `https://${AUTH0_DOMAIN}/.well-known/jwks.json`
  });
}

function getKey(header, callback) {
  getJwksClient().getSigningKey(header.kid, function(err, key) {
    if (err) return callback(err);
    const signingKey = key.publicKey || key.rsaPublicKey;
    callback(null, signingKey);
  });
}

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
    req.user = decoded;
    next();
  });
};

const requireAdmin = async (req, res, next) => {
  try {
    const userId = req.user.sub;
    const liveUser = await management.users.get({ id: userId });
    const roles = liveUser.data.app_metadata?.roles || [];
    if (!roles.includes('admin')) {
      return res.status(403).json({ error: 'Forbidden: Admin access only' });
    }
    next();
  } catch (err) {
    console.error('[requireAdmin] Failed to verify live roles:', err.message);
    return res.status(403).json({ error: 'Forbidden: Could not verify admin role' });
  }
};


const management = new ManagementClient({
  domain: AUTH0_DOMAIN,
  clientId: AUTH0_CLIENT_ID,
  clientSecret: AUTH0_CLIENT_SECRET,
});

// --- /api/me: returns LIVE roles from Auth0 (bypasses JWT claim cache) ---
app.get('/api/me', requireAuth, async (req, res) => {
  try {
    const userId = req.user.sub;
    const user = await management.users.get({ id: userId });
    const roles = user.data.app_metadata?.roles || [];
    res.json({ roles });
  } catch (error) {
    console.error('[/api/me] Error fetching live roles:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// --- OIDC Discovery Endpoint ---
app.get(['/.well-known/openid-configuration', '/api/oidc/.well-known/openid-configuration'], (req, res) => {
  console.log(`[OIDC Discovery] Request from ${req.ip}`);
  const baseUrl = `https://larsonserver.ddns.net/api/oidc`;
  res.json({
    issuer: `https://${AUTH0_DOMAIN}/`,
    authorization_endpoint: `${baseUrl}/authorize`,
    token_endpoint: `${baseUrl}/token`,
    userinfo_endpoint: `${baseUrl}/userinfo`,
    jwks_uri: `https://${AUTH0_DOMAIN}/.well-known/jwks.json`,
    response_types_supported: ["code", "id_token", "token id_token"],
    subject_types_supported: ["public"],
    id_token_signing_alg_values_supported: ["RS256"]
  });
});

app.get('/api/oidc/authorize', (req, res) => {
  try {
    const queryParams = { ...req.query };
    if (!queryParams.state) queryParams.state = crypto.randomBytes(8).toString('hex');
    const searchParams = new URLSearchParams(queryParams);
    if (!searchParams.has('scope')) searchParams.append('scope', 'openid profile email');
    const auth0Url = `https://${AUTH0_DOMAIN}/authorize?${searchParams.toString()}`;
    res.redirect(auth0Url);
  } catch (error) {
    console.error("OIDC Proxy Error:", error);
    res.status(500).send("Internal Server Error processing OIDC redirect.");
  }
});

app.post('/api/oidc/token', express.urlencoded({ extended: true }), async (req, res) => {
  console.log(`[OIDC Token] Incoming Request from ${req.ip}`);
  try {
    const formData = new URLSearchParams();
    for (const key in req.body) formData.append(key, req.body[key]);
    const tokenResponse = await fetch(`https://${AUTH0_DOMAIN}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString()
    });
    const data = await tokenResponse.json();
    console.log(`[OIDC Token] Status ${tokenResponse.status}, Scopes: ${data.scope || 'none'}`);
    return res.status(tokenResponse.status).json(data);
  } catch (err) {
    console.error("Token Exchange Error:", err);
    return res.status(500).json({ error: "Failed to exchange token" });
  }
});

app.get('/api/oidc/userinfo', async (req, res) => {
  console.log(`[OIDC UserInfo] Request from ${req.ip}, Auth: ${req.headers.authorization?.substring(0, 15)}...`);
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Missing Authorization header" });
    const auth0Response = await fetch(`https://${AUTH0_DOMAIN}/userinfo`, {
      headers: { 'Authorization': authHeader }
    });
    if (!auth0Response.ok) {
      console.log(`[OIDC UserInfo] Auth0 error: ${auth0Response.status}`);
      return res.status(auth0Response.status).json({ error: "Failed to fetch from Auth0" });
    }
    const userData = await auth0Response.json();
    console.log(`[OIDC UserInfo] Data fetched for: ${userData.email}`);
    
    // Sanitize username for AMP (no '@' or special chars allowed)
    const sanitizedEmailPrefix = userData.email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
    const cleanUsername = (userData.nickname || sanitizedEmailPrefix || 'user').replace(/[^a-zA-Z0-9]/g, '');
    userData.username = cleanUsername;
    userData.preferred_username = cleanUsername;

    // *** LIVE ROLE LOOKUP: bypass the stale JWT cache ***
    // Fetch real roles directly from Auth0 Management API using the user's sub
    let auth0Roles = [];
    try {
      const liveUser = await management.users.get({ id: userData.sub });
      const liveRoles = liveUser.data.app_metadata?.roles || [];
      auth0Roles = (Array.isArray(liveRoles) ? liveRoles : [liveRoles]).map(r => String(r).toLowerCase());
      console.log(`[OIDC UserInfo] Live roles for ${userData.email}:`, auth0Roles);
    } catch (mgmtErr) {
      // Fallback to JWT claim if Management API fails
      console.error(`[OIDC UserInfo] Management API failed, falling back to JWT claim:`, mgmtErr.message);
      const customRolesNamespace = 'https://larsonserver.ddns.net/roles';
      const rawRoles = userData[customRolesNamespace] || userData.roles || [];
      auth0Roles = (Array.isArray(rawRoles) ? rawRoles : [rawRoles]).map(r => String(r).toLowerCase());
    }
    
    // Map Auth0 roles to AMP groups
    userData.groups = [];
    if (auth0Roles.includes('admin')) {
       userData.groups.push("AMP_SuperAdmin", "AMP_Super Admins");
    } else if (auth0Roles.includes('manager') || auth0Roles.includes('instancemgr') || auth0Roles.includes('server_manager')) {
       userData.groups.push("AMP_Instance Manager", "AMP_Instance Managers", "AMP_InstanceManager", "AMP_InstanceMgr");
    } else if (auth0Roles.includes('user')) {
       userData.groups.push("Users");
    } else {
       userData.groups.push("Waitlist"); 
    }
    
    console.log(`[OIDC UserInfo] Final Groups for ${userData.email}:`, userData.groups);
    res.json(userData);
  } catch (error) {
    console.error("UserInfo Proxy Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

app.get('/api/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const users = await management.users.getAll();
    // Map Auth0 users to the expected frontend format
    const mappedUsers = users.data.map(u => {
      // Robust name picking
      const firstName = u.given_name || u.user_metadata?.first_name || u.nickname || u.name?.split(' ')[0] || 'User';
      const lastName = u.family_name || u.user_metadata?.last_name || (u.name?.includes(' ') ? u.name.split(' ').slice(1).join(' ') : '');
      const email = u.email || (u.email_addresses && u.email_addresses[0]?.value) || 'No Email';
      
      return {
        id: u.user_id,
        firstName,
        lastName,
        emailAddresses: [{ id: 'primary', emailAddress: email }],
        primaryEmailAddressId: 'primary',
        imageUrl: u.picture,
        username: u.user_metadata?.username || u.nickname || (email !== 'No Email' ? email.split('@')[0] : u.user_id),
        publicMetadata: {
           roles: u.app_metadata?.roles || [] 
        }
      };
    });
    res.json(mappedUsers);
  } catch (error) {
    console.error("Auth0 Get Users Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/users/:id/roles', requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { roles } = req.body;
  try {
    await management.users.update({ id }, { app_metadata: { roles: roles } });
    res.json({ message: 'Roles updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/requests', requireAuth, requireAdmin, async (req, res) => {
   try {
     const users = await management.users.getAll();
     const waitlisted = users.data.filter(u => (u.app_metadata?.roles || []).includes('waitlist'));
     const mappedRequests = waitlisted.map(u => ({
        id: u.user_id,
        emailAddress: u.email,
        createdAt: u.created_at,
        firstName: u.given_name || u.user_metadata?.first_name || 'Applicant'
     }));
     res.json(mappedRequests);
   } catch (error) {
     res.status(500).json({ error: error.message });
   }
});

app.post('/api/approve-request', requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.body;
  try {
    const user = await management.users.get({ id });
    let roles = user.data.app_metadata?.roles || [];
    roles = roles.filter(r => r !== 'waitlist');
    if (!roles.includes('user')) roles.push('user');
    await management.users.update({ id }, { app_metadata: { roles: roles } });
    res.json({ message: 'User approved' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/deny-request', requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.body;
  try {
    await management.users.delete({ id });
    res.json({ message: 'User denied' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/users/:id', requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  console.log(`[DELETE] Request to delete user: ${id}`);
  if (!id) return res.status(400).json({ error: 'User ID required' });
  try {
    await management.users.delete({ id });
    console.log(`Successfully deleted user ${id}`);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error("User Deletion Error:", error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Backend proxy running on port ${PORT}`);
});
