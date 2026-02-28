exports.onExecutePostLogin = async (event, api) => {
  // Only check email verification for email/password logins
  if (event.user.identities[0].provider === 'auth0') {
    if (!event.user.email_verified) {
      api.access.deny('Please verify your email address before logging in.');
    }
  }
};
