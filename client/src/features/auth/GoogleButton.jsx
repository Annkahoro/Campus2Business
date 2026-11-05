import { GoogleLogin } from '@react-oauth/google';
import { useTranslation } from 'react-i18next';

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
export const isGoogleConfigured = !!CLIENT_ID && !CLIENT_ID.startsWith('xxxx');

/**
 * Google Identity button. Returns an ID token (`credential`) that the backend verifies.
 * mode: 'signin' | 'signup' (only changes the button text).
 */
export default function GoogleButton({ mode = 'signin', onCredential, onError, disabled }) {
  const { i18n } = useTranslation();
  if (!isGoogleConfigured) return null;

  return (
    <div
      className={disabled ? 'pointer-events-none flex justify-center opacity-60' : 'flex justify-center'}
      aria-busy={disabled || undefined}
    >
      <GoogleLogin
        onSuccess={({ credential }) => (credential ? onCredential(credential) : onError?.())}
        onError={() => onError?.()}
        text={mode === 'signup' ? 'signup_with' : 'signin_with'}
        shape="pill"
        size="large"
        width="320"
        locale={i18n.resolvedLanguage}
        // Re-mount when the language changes so Google re-renders its label.
        key={i18n.resolvedLanguage}
      />
    </div>
  );
}
