import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import { Alert, Button, Card, CardHeader, Input, Modal, PasswordInput, toast } from '../../components/ui/index.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { authApi } from '../auth/api.js';

/**
 * "Danger zone": every user can permanently delete their own account.
 * Local accounts confirm with their password; Google-only accounts type DELETE (ELIMINAR in Spanish).
 */
export default function DeleteAccountCard() {
  const { t } = useTranslation('account');
  const { user, organization, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [typed, setTyped] = useState('');
  const [error, setError] = useState(null);
  const remove = useMutation({ mutationFn: authApi.deleteMe });

  const isGoogle = user.authProvider === 'google';
  const word = t('delete.confirmWord');
  const canConfirm = isGoogle ? typed.trim().toUpperCase() === word.toUpperCase() : password.length > 0;

  const close = () => {
    if (remove.isPending) return;
    setOpen(false);
    setPassword('');
    setTyped('');
    setError(null);
  };

  const confirm = () =>
    remove.mutate(isGoogle ? {} : { password }, {
      onSuccess: () => {
        toast.success(t('delete.done'));
        logout();
        navigate('/', { replace: true });
      },
      onError: (err) => {
        if (err?.response?.data?.code === 'INVALID_CURRENT_PASSWORD') setError('errors:INVALID_CURRENT_PASSWORD');
        else toast.apiError(err);
      },
    });

  const warnings = [t('delete.warnings.permanent')];
  if (['student', 'employee'].includes(user.role)) warnings.push(t('delete.warnings.learner'));
  if (user.role === 'org_admin' && organization) warnings.push(t('delete.warnings.orgAdmin', { name: organization.name }));
  if (user.role === 'c2b_admin') warnings.push(t('delete.warnings.admin'));

  return (
    <Card className="border-danger">
      <CardHeader title={t('delete.title')} description={t('delete.text')} />
      <Button variant="danger" onClick={() => setOpen(true)} leftIcon={<Trash2 size={18} strokeWidth={1.75} aria-hidden="true" />}>
        {t('delete.button')}
      </Button>

      <Modal
        open={open}
        onClose={close}
        title={t('delete.modalTitle')}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={close} disabled={remove.isPending}>
              {t('actions.cancel', { ns: 'common' })}
            </Button>
            <Button variant="danger" onClick={confirm} loading={remove.isPending} disabled={!canConfirm}>
              {t('delete.confirm')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Alert variant="danger">
            <ul className="list-disc space-y-1 pl-5">
              {warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </Alert>
          {isGoogle ? (
            <Input
              label={t('delete.typeLabel', { word })}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoComplete="off"
              required
            />
          ) : (
            <PasswordInput
              label={t('delete.passwordLabel')}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
              error={error}
              autoComplete="current-password"
              required
            />
          )}
        </div>
      </Modal>
    </Card>
  );
}
