import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Button, Input, Modal, PasswordInput, Switch, toast } from '../ui/index.js';
import { passwordRule } from '../../features/auth/schemas.js';
import { applyServerFieldErrors } from '../../lib/formErrors.js';

const base = {
  name: z.string().trim().min(2, 'validation.nameTooShort').max(120),
  email: z.string().trim().min(1, 'validation.required').email('validation.emailInvalid'),
};
const createSchema = z.object({ ...base, password: passwordRule });
const editSchema = z.object({ ...base, isActive: z.boolean() });
const nameOnlySchema = z.object({ name: base.name, isActive: z.boolean() });

/**
 * Create or edit a user account (C2B admins, learners, employees).
 * - mode 'create': name, email, temporary password.
 * - mode 'edit':   name, email (unless `emailEditable` is false), active switch (unless `canDeactivate` is false).
 * onSubmit(values) must return a promise; field errors from the API (e.g. EMAIL_IN_USE) land on the field.
 */
export default function UserFormModal({
  open,
  onClose,
  mode = 'create',
  user,
  onSubmit,
  loading,
  title,
  description,
  submitLabel,
  emailEditable = true,
  canDeactivate = true,
}) {
  const { t } = useTranslation('account');
  const isCreate = mode === 'create';
  const schema = isCreate ? createSchema : emailEditable ? editSchema : nameOnlySchema;
  const defaults = isCreate
    ? { name: '', email: '', password: '' }
    : { name: user?.name ?? '', email: user?.email ?? '', isActive: user?.isActive ?? true };

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isDirty },
  } = useForm({ resolver: zodResolver(schema), defaultValues: defaults });

  // Reopening for another user (or after saving) starts from that user's current values.
  useEffect(() => {
    if (open) reset(defaults);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user?.id]);

  const submit = handleSubmit(async (values) => {
    const body = { ...values };
    if (!isCreate && !emailEditable) delete body.email;
    if (!isCreate && !canDeactivate) delete body.isActive;
    try {
      await onSubmit(body);
    } catch (err) {
      const code = err?.response?.data?.code;
      if (code === 'EMAIL_IN_USE' || code === 'GOOGLE_EMAIL_LOCKED') {
        setError('email', { type: 'server', message: `errors:${code}` });
      } else if (!applyServerFieldErrors(err, setError)) {
        toast.apiError(err);
      }
    }
  });

  const formId = `user-form-${mode}`;
  return (
    <Modal
      open={open}
      onClose={loading ? undefined : onClose}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            {t('actions.cancel', { ns: 'common' })}
          </Button>
          <Button type="submit" form={formId} loading={loading} disabled={!isCreate && !isDirty}>
            {submitLabel ?? t('actions.save', { ns: 'common' })}
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} className="space-y-4" noValidate>
        <Input {...register('name')} label={t('account.name')} error={errors.name?.message} required autoComplete="off" />
        {(isCreate || emailEditable) && (
          <Input
            {...register('email')}
            type="email"
            label={t('account.email')}
            error={errors.email?.message}
            required
            autoComplete="off"
          />
        )}
        {!isCreate && !emailEditable && <Input label={t('account.email')} value={user?.email ?? ''} readOnly disabled />}
        {isCreate && (
          <PasswordInput
            {...register('password')}
            label={t('admins.tempPassword')}
            hint={t('auth:fields.passwordHint')}
            error={errors.password?.message}
            autoComplete="new-password"
            required
          />
        )}
        {!isCreate && canDeactivate && (
          <Controller
            control={control}
            name="isActive"
            render={({ field }) => (
              <Switch
                checked={field.value}
                onChange={field.onChange}
                label={t('users.active')}
                description={t('users.activeHint')}
              />
            )}
          />
        )}
      </form>
    </Modal>
  );
}
