import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { UserPlus } from 'lucide-react';
import { Badge, Button, Card, CardHeader, Input, Modal, PasswordInput, Spinner, toast } from '../../components/ui/index.js';
import AccountSettings from '../../features/account/AccountSettings.jsx';
import { passwordRule } from '../../features/auth/schemas.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { api, unwrap } from '../../lib/axios.js';
import { applyServerFieldErrors } from '../../lib/formErrors.js';
import { formatDate } from '../../features/programmes/format.js';

const ADMINS_KEY = ['admin', 'users'];
const schema = z.object({
  name: z.string().trim().min(2, 'validation.nameTooShort').max(120),
  email: z.string().trim().min(1, 'validation.required').email('validation.emailInvalid'),
  password: passwordRule,
});

function NewAdminModal({ open, onClose }) {
  const { t } = useTranslation('account');
  const qc = useQueryClient();
  const create = useMutation({
    mutationFn: (body) => unwrap(api.post('/admin/users', body)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ADMINS_KEY }),
  });
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema), defaultValues: { name: '', email: '', password: '' } });

  const close = () => {
    reset();
    onClose();
  };
  const onSubmit = handleSubmit(async (values) => {
    try {
      await create.mutateAsync(values);
      toast.success(t('admins.created'));
      close();
    } catch (err) {
      if (err?.response?.data?.code === 'EMAIL_IN_USE') setError('email', { type: 'server', message: 'errors:EMAIL_IN_USE' });
      else if (!applyServerFieldErrors(err, setError)) toast.apiError(err);
    }
  });

  return (
    <Modal
      open={open}
      onClose={close}
      title={t('admins.newTitle')}
      description={t('admins.newText')}
      footer={
        <>
          <Button variant="ghost" onClick={close} disabled={create.isPending}>
            {t('actions.cancel')}
          </Button>
          <Button type="submit" form="new-admin-form" loading={create.isPending}>
            {t('admins.create')}
          </Button>
        </>
      }
    >
      <form id="new-admin-form" onSubmit={onSubmit} className="space-y-4" noValidate>
        <Input {...register('name')} label={t('account.name')} error={errors.name?.message} required />
        <Input {...register('email')} type="email" label={t('account.email')} error={errors.email?.message} required />
        <PasswordInput
          {...register('password')}
          label={t('admins.tempPassword')}
          hint={t('auth:fields.passwordHint')}
          error={errors.password?.message}
          autoComplete="new-password"
          required
        />
      </form>
    </Modal>
  );
}

/** /admin/settings — own account + C2B admin users (docs/09; docs/04 §6: admins create other admins). */
export default function AdminSettings() {
  const { t, i18n } = useTranslation('account');
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const admins = useQuery({ queryKey: ADMINS_KEY, queryFn: () => unwrap(api.get('/admin/users')) });

  return (
    <AccountSettings>
      <Card>
        <CardHeader
          title={t('admins.title')}
          description={t('admins.text')}
          action={
            <Button size="sm" onClick={() => setOpen(true)} leftIcon={<UserPlus size={16} aria-hidden="true" />}>
              {t('admins.add')}
            </Button>
          }
        />
        {admins.isPending ? (
          <Spinner className="text-emerald" />
        ) : (
          <ul className="divide-y divide-line">
            {(admins.data ?? []).map((a) => (
              <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-medium">
                    {a.name} {a.id === user.id && <Badge variant="soft">{t('admins.you')}</Badge>}
                  </p>
                  <p className="text-sm text-ink-muted">{a.email}</p>
                </div>
                <span className="text-sm text-ink-muted">{t('admins.since', { date: formatDate(a.createdAt, i18n.resolvedLanguage) })}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <NewAdminModal open={open} onClose={() => setOpen(false)} />
    </AccountSettings>
  );
}
