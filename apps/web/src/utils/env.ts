export const isProd = import.meta.env.PROD;

export const serverOriginUrl = isProd
  ? window.__WEWE_RSS_SERVER_ORIGIN_URL__
  : 'http://localhost:4000';

export const appVersion = __APP_VERSION__;

export const enabledAuthCode =
  window.__WEWE_RSS_ENABLED_AUTH_CODE__ === false ? false : true;
