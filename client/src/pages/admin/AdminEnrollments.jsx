import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Check, ClipboardList, Flag, Gauge, Trash2, X } from 'lucide-react';
import { Badge, Button, Card, EmptyState, Input, Modal, Pagination, ProgressBar, Spinner, Tabs, toast } from '../../components/ui/index.js';
import StatusBadge from '../../components/shared/StatusBadge.jsx';
import ConfirmDialog from '../../components/shared/ConfirmDialog.jsx';
import { useAdminEnrollments, useDeleteEnrollment, useSetEnrollmentProgress, useSetEnrollmentStatus } from '../../features/enrollments/hooks.js';
import { formatDate, formatPrice } from '../../features/programmes/format.js';
import { loc } from '../../lib/localized.js';

const TABS = ['requested', 'payment_pending', 'active', 'completed', 'rejected', 'dropped'];

/** Progress slider + optional score; `complete` marks the enrollment completed. */
function ProgressModal({ enrollment, mode, onClose }) {
  const { t, i18n } = useTranslation('learning');
  const [progress, setProgress] = useState(enrollment.progressPercent);
  const [score, setScore] = useState(enrollment.score ?? '');
  const setProgressM = useSetEnrollmentProgress();
  const setStatus = useSetEnrollmentStatus();
  const busy = setProgressM.isPending || setStatus.isPending;
  const scoreValue = score === '' ? null : Math.max(0, Math.min(100, Number(score)));

  const save = async () => {
    try {
      if (mode === 'complete') {
        await setStatus.mutateAsync({ id: enrollment.id, body: { status: 'completed', score: scoreValue } });
        toast.success(t('admin.completedToast'));
      } else {
        await setProgressM.mutateAsync({ id: enrollment.id, body: { progressPercent: progress, score: scoreValue } });
        toast.success(t('admin.progressToast'));
      }
      onClose();
    } catch (err) {
      toast.apiError(err);
    }
  };

  return (
    <Modal
      open
      onClose={busy ? undefined : onClose}
      title={mode === 'complete' ? t('admin.completeTitle') : t('admin.progressTitle')}
      description={`${enrollment.learner.name} · ${loc(enrollment.programme.title, i18n.resolvedLanguage)}`}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            {t('actions.cancel')}
          </Button>
          <Button onClick={save} loading={busy}>
            {mode === 'complete' ? t('admin.markCompleted') : t('actions.save')}
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {mode === 'progress' && (
          <div className="space-y-2">
            <label htmlFor="progress-range" className="flex justify-between text-sm font-medium">
              {t('card.progress')} <span className="font-semibold text-emerald">{progress}%</span>
            </label>
            <input
              id="progress-range"
              type="range"
              min="0"
              max="100"
              step="5"
              value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
              className="w-full accent-emerald"
            />
          </div>
        )}
        <Input
          label={t('admin.score')}
          hint={t('admin.scoreHint')}
          type="number"
          min="0"
          max="100"
          value={score}
          onChange={(e) => setScore(e.target.value)}
        />
      </div>
    </Modal>
  );
}

/** /admin/enrollments — status tabs; approve/reject; progress + score; mark completed (docs/09). */
export default function AdminEnrollments() {
  const { t, i18n } = useTranslation('learning');
  const lang = i18n.resolvedLanguage;
  const [params, setParams] = useSearchParams();
  const status = TABS.includes(params.get('status')) ? params.get('status') : 'requested';
  const search = params.get('search') ?? '';
  const page = Number(params.get('page')) || 1;
  const query = useAdminEnrollments({ status, search, page });
  const setStatus = useSetEnrollmentStatus();
  const [progressFor, setProgressFor] = useState(null); // { enrollment, mode }
  const [confirm, setConfirm] = useState(null); // { enrollment, status }
  const [deleting, setDeleting] = useState(null); // enrollment
  const remove = useDeleteEnrollment();

  const confirmDelete = () =>
    remove.mutate(deleting.id, {
      onSuccess: () => toast.success(t('admin.toast.deleted')),
      onError: toast.apiError,
      onSettled: () => setDeleting(null),
    });

  const update = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, String(v)) : next.delete(k)));
    if (!('page' in changes)) next.delete('page');
    setParams(next, { replace: true });
  };

  const move = async (enrollment, to) => {
    try {
      await setStatus.mutateAsync({ id: enrollment.id, body: { status: to } });
      toast.success(t(`admin.toast.${to}`));
      setConfirm(null);
    } catch (err) {
      toast.apiError(err);
      setConfirm(null);
    }
  };

  const counts = query.data?.counts ?? {};
  const items = query.data?.items ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold md:text-3xl">{t('admin.title')}</h1>
        <p className="mt-1 text-ink-muted">{t('admin.subtitle')}</p>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <Tabs
          label={t('admin.title')}
          value={status}
          onChange={(s) => update({ status: s })}
          className="flex-wrap"
          tabs={TABS.map((s) => ({
            value: s,
            label: t(`status.${s}`),
            badge: counts[s] ? <Badge variant={s === 'requested' ? 'pending' : 'neutral'}>{counts[s]}</Badge> : null,
          }))}
        />
        <Input
          className="w-full sm:w-72"
          label={t('org.search')}
          placeholder={t('org.searchPlaceholder')}
          defaultValue={search}
          onKeyDown={(e) => e.key === 'Enter' && update({ search: e.currentTarget.value.trim() })}
        />
      </div>

      {query.isPending && (
        <div className="flex justify-center py-16 text-emerald">
          <Spinner size="xl" />
        </div>
      )}
      {query.isError && (
        <EmptyState
          illustration={<AlertCircle size={32} strokeWidth={1.75} aria-hidden="true" />}
          title={t('loadError')}
          action={<Button onClick={() => query.refetch()}>{t('actions.retry')}</Button>}
        />
      )}
      {query.data && items.length === 0 && (
        <Card>
          <EmptyState
            illustration={<ClipboardList size={32} strokeWidth={1.75} aria-hidden="true" />}
            title={t('admin.emptyTitle', { status: t(`status.${status}`).toLowerCase() })}
          />
        </Card>
      )}

      {items.length > 0 && (
        <>
          <Card padded={false} className="overflow-hidden">
            <table className="hidden w-full text-left lg:table">
              <thead className="bg-cream-dark text-xs uppercase text-ink-muted">
                <tr>
                  <th scope="col" className="px-4 py-3 font-semibold">{t('admin.columns.learner')}</th>
                  <th scope="col" className="px-4 py-3 font-semibold">{t('admin.columns.programme')}</th>
                  <th scope="col" className="px-4 py-3 font-semibold">{t('admin.columns.payment')}</th>
                  <th scope="col" className="px-4 py-3 font-semibold">{t('admin.columns.progress')}</th>
                  <th scope="col" className="px-4 py-3 font-semibold">{t('admin.columns.status')}</th>
                  <th scope="col" className="px-4 py-3 text-right font-semibold">{t('admin.columns.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((e) => (
                  <tr key={e.id} className="align-top hover:bg-mint-soft">
                    <td className="px-4 py-3">
                      <Link to={`/admin/learners/${e.learner.id}`} className="font-medium text-ink hover:text-emerald hover:underline">
                        {e.learner.name}
                      </Link>
                      <p className="text-xs text-ink-muted">{e.organization?.name ?? t('admin.student')}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{loc(e.programme.title, lang)}</p>
                      <p className="text-xs text-ink-muted">
                        {[e.programme.code, e.intakeStartDate && formatDate(e.intakeStartDate, lang)].filter(Boolean).join(' · ')}
                        {e.recommendation && ` · ${t('admin.fromPathway')}`}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {formatPrice({ amount: e.payment.amount, currency: e.payment.currency }, lang, t)}
                      <p className="text-xs text-ink-muted">
                        {t(`card.paymentStatus.${e.payment.status}`)}
                        {e.payment.method && ` · ${t(`payment.methods.${e.payment.method}`)}`}
                      </p>
                    </td>
                    <td className="w-40 px-4 py-3">
                      {['active', 'completed'].includes(e.status) ? (
                        <>
                          <ProgressBar value={e.progressPercent} size="sm" ariaLabel={t('card.progress')} />
                          {e.score !== null && <p className="mt-1 text-xs text-ink-muted">{t('card.scoreShort', { score: e.score })}</p>}
                        </>
                      ) : (
                        <span className="text-sm text-ink-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={e.status} />
                      {e.learnerRating && <p className="mt-1 text-xs text-ink-muted">{t('card.rated', { rating: e.learnerRating })}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap justify-end gap-2">
                        {e.status === 'requested' && (
                          <>
                            <Button size="sm" onClick={() => move(e, 'approved')} loading={setStatus.isPending && setStatus.variables?.id === e.id} leftIcon={<Check size={16} aria-hidden="true" />}>
                              {t('admin.approve')}
                            </Button>
                            <Button size="sm" variant="ghost" className="text-danger" onClick={() => setConfirm({ enrollment: e, status: 'rejected' })} leftIcon={<X size={16} aria-hidden="true" />}>
                              {t('admin.reject')}
                            </Button>
                          </>
                        )}
                        {e.status === 'active' && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => setProgressFor({ enrollment: e, mode: 'progress' })} leftIcon={<Gauge size={16} aria-hidden="true" />}>
                              {t('admin.progress')}
                            </Button>
                            <Button size="sm" onClick={() => setProgressFor({ enrollment: e, mode: 'complete' })} leftIcon={<Flag size={16} aria-hidden="true" />}>
                              {t('admin.markCompleted')}
                            </Button>
                          </>
                        )}
                        {['active', 'payment_pending'].includes(e.status) && (
                          <Button size="sm" variant="ghost" className="text-danger" onClick={() => setConfirm({ enrollment: e, status: 'dropped' })}>
                            {t('admin.drop')}
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-danger"
                          onClick={() => setDeleting(e)}
                          aria-label={t('admin.deleteNamed', { name: e.learner.name, programme: loc(e.programme.title, lang) })}
                        >
                          <Trash2 size={16} strokeWidth={1.75} aria-hidden="true" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* Below lg: stacked cards with the same actions */}
            <ul className="divide-y divide-line lg:hidden">
              {items.map((e) => (
                <li key={e.id} className="space-y-3 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link to={`/admin/learners/${e.learner.id}`} className="font-medium text-ink hover:text-emerald">
                        {e.learner.name}
                      </Link>
                      <p className="text-sm">{loc(e.programme.title, lang)}</p>
                      <p className="text-xs text-ink-muted">
                        {formatPrice({ amount: e.payment.amount, currency: e.payment.currency }, lang, t)} · {t(`card.paymentStatus.${e.payment.status}`)}
                      </p>
                    </div>
                    <StatusBadge status={e.status} />
                  </div>
                  {['active', 'completed'].includes(e.status) && <ProgressBar value={e.progressPercent} size="sm" label={t('card.progress')} />}
                  <div className="flex flex-wrap gap-2">
                    {e.status === 'requested' && (
                      <>
                        <Button size="sm" onClick={() => move(e, 'approved')}>
                          {t('admin.approve')}
                        </Button>
                        <Button size="sm" variant="ghost" className="text-danger" onClick={() => setConfirm({ enrollment: e, status: 'rejected' })}>
                          {t('admin.reject')}
                        </Button>
                      </>
                    )}
                    {e.status === 'active' && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => setProgressFor({ enrollment: e, mode: 'progress' })}>
                          {t('admin.progress')}
                        </Button>
                        <Button size="sm" onClick={() => setProgressFor({ enrollment: e, mode: 'complete' })}>
                          {t('admin.markCompleted')}
                        </Button>
                      </>
                    )}
                    {['active', 'payment_pending'].includes(e.status) && (
                      <Button size="sm" variant="ghost" className="text-danger" onClick={() => setConfirm({ enrollment: e, status: 'dropped' })}>
                        {t('admin.drop')}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-danger"
                      onClick={() => setDeleting(e)}
                      leftIcon={<Trash2 size={16} strokeWidth={1.75} aria-hidden="true" />}
                    >
                      {t('actions.delete', { ns: 'common' })}
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
          <Pagination page={query.data.page} pages={query.data.pages} onChange={(p) => update({ page: p })} />
        </>
      )}

      {progressFor && (
        <ProgressModal key={progressFor.enrollment.id + progressFor.mode} {...progressFor} onClose={() => setProgressFor(null)} />
      )}

      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => move(confirm.enrollment, confirm.status)}
        loading={setStatus.isPending}
        title={confirm?.status === 'rejected' ? t('admin.rejectTitle') : t('admin.dropTitle')}
        description={confirm ? t('admin.confirmText', { name: confirm.enrollment.learner.name, programme: loc(confirm.enrollment.programme.title, lang) }) : ''}
        confirmLabel={confirm?.status === 'rejected' ? t('admin.reject') : t('admin.drop')}
      />
      <ConfirmDialog
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={remove.isPending}
        title={t('admin.deleteTitle')}
        description={deleting ? t('admin.deleteText', { name: deleting.learner.name, programme: loc(deleting.programme.title, lang) }) : ''}
        confirmLabel={t('actions.delete', { ns: 'common' })}
      />
    </div>
  );
}
