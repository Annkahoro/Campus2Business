import axios from 'axios';
import i18n from '../i18n/index.js';

export const TOKEN_KEY = 'c2b_token';

export const tokenStorage = {
  get() {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set(token) {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch {
      /* storage unavailable */
    }
  },
  clear() {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* storage unavailable */
    }
  },
};

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = tokenStorage.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  config.headers['Accept-Language'] = i18n.resolvedLanguage || 'en';
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && tokenStorage.get()) {
      tokenStorage.clear();
      // AuthContext listens for this event and resets the session (Phase 1).
      window.dispatchEvent(new Event('auth:logout'));
    }
    return Promise.reject(error);
  },
);

/** Unwraps `{ success, data }` so callers receive `data` directly. */
export const unwrap = (promise) => promise.then((res) => res.data.data);

/** Returns the API error `code` (e.g. INVITE_EXPIRED) or a client-side fallback code. */
export const getErrorCode = (error) => {
  if (error?.response?.data?.code) return error.response.data.code;
  if (error?.request && !error?.response) return 'NETWORK_ERROR';
  return 'UNKNOWN';
};

/** Translated, user-facing message for an API error. */
export const getErrorMessage = (error) => {
  const code = getErrorCode(error);
  return i18n.t(`errors:${code}`, { defaultValue: i18n.t('errors:UNKNOWN') });
};
