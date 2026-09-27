export default () => ({
  port: parseInt(process.env.PORT || process.env.APP_PORT || '3000', 10),
  appName: process.env.APP_NAME || 'la-hermandad-backend',
  api: {
    prefix: process.env.API_PREFIX || 'api',
  },
  jwt: {
    secret: process.env.JWT_SECRET,
  },
});
