import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Input, PasswordInput, toast } from '../../components/ui/index.js';
import { getErrorCode } from '../../lib/axios.js';
import GoogleButton, { isGoogleConfigured } from './GoogleButton.jsx';
import OrDivider from './OrDivider.jsx';
import { useGoogleAuth, useRegister } from './hooks.js';
import { registerSchema } from './schemas.js';

/**
 * Registration form (email/password or Google).
 * kind: 'student' (self sign-up) | 'org_admin' (org registration step 1) | 'employee' (invite join; needs inviteToken).
 */
export default function RegisterForm({ kind = 'student', inviteToken, redirectTo, submitLabel }) {
  const { t } = useTranslation('auth');
  const welcome = ({ user, isNew }) => {
    if (isNew !== false) toast.success(t('register.success', { name: user.name }));
  };
  const extra = kind === 'employee' ? { inviteToken } : {};
  const registerMutation = useRegister({ kind, extra, onAuthenticated: welcome, redirectTo });
  const google = useGoogleAuth(kind, { extra, onAuthenticated: welcome, redirectTo });
  const [errorCode, setErrorCode] = useState(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = (values) => {
    setErrorCode(null);
    registerMutation.mutate(values, {
      onError: (err) => {
        const code = getErrorCode(err);
        if (code === 'EMAIL_IN_USE') setError('email', { message: 'errors:EMAIL_IN_USE' });
        else setErrorCode(code);
      },
    });
  };

  const onGoogle = (credential) => {
    setErrorCode(null);
    google.mutate(credential, { onError: (err) => setErrorCode(getErrorCode(err)) });
  };

  const busy = registerMutation.isPending || google.isPending;

  return (
    <div className="space-y-6">
      {errorCode && <Alert variant="danger">{t(`errors:${errorCode}`, { defaultValue: t('errors:UNKNOWN') })}</Alert>}

      {isGoogleConfigured && (
        <>
          <GoogleButton mode="signup" onCredential={onGoogle} onError={() => setErrorCode('GOOGLE_FAILED')} disabled={busy} />
          <OrDivider />
        </>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <Input
          {...register('name')}
          autoComplete="name"
          label={t('fields.name')}
          placeholder={t('fields.namePlaceholder')}
          error={errors.name?.message}
          required
        />
        <Input
          {...register('email')}
          type="email"
          autoComplete="email"
          label={kind === 'org_admin' ? t('fields.workEmail') : t('fields.email')}
          placeholder={t('fields.emailPlaceholder')}
          error={errors.email?.message}
          required
        />
        <PasswordInput
          {...register('password')}
          autoComplete="new-password"
          label={t('fields.password')}
          hint={t('fields.passwordHint')}
          error={errors.password?.message}
          required
        />
        <PasswordInput
          {...register('confirmPassword')}
          autoComplete="new-password"
          label={t('fields.confirmPassword')}
          error={errors.confirmPassword?.message}
          required
        />
        <Button type="submit" fullWidth size="lg" loading={registerMutation.isPending} disabled={busy}>
          {submitLabel ?? t('register.submit')}
        </Button>
      </form>
    </div>
  );
}
