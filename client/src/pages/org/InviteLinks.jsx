import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Copy, Link2, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { Badge, Button, Card, EmptyState, Input, Modal, PageSpinner, Select, Switch, toast } from '../../components/ui/index.js';
import ConfirmDialog from '../../components/shared/ConfirmDialog.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import OrgStatusNotice from '../../features/organizations/OrgStatusNotice.jsx';
import {
  useCreateInvite,
  useDeleteInvite,
  useInvites,
  useRegenerateInvite,
  useUpdateInvite,
} from '../../features/organizations/hooks.js';
import { applyServerFieldErrors } from '../../lib/formErrors.js';
import { copyText } from '../../lib/clipboard.js';
import QueryError from '../../components/shared/QueryError.jsx';

const STATE_VARIANT = { active: 'success', expired: 'pending', full: 'pending', disabled: 'neutral' };

const schema = z.object({
  label: z.string().max(100),
  department: z.string(),
  expiresAt: z.string().refine((v) => !v || new Date(v) > new Date(), 'org:invites.errors.pastDate'),
  maxUses: z.string().refine((v) => v === '' || (Number.isInteger(Number(v)) && Number(v) >= 1), 'fieldErrors.INVALID_NUMBER'),
});

function InviteFormModal({ open, onClose, invite, departments }) {
  const { t } = useTranslation('org');
  const create = useCreateInvite();
  const update = useUpdateInvite();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      label: invite?.label ?? '',
      department: invite?.department ?? '',
      expiresAt: invite?.expiresAt ? String(invite.expiresAt).slice(0, 10) : '',
      maxUses: invite?.maxUses ? String(invite.maxUses) : '',
    },
  });

  const onSubmit = handleSubmit((v) => {
    const body = {
      label: v.label.trim(),
      department: v.department,
      // Expire at the end of the chosen day.
      expiresAt: v.expiresAt ? new Date(`${v.expiresAt}T23:59:59`).toISOString() : null,
      maxUses: v.maxUses ? Number(v.maxUses) : null,
    };
    const handlers = {
      onSuccess: () => {
        toast.success(invite ? t('invites.updated') : t('invites.created'));
        onClose();
      },
      onError: (err) => {
        applyServerFieldErrors(err, setError);
        toast.apiError(err);
      },
    };
    if (invite) update.mutate({ id: invite.id, body }, handlers);
    else create.mutate(body, handlers);
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={invite ? t('invites.edit') : t('invites.new')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t('actions.cancel')}
          </Button>
          <Button onClick={onSubmit} loading={create.isPending || update.isPending}>
            {t('actions.save')}
          </Button>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <Input {...register('label')} label={t('invites.label')} placeholder={t('invites.labelPlaceholder')} />
        <Select
          {...register('department')}
          label={t('invites.department')}
          hint={t('invites.departmentHint')}
          placeholder={t('invites.anyDepartment')}
          options={departments.map((d) => ({ value: d.name, label: d.name }))}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            {...register('expiresAt')}
            type="date"
            label={t('invites.expiresAt')}
            hint={t('invites.expiresHint')}
            error={errors.expiresAt?.message}
          />
          <Input
            {...register('maxUses')}
            type="number"
            min="1"
            label={t('invites.maxUses')}
            hint={t('invites.maxUsesHint')}
            error={errors.maxUses?.message}
          />
        </div>
      </form>
    </Modal>
  );
}

function InviteCard({ invite, onEdit, onRegenerate, onDelete }) {
  const { t, i18n } = useTranslation('org');
  const update = useUpdateInvite();
  const fmt = new Intl.DateTimeFormat(i18n.resolvedLanguage, { dateStyle: 'medium' });

  const copy = async () => {
    if (await copyText(invite.url)) toast.success(t('invites.copied'));
    else toast.error(t('invites.copyFailed'));
  };

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold">{invite.label || t('invites.untitled')}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-ink-muted">
            <Badge variant={STATE_VARIANT[invite.state]}>{t(`invites.states.${invite.state}`)}</Badge>
            {invite.department && <Badge variant="soft">{invite.department}</Badge>}
          </div>
        </div>
        <Switch
          label={t('invites.active')}
          checked={invite.isActive}
          disabled={update.isPending}
          onChange={(isActive) => update.mutate({ id: invite.id, body: { isActive } }, { onError: toast.apiError })}
        />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          readOnly
          value={invite.url}
          aria-label={t('invites.url')}
          onFocus={(e) => e.target.select()}
          className="min-w-0 flex-1 rounded-xl border border-line bg-cream px-3 py-2 font-mono text-xs text-ink focus:outline-none focus:ring-2 focus:ring-mint"
        />
        <Button size="sm" onClick={copy} leftIcon={<Copy size={16} strokeWidth={1.75} aria-hidden="true" />}>
          {t('actions.copy')}
        </Button>
      </div>

      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-ink-muted">{t('invites.uses')}</dt>
          <dd className="font-semibold text-ink">
            {invite.maxUses ? t('invites.usesOf', { used: invite.usesCount, max: invite.maxUses }) : t('invites.usesUnlimited', { used: invite.usesCount })}
          </dd>
        </div>
        <div>
          <dt className="text-ink-muted">{t('invites.expires')}</dt>
          <dd className="font-semibold text-ink">{invite.expiresAt ? fmt.format(new Date(invite.expiresAt)) : t('invites.never')}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">{t('invites.createdOn')}</dt>
          <dd className="font-semibold text-ink">{fmt.format(new Date(invite.createdAt))}</dd>
        </div>
      </dl>

      <div className="flex flex-wrap gap-2 border-t border-line pt-3">
        <Button variant="ghost" size="sm" onClick={() => onEdit(invite)}>
          {t('actions.edit')}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => onRegenerate(invite)} leftIcon={<RefreshCw size={16} strokeWidth={1.75} aria-hidden="true" />}>
          {t('invites.regenerate')}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-danger"
          onClick={() => onDelete(invite)}
          leftIcon={<Trash2 size={16} strokeWidth={1.75} aria-hidden="true" />}
        >
          {t('actions.delete')}
        </Button>
      </div>
    </Card>
  );
}

/** /org/invites */
export default function InviteLinks() {
  const { t } = useTranslation('org');
  const { organization } = useAuth();
  const approved = organization.status === 'approved';
  const query = useInvites(approved);
  const regenerate = useRegenerateInvite();
  const remove = useDeleteInvite();
  const [modal, setModal] = useState({ open: false, invite: null });
  const [confirm, setConfirm] = useState(null); // { type: 'regenerate' | 'delete', invite }

  const runConfirm = () => {
    const { type, invite } = confirm;
    const mutation = type === 'delete' ? remove : regenerate;
    mutation.mutate(invite.id, {
      onSuccess: () => {
        toast.success(type === 'delete' ? t('invites.deleted') : t('invites.regenerated'));
        setConfirm(null);
      },
      onError: toast.apiError,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold md:text-3xl">{t('invites.title')}</h1>
          <p className="mt-1 max-w-2xl text-ink-muted">{t('invites.subtitle')}</p>
        </div>
        {approved && (
          <Button onClick={() => setModal({ open: true, invite: null })} leftIcon={<Plus size={18} strokeWidth={1.75} aria-hidden="true" />}>
            {t('invites.new')}
          </Button>
        )}
      </div>

      {!approved && (
        <>
          <OrgStatusNotice organization={organization} compact />
          <Card>
            <EmptyState
              illustration={<Link2 size={32} strokeWidth={1.75} aria-hidden="true" />}
              title={t('invites.notApprovedTitle')}
              description={t('invites.notApprovedText')}
            />
          </Card>
        </>
      )}

      {approved && query.isPending && <PageSpinner />}
      {approved && query.isError && <QueryError query={query} />}
      {approved && query.data?.length === 0 && (
        <Card>
          <EmptyState
            illustration={<Link2 size={32} strokeWidth={1.75} aria-hidden="true" />}
            title={t('invites.emptyTitle')}
            description={t('invites.emptyText')}
            action={<Button onClick={() => setModal({ open: true, invite: null })}>{t('invites.new')}</Button>}
          />
        </Card>
      )}
      {approved && query.data?.length > 0 && (
        <div className="grid gap-6 xl:grid-cols-2">
          {query.data.map((invite) => (
            <InviteCard
              key={invite.id}
              invite={invite}
              onEdit={(i) => setModal({ open: true, invite: i })}
              onRegenerate={(i) => setConfirm({ type: 'regenerate', invite: i })}
              onDelete={(i) => setConfirm({ type: 'delete', invite: i })}
            />
          ))}
        </div>
      )}

      {modal.open && (
        <InviteFormModal
          open
          invite={modal.invite}
          departments={organization.departments}
          onClose={() => setModal({ open: false, invite: null })}
        />
      )}

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={runConfirm}
        loading={regenerate.isPending || remove.isPending}
        variant={confirm?.type === 'delete' ? 'danger' : 'primary'}
        title={confirm?.type === 'delete' ? t('invites.deleteTitle') : t('invites.regenerateTitle')}
        description={confirm?.type === 'delete' ? t('invites.deleteText') : t('invites.regenerateText')}
        confirmLabel={confirm?.type === 'delete' ? t('actions.delete') : t('invites.regenerate')}
      />
    </div>
  );
}
