/* eslint-env node */
/* eslint-disable no-undef */
// server.js
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const { createClerkClient } = require('@clerk/backend');
const { clerkMiddleware } = require('@clerk/express');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Apply Clerk Middleware globally so req.auth is populated if a user token is provided
app.use(clerkMiddleware());

// Initialize Clerk Client using the keys in .env
const clerkClient = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY, publishableKey: process.env.CLERK_PUBLISHABLE_KEY });

// --- Custom Security Middleware ---
// Validates that the requesting user is authenticated AND holds the 'admin' role
const requireAdmin = async (req, res, next) => {
  const auth = req.auth ? req.auth() : null;
  if (!auth || !auth.userId) {
     return res.status(401).json({ error: 'Unauthorized: No active session found' });
  }

  try {
     // Fetch fresh metadata from Clerk to guarantee they haven't been forcefully demoted
     const user = await clerkClient.users.getUser(auth.userId);
     const rolesArray = Array.isArray(user.publicMetadata?.roles) 
         ? user.publicMetadata.roles 
         : (user.publicMetadata?.role ? [user.publicMetadata.role] : []);
         
     if (!rolesArray.includes('admin')) {
         return res.status(403).json({ error: 'Forbidden: Admin access only' });
     }
     next();
  } catch (err) {
      console.error("Admin Guard Error:", err);
      return res.status(500).json({ error: 'Internal Server Error verifying roles' });
  }
};
// ----------------------------------

// Route: OIDC Proxy for CubeCoders AMP (Fixes Empty State Bug)
// AMP sends a malformed OIDC request with an empty 'state=' parameter. Clerk strictly rejects this.
// We intercept AMP's request, securely generate a state string, inject it into the query, and forward to Clerk.
app.get('/api/oidc/authorize', (req, res) => {
  try {
    const queryParams = { ...req.query };
    
    // Inject a cryptographically secure 16-character state string if it's missing or empty
    if (!queryParams.state) {
        queryParams.state = crypto.randomBytes(8).toString('hex');
    }

    // Reconstruct the exact URL with our injected state parameter
    const searchParams = new URLSearchParams(queryParams);
    const clerkAuthUrl = `https://top-swan-56.clerk.accounts.dev/oauth/authorize?${searchParams.toString()}`;
    
    console.log(`Intercepted AMP OIDC Login. Forwarding to Clerk with state: ${queryParams.state}`);
    res.redirect(clerkAuthUrl);
  } catch (error) {
    console.error("OIDC Proxy Error:", error);
    res.status(500).send("Internal Server Error processing OIDC redirect.");
  }
});

// Route: OIDC UserInfo Proxy (Injects Role Claims)
// AMP strips manual roles if OIDC doesn't provide them. Clerk doesn't natively provide groups in standard userinfo.
// We intercept AMP's fetch, get the real identity from Clerk, inject the Admin groups, and hand it back to AMP.
app.get('/api/oidc/userinfo', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Missing Authorization header" });

    // Fetch the real user info from Clerk
    const clerkResponse = await fetch('https://top-swan-56.clerk.accounts.dev/oauth/userinfo', {
      headers: { 'Authorization': authHeader }
    });

    if (!clerkResponse.ok) {
      console.error("Clerk UserInfo Error:", await clerkResponse.text());
      return res.status(clerkResponse.status).json({ error: "Failed to fetch from Clerk" });
    }

    const userData = await clerkResponse.json();

    // Reverted: Forcefully inject the generic SuperAdmin baseline back into the proxy.
    // AMP strictly requires OIDC group payloads to match local roles or it will strip them.
    userData.groups = [
      "AMP_SuperAdmin", 
      "AMP_Super Admins",
      "AMP_InstanceMgr"
    ];

    console.log(`Intercepted UserInfo for ${userData.email || userData.sub}. Injected generic SuperAdmin roles.`);
    res.json(userData);

  } catch (error) {
    console.error("UserInfo Proxy Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// Route: Submit a new request to the Waitlist (Public)
app.post('/api/request-access', async (req, res) => {
  const { email, firstName, lastName } = req.body;
  
  if (!email || !firstName || !lastName) {
    return res.status(400).json({ error: 'Email, First Name, and Last Name are required' });
  }

  try {
    // Attempt to add them directly to the Clerk Waitlist
    const waitlistEntry = await clerkClient.waitlistEntries.create({
      emailAddress: email,
      notify: false // Set to true if you configured waitlist templates in Clerk Dashboard
    });
    
    // You can't store structured metadata in the Waitlist directly, but that's okay, 
    // Clerk captures the email, and we enforce the name on our end in case we expand later.
    console.log(`Waitlist entry created for: ${firstName} ${lastName}`);

    return res.status(201).json({ message: 'Request submitted to Waitlist successfully!', item: waitlistEntry });
  } catch (error) {
    if (error.errors && error.errors[0]?.code === 'form_identifier_exists') {
        return res.status(400).json({ error: 'Email already on the waitlist or allowlist.' });
    }
    console.error("Clerk Waitlist API Error:", error);
    return res.status(500).json({ error: 'Failed to join waitlist', details: error.message });
  }
});

// Route: Get all pending waitlist items (Admin Only)
app.get('/api/requests', requireAdmin, async (req, res) => {
  try {
    const list = await clerkClient.waitlistEntries.list({ status: 'pending' });
    // Clerk returns paginated objects: { data: [...], totalCount: ... }
    res.json(list.data);
  } catch (error) {
    console.error("Clerk Get Waitlist Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Route: Get all existing provisioned users (Admin Only)
app.get('/api/users', requireAdmin, async (req, res) => {
  try {
    const list = await clerkClient.users.getUserList();
    res.json(list.data);
  } catch (error) {
    console.error("Clerk Get Users Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Route: Update a user's role (Admin Only)
app.post('/api/users/:id/roles', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const { roles } = req.body;
  if (!id || !Array.isArray(roles)) return res.status(400).json({ error: 'ID and Roles array required' });

  try {
    const updatedUser = await clerkClient.users.updateUserMetadata(id, {
      publicMetadata: { roles: roles }
    });
    console.log(`Successfully updated roles for user ${id} to: ${roles.join(', ')}`);
    res.json({ message: 'Roles updated successfully', user: updatedUser });
  } catch (error) {
    console.error("Clerk Roles Update Error:", error);
    res.status(500).json({ error: 'Failed to update user roles', details: error.message });
  }
});

// Route: Approve a waitlist entry (Admin Only)
app.post('/api/approve-request', requireAdmin, async (req, res) => {
  const { id, email } = req.body;
  if (!id || !email) return res.status(400).json({ error: 'ID and Email required' });

  try {
    // 1. Explicitly create a standard Clerk Invitation. 
    // This GUARANTEES an email is sent to the user with a sign-up link (as long as emails are enabled in the Dashboard).
    // We also forcefully inject publicMetadata to assign them the 'user' role natively!
    const invitation = await clerkClient.invitations.createInvitation({
      emailAddress: email,
      publicMetadata: { roles: ['user'] },
      notify: true // Explicitly force the email to send
    });
    console.log(`Successfully sent email invitation to: ${email}`);

    // 2. Add them to the Allowlist as well!
    // This strictly allows the user to ignore the email if they want, navigate straight to the website, and use Google SSO natively.
    await clerkClient.allowlistIdentifiers.createAllowlistIdentifier({
      identifier: email,
      notify: false
    }).catch(err => {
      // Ignore if they are already on the allowlist
      if (err.errors && err.errors[0]?.code !== 'duplicate_record') {
        console.warn("Minor Allowlist warning during invite:", err.message);
      }
    });

    // 3. Clean up the dashboard 
    await clerkClient.waitlistEntries.delete(id).catch(err => console.warn("Could not delete from waitlist:", err.message));

    res.json({ message: 'User successfully invited! Email sent.', entry: invitation });
    
  } catch (error) {
    console.error("Clerk API Invite Error:", error);
    res.status(500).json({ error: 'Failed to invite Waitlist user', details: error.message });
  }
});

// Route: Deny a waitlist entry (Admin Only)
app.post('/api/deny-request', requireAdmin, async (req, res) => {
  const { id } = req.body;
  if (!id) return res.status(400).json({ error: 'ID required' });

  try {
    // We can either 'reject' or 'delete'.
    // Delete cleanly wipes them from the system so they can re-apply later if needed.
    await clerkClient.waitlistEntries.delete(id);
    console.log(`Successfully deleted waitlist entry: ${id}`);
    
    res.json({ message: 'Request denied and deleted.' });
  } catch (error) {
    console.error("Clerk API Deny Error:", error);
    res.status(500).json({ error: 'Failed to deny Waitlist user', details: error.message });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Backend proxy running locally on http://localhost:${PORT}`);
});
