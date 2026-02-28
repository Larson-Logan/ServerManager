exports.onExecutePostLogin = async (event, api) => {
  const namespace = 'https://larsonserver.ddns.net';
  if (event.authorization) {
    api.idToken.setCustomClaim(`${namespace}/roles`, event.authorization.roles);
    api.accessToken.setCustomClaim(`${namespace}/roles`, event.authorization.roles);
  }
};
