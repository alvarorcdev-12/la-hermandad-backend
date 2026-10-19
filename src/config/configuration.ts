export default () => ({
  port: parseInt(process.env.PORT || process.env.APP_PORT || '3000', 10),
  appName: process.env.APP_NAME || 'la-hermandad-backend',
  api: {
    prefix: process.env.API_PREFIX || 'api',
  },
  swagger: {
    enabled:
      process.env.NODE_ENV !== 'production' &&
      process.env.SWAGGER_ENABLED === 'true',
    serverUrl: process.env.SWAGGER_SERVER_URL,
  },
  posPin: {
    encryptionKey: process.env.POS_PIN_ENCRYPTION_KEY,
    lookupKey: process.env.POS_PIN_LOOKUP_KEY,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
  },
});
