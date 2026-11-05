import { useTranslation } from 'react-i18next';
import { Button, Modal } from '../ui/index.js';

/** Every destructive action goes through this dialog (docs/09 shared UX rules). */
export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  variant = 'danger',
  loading = false,
}) {
  const { t } = useTranslation();
  return (
    <Modal
      open={open}
      onClose={loading ? undefined : onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            {t('actions.cancel')}
          </Button>
          <Button variant={variant} onClick={onConfirm} loading={loading}>
            {confirmLabel ?? t('actions.confirm')}
          </Button>
        </>
      }
    >
      {description && <p className="text-ink-muted">{description}</p>}
    </Modal>
  );
}
