exports.onExecutePostLogin = async (event, api) => {
  const namespace = 'https://larsonserver.ddns.net/roles';
  const admins = ['loganblarson@gmail.com'];

  let currentRoles = event.user.app_metadata?.roles ?? null;

  if (currentRoles === null && !admins.includes(event.user.email)) {
    currentRoles = ['waitlist'];
    api.user.setAppMetadata('roles', currentRoles);
  }
  if (currentRoles === null) currentRoles = [];

  if (admins.includes(event.user.email) && !currentRoles.includes('admin')) {
    currentRoles.push('admin');
    api.user.setAppMetadata('roles', currentRoles);
  }

  api.idToken.setCustomClaim(namespace, currentRoles);
  api.accessToken.setCustomClaim(namespace, currentRoles);

  // Force 2FA for ALL users, no device remembering allowed
  api.multifactor.enable("any", { allowRememberBrowser: true });
};
