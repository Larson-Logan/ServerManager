exports.onExecutePostLogin = async (event, api) => {
  const roles = event.user.app_metadata?.roles || [];
  
  // If they are on the waitlist, don't bother them with 2FA yet.
  if (roles.includes('waitlist')) {
    return; 
  }

  // If they are approved (no 'waitlist' role), FORCE them to do 2FA.
  api.multifactor.enable("any", { allowRememberBrowser: false });
};
