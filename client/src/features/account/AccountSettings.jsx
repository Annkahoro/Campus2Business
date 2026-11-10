import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Button, Card, CardHeader, Input, PasswordInput, Select, toast } from '../../components/ui/index.js';
import ImageUpload from '../../components/shared/ImageUpload.jsx';
import { ME_QUERY_KEY, useAuth } from '../../context/AuthContext.jsx';
import { authApi } from '../auth/api.js';
import { passwordRule } from '../auth/schemas.js';
import { useUploadAvatar } from '../profile/hooks.js';
import { applyServerFieldErrors } from '../../lib/formErrors.js';
import { SUPPORTED_LANGS } from '../../i18n/index.js';
import DeleteAccountCard from './DeleteAccountCard.jsx';

const accountSchema = z.object({
  name: z.string().trim().min(2, 'validation.nameTooShort').max(120),
  preferredLanguage: z.enum(['en', 'es']),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().max(128),
    newPassword: passwordRule,
    confirmPassword: z.string().min(1, 'validation.required'),
  })
  .refine((v) => v.newPassword === v.confirmPassword, { message: 'validation.passwordsMismatch', path: ['confirmPassword'] });

function AccountCard() {
  const { t, i18n } = useTranslation('account');
  const { user } = useAuth();
  const qc = useQueryClient();
  const avatar = useUploadAvatar();
  const form = useForm({
    resolver: zodResolver(accountSchema),
    defaultValues: { name: user.name, preferredLanguage: user.preferredLanguage ?? i18n.resolvedLanguage },
  });
  const save = useMutation({
    mutationFn: authApi.updateMe,
    onSuccess: (updated) => qc.setQueryData(ME_QUERY_KEY, (prev) => (prev ? { ...prev, user: updated } : prev)),
  });
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty },
  } = form;

  const onSubmit = handleSubmit(async (values) => {
    try {
      const updated = await save.mutateAsync(values);
      if (updated.preferredLanguage !== i18n.resolvedLanguage) await i18n.changeLanguage(updated.preferredLanguage);
      reset({ name: updated.name, preferredLanguage: updated.preferredLanguage });
      toast.success(t('saved'));
    } catch (err) {
      if (!applyServerFieldErrors(err, setError)) toast.apiError(err);
    }
  });

  const onAvatar = (file) =>
    avatar.mutate(file, { onSuccess: () => toast.success(t('avatarSaved')), onError: toast.apiError });

  return (
    <Card>
      <CardHeader title={t('account.title')} description={t('account.text')} />
      <div className="grid gap-6 md:grid-cols-[160px_1fr]">
        <div className="w-40">
          <ImageUpload
            imageUrl={user.avatar?.url}
            onUpload={onAvatar}
            uploading={avatar.isPending}
            maxMB={2}
            alt={t('account.avatarAlt', { name: user.name })}
            aspectClass="aspect-square"
            frameClass="rounded-full"
          />
        </div>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Input {...register('name')} label={t('account.name')} error={errors.name?.message} required autoComplete="name" />
          <Input label={t('account.email')} value={user.email} readOnly disabled hint={t('account.emailHint')} />
          <Select
            {...register('preferredLanguage')}
            label={t('account.language')}
            hint={t('account.languageHint')}
            options={SUPPORTED_LANGS.map((l) => ({ value: l, label: t(`language.names.${l}`, { ns: 'common' }) }))}
          />
          <div className="flex justify-end">
            <Button type="submit" loading={save.isPending} disabled={!isDirty}>
              {t('actions.save')}
            </Button>
          </div>
        </form>
      </div>
    </Card>
  );
}

function PasswordCard() {
  const { t } = useTranslation('account');
  const { user } = useAuth();
  const isGoogle = user.authProvider === 'google';
  const form = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });
  const change = useMutation({ mutationFn: authApi.changePassword });
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = form;

  const onSubmit = handleSubmit(async ({ currentPassword, newPassword }) => {
    try {
      await change.mutateAsync({ currentPassword: currentPassword || undefined, newPassword });
      reset();
      toast.success(t('password.saved'));
    } catch (err) {
      if (err?.response?.data?.code === 'INVALID_CURRENT_PASSWORD') {
        setError('currentPassword', { type: 'server', message: 'errors:INVALID_CURRENT_PASSWORD' });
      } else if (!applyServerFieldErrors(err, setError)) toast.apiError(err);
    }
  });

  return (
    <Card>
      <CardHeader title={t('password.title')} description={isGoogle ? t('password.googleText') : t('password.text')} />
      <form onSubmit={onSubmit} className="grid max-w-xl gap-4" noValidate>
        <PasswordInput
          {...register('currentPassword')}
          label={t('password.current')}
          hint={isGoogle ? t('password.currentGoogleHint') : undefined}
          error={errors.currentPassword?.message}
          autoComplete="current-password"
        />
        <PasswordInput
          {...register('newPassword')}
          label={t('password.new')}
          hint={t('auth:fields.passwordHint')}
          error={errors.newPassword?.message}
          autoComplete="new-password"
          required
        />
        <PasswordInput
          {...register('confirmPassword')}
          label={t('password.confirm')}
          error={errors.confirmPassword?.message}
          autoComplete="new-password"
          required
        />
        <div>
          <Button type="submit" loading={change.isPending}>
            {t('password.submit')}
          </Button>
        </div>
      </form>
    </Card>
  );
}

/** Own account settings for every role (docs/09 "Settings"). `children` adds role-specific sections. */
export default function AccountSettings({ children }) {
  const { t } = useTranslation('account');
  const { user } = useAuth();
  if (!user) return null;
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold md:text-3xl">{t('title')}</h1>
        <p className="mt-1 text-ink-muted">{t('subtitle')}</p>
      </div>
      <AccountCard />
      <PasswordCard />
      {children}
      <DeleteAccountCard />
    </div>
  );
}
