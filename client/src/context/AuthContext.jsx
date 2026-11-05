import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import i18n from '../i18n/index.js';
import { tokenStorage } from '../lib/axios.js';
import { authApi } from '../features/auth/api.js';

const AuthContext = createContext(null);

export const ME_QUERY_KEY = ['auth', 'me'];

/**
 * status:
 *  - 'guest'          no token
 *  - 'loading'        token present, /auth/me in flight
 *  - 'authenticated'  user loaded
 *  - 'error'          /auth/me failed for a non-auth reason (e.g. network); can retry
 */
export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const [token, setToken] = useState(() => tokenStorage.get());

  const meQuery = useQuery({
    queryKey: ME_QUERY_KEY,
    queryFn: authApi.me,
    enabled: !!token,
    staleTime: 5 * 60 * 1000,
  });

  const user = token ? (meQuery.data?.user ?? null) : null;
  const organization = token ? (meQuery.data?.organization ?? null) : null;

  let status = 'guest';
  if (token) {
    if (user) status = 'authenticated';
    else if (meQuery.isError) status = 'error';
    else status = 'loading';
  }

  const logout = useCallback(() => {
    tokenStorage.clear();
    setToken(null);
    queryClient.clear();
  }, [queryClient]);

  /** Store a fresh { token, user } from login/register/google. */
  const setSession = useCallback(
    ({ token: newToken, user: newUser }) => {
      tokenStorage.set(newToken);
      // Responses can depend on who is asking (e.g. admins see drafts), so drop guest-era cache.
      queryClient.clear();
      if (!newUser.organization) {
        // No organization to load: the session is complete right away.
        queryClient.setQueryData(ME_QUERY_KEY, { user: newUser, organization: null });
      }
      // Users who belong to an organization wait for /auth/me (status 'loading') so guards
      // never see a missing organization for a moment.
      setToken(newToken);
    },
    [queryClient],
  );

  /** Persist the language choice on the account (docs/09 shared UX rules). */
  const savePreferredLanguage = useCallback(
    async (lang) => {
      if (!user || user.preferredLanguage === lang) return;
      queryClient.setQueryData(ME_QUERY_KEY, (prev) =>
        prev ? { ...prev, user: { ...prev.user, preferredLanguage: lang } } : prev,
      );
      try {
        await authApi.updateMe({ preferredLanguage: lang });
      } catch {
        /* non-critical: the UI language already changed locally */
      }
    },
    [user, queryClient],
  );

  // The Axios interceptor fires this on any 401 while a token is stored.
  useEffect(() => {
    const onForcedLogout = () => logout();
    window.addEventListener('auth:logout', onForcedLogout);
    return () => window.removeEventListener('auth:logout', onForcedLogout);
  }, [logout]);

  // After login, switch the UI to the user's preferred language once per session.
  const syncedUserId = useRef(null);
  useEffect(() => {
    if (!user || syncedUserId.current === user.id) return;
    syncedUserId.current = user.id;
    if (user.preferredLanguage && user.preferredLanguage !== i18n.resolvedLanguage) {
      i18n.changeLanguage(user.preferredLanguage);
    }
  }, [user]);

  const value = useMemo(
    () => ({
      status,
      user,
      organization,
      isAuthenticated: status === 'authenticated',
      setSession,
      logout,
      savePreferredLanguage,
      refetchMe: meQuery.refetch,
    }),
    [status, user, organization, setSession, logout, savePreferredLanguage, meQuery.refetch],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}
