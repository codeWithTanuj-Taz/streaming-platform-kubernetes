const getEnv = (key, fallback) => {
  const value = process.env[key];
  return value === undefined || value === '' ? fallback : value;
};

const currentOrigin =
  typeof window !== 'undefined' ? window.location.origin : '';

export const AUTH_API_URL = getEnv(
  'REACT_APP_AUTH_API_URL',
  currentOrigin + '/api',
);

export const STREAMING_API_URL = getEnv(
  'REACT_APP_STREAMING_API_URL',
  currentOrigin + '/api',
);

export const STREAMING_PUBLIC_URL = getEnv(
  'REACT_APP_STREAMING_PUBLIC_URL',
  currentOrigin,
);

export const ADMIN_API_URL = getEnv(
  'REACT_APP_ADMIN_API_URL',
  currentOrigin + '/api/admin',
);

export const CHAT_API_URL = getEnv(
  'REACT_APP_CHAT_API_URL',
  currentOrigin + '/api/chat',
);

export const CHAT_SOCKET_URL = getEnv(
  'REACT_APP_CHAT_SOCKET_URL',
  currentOrigin,
);
