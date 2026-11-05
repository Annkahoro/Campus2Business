import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Alert, Button, Input, PasswordInput } from '../../components/ui/index.js';
import { getErrorCode } from '../../lib/axios.js';
import GoogleButton, { isGoogleConfigured } from './GoogleButton.jsx';
import OrDivider from './OrDivider.jsx';
import { useGoogleAuth, useLogin } from './hooks.js';
import { loginSchema } from './schemas.js';

export default function LoginForm() {
  const { t } = useTranslation('auth');
  const login = useLogin();
  const google = useGoogleAuth('login');
  const [errorCode, setErrorCode] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });

  const onSubmit = (values) => {
    setErrorCode(null);
    login.mutate(values, { onError: (err) => setErrorCode(getErrorCode(err)) });
  };

  const onGoogle = (credential) => {
    setErrorCode(null);
    google.mutate(credential, { onError: (err) => setErrorCode(getErrorCode(err)) });
  };

  const busy = login.isPending || google.isPending;

  return (
    <div className="space-y-6">
      {errorCode && <Alert variant="danger">{t(`errors:${errorCode}`, { defaultValue: t('errors:UNKNOWN') })}</Alert>}

      {isGoogleConfigured && (
        <>
          <GoogleButton mode="signin" onCredential={onGoogle} onError={() => setErrorCode('GOOGLE_FAILED')} disabled={busy} />
          <OrDivider />
        </>
      )}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
        <Input
          {...register('email')}
          type="email"
          autoComplete="email"
          label={t('fields.email')}
          placeholder={t('fields.emailPlaceholder')}
          error={errors.email?.message}
          required
        />
        <PasswordInput
          {...register('password')}
          autoComplete="current-password"
          label={t('fields.password')}
          error={errors.password?.message}
          required
        />
        <Button type="submit" fullWidth size="lg" loading={login.isPending} disabled={busy}>
          {t('login.submit')}
        </Button>
      </form>
    </div>
  );
}
