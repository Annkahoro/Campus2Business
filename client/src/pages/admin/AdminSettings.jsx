import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Pencil, Trash2, UserPlus } from 'lucide-react';
import { Badge, Button, Card, CardHeader, Spinner, toast } from '../../components/ui/index.js';
import ConfirmDialog from '../../components/shared/ConfirmDialog.jsx';
import UserFormModal from '../../components/shared/UserFormModal.jsx';
import AccountSettings from '../../features/account/AccountSettings.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { api, unwrap } from '../../lib/axios.js';
import { formatDate } from '../../features/programmes/format.js';

const ADMINS_KEY = ['admin', 'users'];

const adminsApi = {
  list: () => unwrap(api.get('/admin/users')),
  create: (body) => unwrap(api.post('/admin/users', body)),
  update: ({ id, body }) => unwrap(api.patch(`/admin/users/${id}`, body)),
  remove: (id) => unwrap(api.delete(`/admin/users/${id}`)),
};

function useAdminWrite(mutationFn) {
  const qc = useQueryClient();
  return useMutation({ mutationFn, onSuccess: () => qc.invalidateQueries({ queryKey: ADMINS_KEY }) });
}

/**
 * /admin/settings — own account + C2B admin users (docs/04 §6).
 * Every C2B admin can create, edit, deactivate and delete other admins. Their own account is edited
 * (and deleted) in the sections above/below; the last active admin can never be removed (LAST_ADMIN).
 * The main admin (isSuperAdmin, set on the server) can be renamed but never deleted, deactivated or re-emailed.
 */
export default function AdminSettings() {
  const { t, i18n } = useTranslation('account');
  const { user } = useAuth();
  const [modal, setModal] = useState(null); // { mode: 'create' } | { mode: 'edit', admin }
  const [deleting, setDeleting] = useState(null);
  const admins = useQuery({ queryKey: ADMINS_KEY, queryFn: adminsApi.list });
  const create = useAdminWrite(adminsApi.create);
  const update = useAdminWrite(adminsApi.update);
  const remove = useAdminWrite(adminsApi.remove);

  const onSubmit = async (values) => {
    if (modal.mode === 'create') {
      await create.mutateAsync(values);
      toast.success(t('admins.created'));
    } else {
      await update.mutateAsync({ id: modal.admin.id, body: values });
      toast.success(t('users.updated', { name: values.name }));
    }
    setModal(null);
  };

  const confirmDelete = () =>
    remove.mutate(deleting.id, {
      onSuccess: () => toast.success(t('users.deleted', { name: deleting.name })),
      onError: toast.apiError,
      onSettled: () => setDeleting(null),
    });

  return (
    <AccountSettings>
      <Card>
        <CardHeader
          title={t('admins.title')}
          description={t('admins.text')}
          action={
            <Button size="sm" onClick={() => setModal({ mode: 'create' })} leftIcon={<UserPlus size={16} aria-hidden="true" />}>
              {t('admins.add')}
            </Button>
          }
        />
        {admins.isPending ? (
          <Spinner className="text-emerald" />
        ) : (
          <ul className="divide-y divide-line">
            {(admins.data ?? []).map((a) => {
              const isMe = a.id === user.id;
              return (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 font-medium">
                      {a.name}
                      {a.isSuperAdmin && <Badge variant="active">{t('admins.mainAdmin')}</Badge>}
                      {isMe && <Badge variant="soft">{t('admins.you')}</Badge>}
                      {!a.isActive && <Badge variant="neutral">{t('users.inactive')}</Badge>}
                    </p>
                    <p className="text-sm text-ink-muted">{a.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-ink-muted">
                      {t('admins.since', { date: formatDate(a.createdAt, i18n.resolvedLanguage) })}
                    </span>
                    {!isMe && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setModal({ mode: 'edit', admin: a })}
                          aria-label={t('users.editNamed', { name: a.name })}
                        >
                          <Pencil size={16} strokeWidth={1.75} aria-hidden="true" />
                        </Button>
                        {!a.isSuperAdmin && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-danger"
                          onClick={() => setDeleting(a)}
                          aria-label={t('users.deleteNamed', { name: a.name })}
                        >
                          <Trash2 size={16} strokeWidth={1.75} aria-hidden="true" />
                        </Button>
                        )}
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <UserFormModal
        open={!!modal}
        onClose={() => setModal(null)}
        mode={modal?.mode ?? 'create'}
        user={modal?.admin}
        emailEditable={modal?.admin?.authProvider !== 'google' && !modal?.admin?.isSuperAdmin}
        canDeactivate={!modal?.admin?.isSuperAdmin}
        onSubmit={onSubmit}
        loading={create.isPending || update.isPending}
        title={modal?.mode === 'edit' ? t('admins.editTitle') : t('admins.newTitle')}
        description={modal?.mode === 'edit' ? undefined : t('admins.newText')}
        submitLabel={modal?.mode === 'edit' ? undefined : t('admins.create')}
      />
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={remove.isPending}
        title={t('admins.deleteTitle')}
        description={deleting ? t('admins.deleteText', { name: deleting.name }) : ''}
        confirmLabel={t('actions.delete', { ns: 'common' })}
      />
    </AccountSettings>
  );
}
