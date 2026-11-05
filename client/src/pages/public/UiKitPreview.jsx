import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Route, XCircle } from 'lucide-react';
import { api, unwrap } from '../../lib/axios.js';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  Input,
  Modal,
  Select,
  Spinner,
  Textarea,
  toast,
} from '../../components/ui/index.js';

/**
 * Phase 0 check page: brand tokens, UI kit, API health and the EN/ES toggle.
 * Replaced by the real Landing page in Phase 9.
 */
export default function UiKitPreview() {
  const { t } = useTranslation();
  const [modalOpen, setModalOpen] = useState(false);

  const health = useQuery({
    queryKey: ['health'],
    queryFn: () => unwrap(api.get('/health')),
    retry: false,
  });

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-4 md:p-8">
      <div>
        <h1 className="font-display text-2xl font-bold md:text-3xl">{t('uikit.title')}</h1>
        <p className="mt-2 text-ink-muted">{t('uikit.intro')}</p>
      </div>

      <Card>
        <CardHeader title={t('uikit.apiStatus')} />
        {health.isPending && <Spinner className="text-emerald" />}
        {health.isSuccess && (
          <Badge variant="success" icon={<CheckCircle2 size={14} strokeWidth={1.75} aria-hidden="true" />}>
            {t('uikit.apiOk', { db: health.data.db })}
          </Badge>
        )}
        {health.isError && (
          <Badge variant="danger" icon={<XCircle size={14} strokeWidth={1.75} aria-hidden="true" />}>
            {t('uikit.apiDown')}
          </Badge>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title={t('uikit.buttons')} />
          <div className="flex flex-wrap gap-3">
            <Button>{t('uikit.primary')}</Button>
            <Button variant="secondary">{t('uikit.secondary')}</Button>
            <Button variant="outline">{t('uikit.outline')}</Button>
            <Button variant="ghost">{t('uikit.ghost')}</Button>
            <Button variant="danger">{t('uikit.danger')}</Button>
            <Button loading>{t('uikit.loading')}</Button>
            <Button size="sm">{t('uikit.primary')}</Button>
            <Button size="lg">{t('uikit.primary')}</Button>
          </div>
        </Card>

        <Card>
          <CardHeader title={t('uikit.badges')} />
          <div className="flex flex-wrap gap-2">
            <Badge variant="pending">{t('status.pending')}</Badge>
            <Badge variant="success">{t('status.approved')}</Badge>
            <Badge variant="success">{t('status.published')}</Badge>
            <Badge variant="danger">{t('status.rejected')}</Badge>
            <Badge variant="active">{t('status.active')}</Badge>
            <Badge variant="info">{t('status.under_review')}</Badge>
            <Badge>{t('status.draft')}</Badge>
          </div>

          <h3 className="mt-8 mb-3 font-display text-base font-semibold">{t('uikit.feedback')}</h3>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => setModalOpen(true)}>
              {t('uikit.openModal')}
            </Button>
            <Button variant="secondary" onClick={() => toast.success(t('uikit.toastSuccessMsg'))}>
              {t('uikit.toastSuccess')}
            </Button>
            <Button
              variant="ghost"
              onClick={() => toast.apiError({ response: { data: { code: 'INVITE_EXPIRED' } } })}
            >
              {t('uikit.toastError')}
            </Button>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title={t('uikit.forms')} />
        <div className="grid gap-6 md:grid-cols-2">
          <Input
            label={t('uikit.nameLabel')}
            placeholder={t('uikit.namePlaceholder')}
            hint={t('uikit.nameHint')}
            required
          />
          <Input label={t('uikit.emailLabel')} type="email" defaultValue="amina@" error="uikit.emailError" />
          <Select
            label={t('uikit.levelLabel')}
            options={[
              { value: 'beginner', label: t('uikit.levelBeginner') },
              { value: 'intermediate', label: t('uikit.levelIntermediate') },
              { value: 'advanced', label: t('uikit.levelAdvanced') },
            ]}
          />
          <Textarea label={t('uikit.goalsLabel')} placeholder={t('uikit.goalsPlaceholder')} rows={3} />
        </div>
      </Card>

      <Card>
        <EmptyState
          illustration={<Route size={32} strokeWidth={1.75} aria-hidden="true" />}
          title={t('uikit.emptyTitle')}
          description={t('uikit.emptyText')}
          action={<Button>{t('uikit.emptyAction')}</Button>}
        />
      </Card>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={t('uikit.modalTitle')}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              {t('actions.cancel')}
            </Button>
            <Button onClick={() => setModalOpen(false)}>{t('actions.confirm')}</Button>
          </>
        }
      >
        <p className="text-ink-muted">{t('uikit.modalBody')}</p>
      </Modal>
    </div>
  );
}
