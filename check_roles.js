const { ManagementClient } = require('auth0');
require('dotenv').config();
const m = new ManagementClient({
  domain: process.env.AUTH0_DOMAIN,
  clientId: process.env.AUTH0_CLIENT_ID,
  clientSecret: process.env.AUTH0_CLIENT_SECRET,
});
m.users.getAll().then(r => {
  r.data.forEach(u => {
    console.log(u.email, '|', JSON.stringify(u.app_metadata));
  });
}).catch(e => console.error(e.message));
