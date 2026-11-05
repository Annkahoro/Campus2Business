import { useMutation } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext.jsx';
import { canAccessPath, homeFor } from '../../lib/roles.js';
import { authApi } from './api.js';

/**
 * After a successful auth call: run `onAuthenticated` (e.g. a welcome toast), store the session and
 * redirect — to `redirectTo` if given, else back to the page the user came from (if their role may
 * access it), else their home. The callback runs before navigation unmounts the form.
 */
function useCompleteAuth({ onAuthenticated, redirectTo } = {}) {
  const { setSession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  return (session) => {
    onAuthenticated?.(session);
    setSession(session);
    const from = location.state?.from?.pathname;
    const target = redirectTo ?? (from && canAccessPath(session.user, from) ? from : homeFor(session.user));
    navigate(target, { replace: true });
  };
}

export function useLogin({ onAuthenticated } = {}) {
  const complete = useCompleteAuth({ onAuthenticated });
  return useMutation({ mutationFn: authApi.login, onSuccess: complete });
}

const REGISTER_FN = {
  student: authApi.register,
  org_admin: authApi.registerOrgAdmin,
  employee: authApi.registerEmployee,
};

/** kind: 'student' | 'org_admin' | 'employee' (employee needs extra.inviteToken). */
export function useRegister({ kind = 'student', extra = {}, onAuthenticated, redirectTo } = {}) {
  const complete = useCompleteAuth({ onAuthenticated, redirectTo });
  const { i18n } = useTranslation();
  return useMutation({
    mutationFn: ({ name, email, password }) =>
      REGISTER_FN[kind]({ name, email, password, preferredLanguage: i18n.resolvedLanguage, ...extra }),
    onSuccess: complete,
  });
}

/** intent: 'login' | 'student' | 'org_admin' | 'employee' (docs/04 §1). */
export function useGoogleAuth(intent, { extra = {}, onAuthenticated, redirectTo } = {}) {
  const complete = useCompleteAuth({ onAuthenticated, redirectTo });
  const { i18n } = useTranslation();
  return useMutation({
    mutationFn: (credential) =>
      authApi.google({ credential, intent, preferredLanguage: i18n.resolvedLanguage, ...extra }),
    onSuccess: complete,
  });
}
