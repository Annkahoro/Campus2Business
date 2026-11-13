import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CalendarDays, CheckCircle2, ExternalLink, RefreshCw, RotateCcw } from 'lucide-react';
import { Alert, Badge, Button, EmptyState, Modal, Select, Spinner, toast } from '../../components/ui/index.js';
import { loc } from '../../lib/localized.js';
import { formatDateRange, formatTimeRange } from './format.js';
import { useAdminProgrammes, useApplyImport, useCategoryLabel, useImportPreview, useRestoreIgnored } from './hooks.js';

const defaultAction = (item) => (item.error ? 'skip' : item.match && item.match.status !== 'archived' ? 'merge' : 'create');

function ImportItem({ item, action, onAction, target, onTarget, programmes }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage;
  const categoryLabel = useCategoryLabel();
  const intake = item.intakes?.[0];

  const options = [
    { value: 'create', label: t('admin:import.actions.create') },
    { value: 'merge', label: t('admin:import.actions.merge') },
    { value: 'ignore', label: t('admin:import.actions.ignore') },
    { value: 'skip', label: t('admin:import.actions.skip') },
  ];

  return (
    <li className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-start">
      {item.image ? (
        <img src={item.image} alt="" loading="lazy" className="h-16 w-24 shrink-0 rounded-lg border border-line object-cover" />
      ) : (
        <span className="hidden h-16 w-24 shrink-0 rounded-lg bg-cream-dark sm:block" aria-hidden="true" />
      )}
      <div className="min-w-0 flex-1 space-y-1.5">
        <p className="font-medium text-ink" lang="es">
          {item.title}
        </p>
        {item.error ? (
          <p className="text-sm text-danger">{t('admin:import.pageFailed')}</p>
        ) : (
          <>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="soft">{t(`programme.catalogues.${item.catalogue}`)}</Badge>
              {item.subsidised ? (
                <Badge variant="success">{t('programme.subsidised')}</Badge>
              ) : (
                item.price?.amount != null && <Badge>{`${item.price.amount} ${item.price.currency}`}</Badge>
              )}
              {item.featured && <Badge variant="active">{t('programme.featured')}</Badge>}
              {item.categories.map((c) => (
                <Badge key={c}>{categoryLabel(c)}</Badge>
              ))}
            </div>
            {intake && (
              <p className="flex items-center gap-1.5 text-sm text-ink-muted">
                <CalendarDays size={14} strokeWidth={1.75} aria-hidden="true" />
                {formatDateRange(intake, lang)}
                {intake.startTime && ` · ${formatTimeRange(intake)}`}
                {intake.location && ` · ${intake.location === 'Online' ? t('programme.modes.online') : intake.location}`}
              </p>
            )}
            {item.unmatchedCategories.length > 0 && (
              <p className="text-xs text-warning">
                {t('admin:import.unmatchedCategories', { names: item.unmatchedCategories.join(', ') })}
              </p>
            )}
            {item.categories.length === 0 && item.unmatchedCategories.length === 0 && (
              <p className="text-xs text-warning">{t('admin:import.noCategories')}</p>
            )}
            {item.match && (
              <p className="text-xs text-ink-muted">
                {t('admin:import.matchHint', { title: loc(item.match.title, lang), code: item.match.code ?? '—' })}
                {item.match.status === 'archived' && ` (${t('status.archived')})`}
              </p>
            )}
          </>
        )}
        <a href={item.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-semibold text-emerald hover:underline">
          {t('admin:import.viewOnSite')}
          <ExternalLink size={12} strokeWidth={1.75} aria-hidden="true" />
        </a>
      </div>
      <div className="space-y-2 sm:w-64">
        <Select
          placeholder={false}
          value={action}
          onChange={(e) => onAction(e.target.value)}
          options={item.error ? options.filter((o) => o.value !== 'create' && o.value !== 'merge') : options}
          aria-label={t('admin:import.actionFor', { title: item.title })}
        />
        {action === 'merge' && (
          <Select
            value={target ?? ''}
            onChange={(e) => onTarget(e.target.value)}
            placeholder={t('admin:import.mergeTarget')}
            aria-label={t('admin:import.mergeTarget')}
            error={target ? undefined : t('admin:import.mergeTargetRequired')}
            options={[...programmes]
              .sort((a, b) => (a.catalogue === item.catalogue ? 0 : 1) - (b.catalogue === item.catalogue ? 0 : 1))
              .map((p) => ({ value: p.id, label: `${p.code ? `${p.code} · ` : ''}${loc(p.title, lang)}` }))}
          />
        )}
      </div>
    </li>
  );
}

function ImportResult({ result, onClose }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.resolvedLanguage;
  return (
    <div className="space-y-4">
      <Alert variant="success" title={t('admin:import.done')}>
        {t('admin:import.doneSummary', {
          created: result.created.length,
          merged: result.merged.length,
          ignored: result.ignored.length,
        })}
      </Alert>
      {result.created.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">{t('admin:import.createdTitle')}</h3>
          <p className="text-sm text-ink-muted">{t('admin:import.reviewDrafts')}</p>
          <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
            {result.created.map(({ programme }) => (
              <li key={programme.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                <span className="min-w-0 truncate">
                  {loc(programme.title, lang)} <span className="text-xs text-ink-muted">{programme.code}</span>
                </span>
                <Button as={Link} to={`/admin/programmes/${programme.id}/edit`} size="sm" variant="outline" onClick={onClose}>
                  {t('actions.edit')}
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}
      {result.merged.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">{t('admin:import.mergedTitle')}</h3>
          <ul className="space-y-1 text-sm">
            {result.merged.map((m) => (
              <li key={m.url}>
                <Link to={`/admin/programmes/${m.programme.id}`} className="font-medium text-emerald hover:underline" onClick={onClose}>
                  {loc(m.programme.title, lang)}
                </Link>{' '}
                — {t('admin:import.intakesAdded', { count: m.intakesAdded })}
              </li>
            ))}
          </ul>
        </section>
      )}
      {result.failed.length > 0 && (
        <Alert variant="danger" title={t('admin:import.failedTitle', { count: result.failed.length })}>
          <ul className="list-disc pl-4">
            {result.failed.map((f) => (
              <li key={f.url}>
                <a href={f.url} target="_blank" rel="noreferrer" className="underline">
                  {f.url.split('/').filter(Boolean).pop()}
                </a>{' '}
                — {t(`errors:${f.code}`, { defaultValue: t('admin:import.pageFailed') })}
              </li>
            ))}
          </ul>
        </Alert>
      )}
    </div>
  );
}

/**
 * Admin → Programmes → "Import from campus2b.com". Lists courses on the C2B WordPress site that are not on
 * the platform yet; each can be imported as a draft, added as new dates to a matching programme, or ignored.
 */
export default function ImportProgrammesModal({ open, onClose }) {
  const { t, i18n } = useTranslation();
  const [nonce, setNonce] = useState(0);
  const [actions, setActions] = useState({}); // url → action chosen by the admin
  const [targets, setTargets] = useState({}); // url → programme id to link to (merge)
  const [result, setResult] = useState(null);
  const [showIgnored, setShowIgnored] = useState(false);
  const preview = useImportPreview(nonce, open);
  const apply = useApplyImport();
  const restore = useRestoreIgnored();
  const programmesQuery = useAdminProgrammes({ all: true });
  const programmes = (programmesQuery.data?.items ?? []).filter((p) => p.status !== 'archived');

  const data = preview.data;
  const items = data?.items ?? [];
  const actionOf = (item) => actions[item.url] ?? defaultAction(item);
  const chosen = items.filter((i) => actionOf(i) !== 'skip');
  const targetOf = (item) => targets[item.url] ?? item.match?.id ?? null;
  const missingTarget = chosen.some((i) => actionOf(i) === 'merge' && !targetOf(i));

  const close = () => {
    setResult(null);
    setActions({});
    setTargets({});
    onClose();
  };

  const submit = () =>
    apply.mutate(
      chosen.map((i) => {
        const action = actionOf(i);
        if (action === 'merge') return { url: i.url, action, programmeId: targetOf(i) };
        if (action === 'ignore') return { url: i.url, action, title: i.title };
        return { url: i.url, action };
      }),
      {
        onSuccess: (res) => {
          setResult(res);
          setActions({});
          setTargets({});
          if (res.failed.length === 0) toast.success(t('admin:import.done'));
        },
        onError: toast.apiError,
      },
    );

  const checkedAt = data?.checkedAt
    ? new Intl.DateTimeFormat(i18n.resolvedLanguage, { hour: '2-digit', minute: '2-digit' }).format(new Date(data.checkedAt))
    : null;

  let body;
  if (result) {
    body = <ImportResult result={result} onClose={close} />;
  } else if (preview.isPending || (preview.isFetching && !data)) {
    body = (
      <div className="flex flex-col items-center gap-3 py-12 text-center text-ink-muted" role="status">
        <Spinner size="lg" className="text-emerald" />
        <p className="font-medium text-ink">{t('admin:import.checking')}</p>
        <p className="max-w-sm text-sm">{t('admin:import.checkingHint')}</p>
      </div>
    );
  } else if (preview.isError) {
    body = (
      <Alert variant="danger" title={t('admin:import.loadError')}>
        <p>{t(`errors:${preview.error?.response?.data?.code ?? 'NETWORK_ERROR'}`, { defaultValue: t('errors:NETWORK_ERROR') })}</p>
        <Button size="sm" variant="outline" className="mt-3" onClick={() => setNonce((n) => n + 1)}>
          {t('actions.retry')}
        </Button>
      </Alert>
    );
  } else {
    body = (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-ink-muted">
          <p>
            {t('admin:import.summary', { total: data.totalOnSite, imported: data.alreadyImported, count: items.length })}
            {checkedAt && ` · ${t('admin:import.checkedAt', { time: checkedAt })}`}
          </p>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setNonce((n) => n + 1)}
            loading={preview.isFetching}
            leftIcon={<RefreshCw size={14} strokeWidth={1.75} aria-hidden="true" />}
          >
            {t('admin:import.checkAgain')}
          </Button>
        </div>

        {items.length === 0 ? (
          <EmptyState
            illustration={<CheckCircle2 size={32} strokeWidth={1.75} aria-hidden="true" />}
            title={t('admin:import.upToDate')}
            description={t('admin:import.upToDateText')}
          />
        ) : (
          <>
            <Alert variant="info">{t('admin:import.draftNote')}</Alert>
            {data.truncated && <Alert variant="warning">{t('admin:import.truncated', { count: items.length })}</Alert>}
            <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
              {items.map((item) => (
                <ImportItem
                  key={item.url}
                  item={item}
                  action={actionOf(item)}
                  onAction={(a) => setActions((s) => ({ ...s, [item.url]: a }))}
                  target={targetOf(item)}
                  onTarget={(id) => setTargets((s) => ({ ...s, [item.url]: id || null }))}
                  programmes={programmes}
                />
              ))}
            </ul>
          </>
        )}

        {data.ignored.length > 0 && (
          <section className="space-y-2">
            <button
              type="button"
              className="text-sm font-semibold text-emerald hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald"
              aria-expanded={showIgnored}
              onClick={() => setShowIgnored((v) => !v)}
            >
              {t('admin:import.ignoredToggle', { count: data.ignored.length })}
            </button>
            {showIgnored && (
              <ul className="divide-y divide-line rounded-xl border border-line bg-surface">
                {data.ignored.map((ig) => (
                  <li key={ig.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                    <a href={ig.url} target="_blank" rel="noreferrer" className="min-w-0 truncate hover:underline" lang="es">
                      {ig.title || ig.url}
                    </a>
                    <Button
                      size="sm"
                      variant="ghost"
                      loading={restore.isPending && restore.variables === ig.id}
                      onClick={() => restore.mutate(ig.id, { onSuccess: () => toast.success(t('admin:import.restored')), onError: toast.apiError })}
                      leftIcon={<RotateCcw size={14} strokeWidth={1.75} aria-hidden="true" />}
                    >
                      {t('admin:import.restore')}
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    );
  }

  return (
    <Modal
      open={open}
      onClose={close}
      size="xl"
      title={t('admin:import.title')}
      description={t('admin:import.subtitle')}
      footer={
        result ? (
          <Button onClick={close}>{t('actions.close')}</Button>
        ) : (
          <>
            <Button variant="ghost" onClick={close}>
              {t('actions.cancel')}
            </Button>
            <Button onClick={submit} loading={apply.isPending} disabled={!data || chosen.length === 0 || missingTarget}>
              {t('admin:import.apply', { count: chosen.length })}
            </Button>
          </>
        )
      }
    >
      {body}
    </Modal>
  );
}
