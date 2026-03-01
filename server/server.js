/* eslint-env node */
/* eslint-disable no-undef */
// server.js — AUTH0 PROXY v3.0
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const { ManagementClient } = require('auth0');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const helmet = require('helmet');
const os = require('os');
const { execSync } = require('child_process');
const fs = require('fs');

const VERSION = '3.0';
console.log(`>>> AUTH0 PROXY v${VERSION} STARTING - Domain: ${process.env.AUTH0_DOMAIN || 'UNDEFINED'} <<<`);

const app = express();

// ── Security & Middleware ────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false })); // CSP handled by Nginx
app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(morgan('combined'));

// ── Rate Limiting ────────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

const oidcLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many OIDC requests, please slow down.' },
});

app.use('/api/', globalLimiter);
app.use('/api/oidc/', oidcLimiter);

// ── Auth0 Config ─────────────────────────────────────────────────────────────
const AUTH0_DOMAIN = process.env.AUTH0_DOMAIN;
const AUTH0_CLIENT_ID = process.env.AUTH0_CLIENT_ID;
const AUTH0_CLIENT_SECRET = process.env.AUTH0_CLIENT_SECRET;

const management = new ManagementClient({
  domain: AUTH0_DOMAIN,
  clientId: AUTH0_CLIENT_ID,
  clientSecret: AUTH0_CLIENT_SECRET,
});

// ── JWKS / JWT ───────────────────────────────────────────────────────────────
function getJwksClient() {
  return jwksClient({
    jwksUri: `https://${AUTH0_DOMAIN}/.well-known/jwks.json`,
    cache: true,
    cacheMaxEntries: 5,
    cacheMaxAge: 600000, // 10 minutes
  });
}

function getKey(header, callback) {
  getJwksClient().getSigningKey(header.kid, function(err, key) {
    if (err) return callback(err);
    callback(null, key.publicKey || key.rsaPublicKey);
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
      console.error('[Auth] JWT verification failed:', err.message);
      return res.status(401).json({ error: 'Invalid token' });
    }
    req.user = decoded;
    next();
  });
};

const requireAdmin = async (req, res, next) => {
  try {
    const liveUser = await management.users.get({ id: req.user.sub });
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

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
}

function getDiskUsage() {
  try {
    const output = execSync("df -BG / | tail -1 | awk '{print $2, $3, $4}'").toString().trim();
    const [total, used, avail] = output.split(' ').map(v => parseInt(v));
    return { totalGb: total, usedGb: used, availGb: avail, usedPercent: Math.round((used / total) * 100) };
  } catch { return null; }
}

function getPm2Processes() {
  try {
    const raw = execSync('pm2 jlist 2>/dev/null').toString();
    const procs = JSON.parse(raw);
    return procs.map(p => ({
      name: p.name,
      status: p.pm2_env?.status,
      cpu: p.monit?.cpu,
      memory: Math.round((p.monit?.memory || 0) / 1024 / 1024) + 'mb',
      uptime: p.pm2_env?.pm_uptime ? formatUptime(Math.floor((Date.now() - p.pm2_env.pm_uptime) / 1000)) : 'n/a',
    }));
  } catch { return []; }
}

// ── Health Endpoint ───────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    version: VERSION,
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// ── Audit Log Helper ─────────────────────────────────────────────────────────
const AUDIT_LOG_FILE = path.join(__dirname, 'audit_log.json');

async function logAuditAction(actorEmail, action, target, details = {}) {
  try {
    let logs = [];
    if (fs.existsSync(AUDIT_LOG_FILE)) {
      const raw = fs.readFileSync(AUDIT_LOG_FILE, 'utf8');
      logs = JSON.parse(raw);
    }
    const newEntry = {
      timestamp: new Date().toISOString(),
      actor: actorEmail,
      action,
      target,
      details,
    };
    logs.unshift(newEntry);
    fs.writeFileSync(AUDIT_LOG_FILE, JSON.stringify(logs.slice(0, 500), null, 2));
  } catch (err) {
    console.error('[AuditLog] Failed to write log:', err.message);
  }
}

// ── System Metrics Endpoint ───────────────────────────────────────────────────
app.get('/api/system', requireAuth, (req, res) => {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;

  res.json({
    cpu: {
      model: os.cpus()[0]?.model || 'Unknown',
      cores: os.cpus().length,
      loadAvg: os.loadavg().map(v => Math.round(v * 100) / 100),
      loadPercent: Math.round((os.loadavg()[0] / os.cpus().length) * 100),
    },
    memory: {
      totalGb: Math.round((totalMem / 1e9) * 10) / 10,
      usedGb: Math.round((usedMem / 1e9) * 10) / 10,
      freeGb: Math.round((freeMem / 1e9) * 10) / 10,
      usedPercent: Math.round((usedMem / totalMem) * 100),
    },
    disk: getDiskUsage(),
    uptime: {
      seconds: Math.floor(os.uptime()),
      human: formatUptime(Math.floor(os.uptime())),
    },
    pm2: getPm2Processes(),
    timestamp: new Date().toISOString(),
  });
});

// ── Admin: Service Status ────────────────────────────────────────────────────
app.get('/api/admin/status', requireAuth, requireAdmin, async (req, res) => {
  const services = [
    { name: 'Identity (Auth0)', url: `https://${AUTH0_DOMAIN}/.well-known/openid-configuration` },
    { name: 'Game Server (AMP)', url: 'https://manage.larsonserver.ddns.net' },
    { name: 'VTT (Foundry)', url: 'https://foundry.larsonserver.ddns.net' }
  ];

  const results = await Promise.all(services.map(async (s) => {
    try {
      const start = Date.now();
      const response = await fetch(s.url, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
      return { 
        name: s.name, 
        online: response.ok || response.status < 500, 
        latency: Date.now() - start 
      };
    } catch {
      return { name: s.name, online: false, latency: null };
    }
  }));

  res.json(results);
});

// ── Admin: Stats (Heatmap) ───────────────────────────────────────────────────
app.get('/api/admin/stats', requireAuth, requireAdmin, async (req, res) => {
  try {
    // Fetch logs from Auth0 Management API
    const logs = await management.logs.getAll({
        q: 'type:"s" AND date:[now-90d TO *]', // Successful logins in last 90 days
        per_page: 100,
        sort: 'date:-1'
    });

    const heatmap = {};
    logs.data.forEach(log => {
        const date = log.date.split('T')[0];
        heatmap[date] = (heatmap[date] || 0) + 1;
    });

    res.json({ heatmap });
  } catch (err) {
    console.error('[AdminStats] Error:', err.message);
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

// ── Admin: Audit Log ─────────────────────────────────────────────────────────
app.get('/api/admin/audit-log', requireAuth, requireAdmin, (req, res) => {
  try {
    if (!fs.existsSync(AUDIT_LOG_FILE)) return res.json([]);
    const logs = JSON.parse(fs.readFileSync(AUDIT_LOG_FILE, 'utf8'));
    res.json(logs);
  } catch {
    res.status(500).json({ error: 'Failed to read audit log' });
  }
});

// ── Admin: Role Management ────────────────────────────────────────────────────
app.get('/api/admin/roles', requireAuth, requireAdmin, async (req, res) => {
  try {
    const roles = await management.roles.getAll();
    res.json(roles.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/roles/seed', requireAuth, requireAdmin, async (req, res) => {
  try {
    const defaults = [
      { name: 'admin', description: 'Full system access' },
      { name: 'server_manager', description: 'Manage game server instances' },
      { name: 'user', description: 'Standard authenticated user' }
    ];
    
    const existing = await management.roles.getAll();
    const existingNames = existing.data.map(r => r.name.toLowerCase());
    
    const results = [];
    for (const role of defaults) {
      if (!existingNames.includes(role.name)) {
        await management.roles.create(role);
        logAuditAction(req.user.email, 'SEED_ROLE', role.name);
        results.push(`Created ${role.name}`);
      } else {
        results.push(`Skipped ${role.name} (exists)`);
      }
    }
    res.json({ message: 'Seed complete', results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/admin/roles/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, description } = req.body;
    const oldRole = await management.roles.get({ id: req.params.id });
    await management.roles.update({ id: req.params.id }, { name, description });
    logAuditAction(req.user.email, 'UPDATE_ROLE_METADATA', oldRole.data.name, { 
      from: { name: oldRole.data.name, description: oldRole.data.description },
      to: { name, description }
    });
    res.json({ message: 'Role updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Admin: RBAC / Permissions ────────────────────────────────────────────────
app.get('/api/admin/permissions', requireAuth, requireAdmin, async (req, res) => {
  try {
    // Find the resource server (API) matching our audience
    const servers = await management.resourceServers.getAll();
    const server = servers.data.find(s => s.identifier === process.env.AUTH0_AUDIENCE);
    if (!server) return res.status(404).json({ error: 'API Resource Server not found' });
    res.json(server.scopes || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/admin/roles/:id/permissions', requireAuth, requireAdmin, async (req, res) => {
  try {
    const perms = await management.roles.getPermissions({ id: req.params.id });
    res.json(perms.data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/admin/roles/:id/permissions', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { permissions, action } = req.body; // action: 'associate' or 'remove'
    const identifier = process.env.AUTH0_AUDIENCE;
    
    const formatted = permissions.map(p => ({
      resource_server_identifier: identifier,
      permission_name: p
    }));

    if (action === 'remove') {
      await management.roles.removePermissions({ id: req.params.id }, { permissions: formatted });
      logAuditAction(req.user.email, 'REMOVE_PERMISSIONS', req.params.id, { permissions });
    } else {
      await management.roles.addPermissions({ id: req.params.id }, { permissions: formatted });
      logAuditAction(req.user.email, 'ADD_PERMISSIONS', req.params.id, { permissions });
    }
    res.json({ message: 'Permissions updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Password Reset ────────────────────────────────────────────────────────────
// Triggers a fresh reset email via Auth0 dbconnections API (fixes stale link issue)
app.post('/api/reset-password', requireAuth, async (req, res) => {
  try {
    const userId = req.user.sub;
    // Only database connection users have passwords
    if (!userId.startsWith('auth0|')) {
      return res.status(400).json({ error: 'Social login accounts do not have a password to reset.' });
    }
    const user = await management.users.get({ id: userId });
    const email = user.data.email;
    const response = await fetch(`https://${AUTH0_DOMAIN}/dbconnections/change_password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: AUTH0_CLIENT_ID,
        email,
        connection: 'Username-Password-Authentication',
      }),
    });
    if (!response.ok) {
      const text = await response.text();
      console.error('[reset-password] Auth0 error:', text);
      return res.status(500).json({ error: 'Failed to send reset email.' });
    }
    console.log(`[reset-password] Reset email sent for ${email}`);
    res.json({ message: 'Password reset email sent.' });
  } catch (err) {
    console.error('[reset-password] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── MFA Enrollment Ticket ─────────────────────────────────────────────────────
// Uses Management API to create a direct Guardian enrollment URL (no auth flow needed)
app.post('/api/mfa-enrollment', requireAuth, async (req, res) => {
  try {
    const ticket = await management.guardian.createEnrollmentTicket({
      user_id: req.user.sub,
    });
    res.json({ url: ticket.data.ticket_url });
  } catch (err) {
    console.error('[mfa-enrollment] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── MFA Authenticator Management ──────────────────────────────────────────────
// List all security factors (Guardian MFA + WebAuthn/Passkeys)
app.get('/api/authenticators', requireAuth, async (req, res) => {
  const combined = [];
  
  // 1. Try Guardian Enrollments (TOTP, SMS, Push)
  try {
    const guardianRes = await management.users.getEnrollments({ id: req.user.sub });
    if (guardianRes.data) {
      combined.push(...guardianRes.data.map(e => ({ ...e, factor_type: 'guardian' })));
    }
  } catch {
    console.warn('[authenticators] Guardian fetch failed');
    // Continue anyway
  }

  // 2. Try WebAuthn / Authentication Methods (Passkeys)
  try {
    const webauthnRes = await management.users.getAuthenticationMethods({ id: req.user.sub });
    if (webauthnRes.data) {
      combined.push(...webauthnRes.data.map(m => ({
        id: m.id,
        auth_method: m.type,
        friendly_name: m.name,
        confirmed: true,
        enrolled_at: m.created_at,
        factor_type: 'webauthn',
        ...m
      })));
    }
  } catch {
    console.warn('[authenticators] WebAuthn fetch failed');
    // If BOTH fail, and WebAuthn was the one that hit "Insufficient scope", 
    // we want the user to know why.
    if (combined.length === 0) {
      return res.status(500).json({ error: `Auth0 Scope Missing: ${err.message}` });
    }
  }

  res.json(combined);
});

// Delete a specific factor (handles both Guardian and WebAuthn)
app.delete('/api/authenticators/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { factor_type } = req.query; // Expect frontend to pass this for safety

  try {
    if (factor_type === 'webauthn' || id.startsWith('webauthn|')) {
      await management.users.deleteAuthenticationMethod({
        id: req.user.sub,
        authentication_method_id: id,
      });
    } else {
      // Default to Guardian for backward compatibility or if explicitly requested
      await management.guardian.deleteGuardianEnrollment({ id });
    }
    res.json({ message: 'Authenticator removed.' });
  } catch (err) {
    console.error('[authenticators/delete] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── /api/me ───────────────────────────────────────────────────────────────────
app.get('/api/me', requireAuth, async (req, res) => {
  try {
    const user = await management.users.get({ id: req.user.sub });
    const roles = user.data.app_metadata?.roles || [];
    res.json({ roles });
  } catch (error) {
    console.error('[/api/me] Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ── OIDC Discovery ────────────────────────────────────────────────────────────
app.get(['/.well-known/openid-configuration', '/api/oidc/.well-known/openid-configuration'], (req, res) => {
  const baseUrl = `https://larsonserver.ddns.net/api/oidc`;
  res.json({
    issuer: `https://${AUTH0_DOMAIN}/`,
    authorization_endpoint: `${baseUrl}/authorize`,
    token_endpoint: `${baseUrl}/token`,
    userinfo_endpoint: `${baseUrl}/userinfo`,
    jwks_uri: `https://${AUTH0_DOMAIN}/.well-known/jwks.json`,
    response_types_supported: ['code', 'id_token', 'token id_token'],
    subject_types_supported: ['public'],
    id_token_signing_alg_values_supported: ['RS256'],
  });
});

// ── AMP Launch Cookie ─────────────────────────────────────────────────────────
app.post('/api/amp-launch', requireAuth, (req, res) => {
  res.cookie('amp_launch', 'valid', {
    maxAge: 120000,
    httpOnly: true,
    sameSite: 'lax',
    secure: true,
    domain: '.larsonserver.ddns.net',
  });
  res.json({ success: true });
});

// ── OIDC Authorize ────────────────────────────────────────────────────────────
app.get('/api/oidc/authorize', (req, res) => {
  try {
    const forwardedFor = req.headers['x-forwarded-for'] || req.ip || '';
    const isInternal = forwardedFor.includes('127.0.0.1') || 
                       forwardedFor.includes('192.168.86.249') || 
                       !req.headers['x-forwarded-for'];

    if (!req.cookies.amp_launch && !isInternal) {
      return res.status(403).send(`
        <div style="font-family:sans-serif;text-align:center;margin-top:100px;color:#fff;background:#09090b;height:100vh;padding:20px;">
          <h2 style="color:#ef4444;">Access Denied</h2>
          <p style="color:#a1a1aa;margin-top:10px;">Direct AMP login is disabled for security reasons.</p>
          <p style="color:#a1a1aa;">Please launch the Server Manager from your <a href="https://larsonserver.ddns.net/dashboard" style="color:#00f0ff;">Dashboard</a>.</p>
        </div>
      `);
    }
    const queryParams = { ...req.query };
    if (!queryParams.state) queryParams.state = crypto.randomBytes(8).toString('hex');
    const searchParams = new URLSearchParams(queryParams);
    if (!searchParams.has('scope')) searchParams.append('scope', 'openid profile email');
    res.redirect(`https://${AUTH0_DOMAIN}/authorize?${searchParams.toString()}`);
  } catch (error) {
    console.error('[OIDC Authorize] Error:', error);
    res.status(500).send('Internal Server Error processing OIDC redirect.');
  }
});

// ── OIDC Token Exchange ───────────────────────────────────────────────────────
app.post('/api/oidc/token', express.urlencoded({ extended: true }), async (req, res) => {
  try {
    const formData = new URLSearchParams();
    for (const key in req.body) formData.append(key, req.body[key]);
    const tokenResponse = await fetch(`https://${AUTH0_DOMAIN}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    });
    const data = await tokenResponse.json();
    return res.status(tokenResponse.status).json(data);
  } catch (err) {
    console.error('[OIDC Token] Exchange error:', err);
    return res.status(500).json({ error: 'Failed to exchange token' });
  }
});

// ── OIDC UserInfo ─────────────────────────────────────────────────────────────
app.get('/api/oidc/userinfo', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Missing Authorization header' });

    const auth0Response = await fetch(`https://${AUTH0_DOMAIN}/userinfo`, {
      headers: { Authorization: authHeader },
    });
    if (!auth0Response.ok) return res.status(auth0Response.status).json({ error: 'Failed to fetch from Auth0' });

    const userData = await auth0Response.json();

    // Sanitize username for AMP
    const sanitizedEmailPrefix = userData.email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
    const cleanUsername = (userData.nickname || sanitizedEmailPrefix || 'user').replace(/[^a-zA-Z0-9]/g, '');
    userData.username = cleanUsername;
    userData.preferred_username = cleanUsername;

    // Live role lookup via Management API
    let auth0Roles = [];
    try {
      const liveUser = await management.users.get({ id: userData.sub });
      const liveRoles = liveUser.data.app_metadata?.roles || [];
      auth0Roles = (Array.isArray(liveRoles) ? liveRoles : [liveRoles]).map(r => String(r).toLowerCase());
    } catch (mgmtErr) {
      console.error('[OIDC UserInfo] Management API fallback:', mgmtErr.message);
      const customRolesNamespace = 'https://larsonserver.ddns.net/roles';
      const rawRoles = userData[customRolesNamespace] || userData.roles || [];
      auth0Roles = (Array.isArray(rawRoles) ? rawRoles : [rawRoles]).map(r => String(r).toLowerCase());
    }

    userData.groups = [];
    if (auth0Roles.includes('admin')) {
      userData.groups.push('AMP_SuperAdmin', 'AMP_Super Admins');
    } else if (auth0Roles.some(r => ['manager', 'instancemgr', 'server_manager'].includes(r))) {
      userData.groups.push('AMP_Instance Manager', 'AMP_Instance Managers', 'AMP_InstanceManager', 'AMP_InstanceMgr');
    } else if (auth0Roles.includes('user')) {
      userData.groups.push('Users');
    } else {
      userData.groups.push('Waitlist');
    }

    console.log(`[OIDC UserInfo] ${userData.email} → groups:`, userData.groups);
    res.json(userData);
  } catch (error) {
    console.error('[OIDC UserInfo] Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ── User Management ───────────────────────────────────────────────────────────
app.get('/api/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const users = await management.users.getAll();
    const mappedUsers = users.data.map(u => {
      const firstName = u.given_name || u.user_metadata?.first_name || u.nickname || u.name?.split(' ')[0] || 'User';
      const lastName = u.family_name || u.user_metadata?.last_name || (u.name?.includes(' ') ? u.name.split(' ').slice(1).join(' ') : '');
      const email = u.email || (u.email_addresses && u.email_addresses[0]?.value) || 'No Email';
      return {
        id: u.user_id,
        firstName, lastName,
        emailAddresses: [{ id: 'primary', emailAddress: email }],
        primaryEmailAddressId: 'primary',
        imageUrl: u.picture,
        username: u.user_metadata?.username || u.nickname || (email !== 'No Email' ? email.split('@')[0] : u.user_id),
        publicMetadata: { roles: u.app_metadata?.roles || [] },
      };
    });
    res.json(mappedUsers);
  } catch (error) {
    console.error('[/api/users] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/users/:id/roles', requireAuth, requireAdmin, async (req, res) => {
  try {
    const oldUser = await management.users.get({ id: req.params.id });
    const oldRoles = oldUser.data.app_metadata?.roles || [];
    await management.users.update({ id: req.params.id }, { app_metadata: { roles: req.body.roles } });
    logAuditAction(req.user.email, 'UPDATE_ROLES', oldUser.data.email, { 
      from: oldRoles, 
      to: req.body.roles 
    });
    res.json({ message: 'Roles updated' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/requests', requireAuth, requireAdmin, async (req, res) => {
  try {
    const users = await management.users.getAll();
    const waitlisted = users.data.filter(u => (u.app_metadata?.roles || []).includes('waitlist'));
    res.json(waitlisted.map(u => ({
      id: u.user_id,
      emailAddress: u.email,
      createdAt: u.created_at,
      firstName: u.given_name || u.user_metadata?.first_name || 'Applicant',
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/approve-request', requireAuth, requireAdmin, async (req, res) => {
  try {
    const user = await management.users.get({ id: req.body.id });
    let roles = user.data.app_metadata?.roles || [];
    roles = roles.filter(r => r !== 'waitlist');
    if (!roles.includes('user')) roles.push('user');
    await management.users.update({ id: req.body.id }, { app_metadata: { roles } });
    logAuditAction(req.user.email, 'APPROVE_USER', user.data.email);
    res.json({ message: 'User approved' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/deny-request', requireAuth, requireAdmin, async (req, res) => {
  try {
    await management.users.delete({ id: req.body.id });
    res.json({ message: 'User denied' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/users/:id', requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params;
  if (!id) return res.status(400).json({ error: 'User ID required' });
  try {
    await management.users.delete({ id });
    logAuditAction(req.user.email, 'DELETE_USER', id);
    console.log(`[DELETE] Removed user ${id}`);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('[DELETE] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Backend proxy v${VERSION} running on port ${PORT}`);
});
