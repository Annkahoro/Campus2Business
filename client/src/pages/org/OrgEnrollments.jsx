import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, ClipboardList } from 'lucide-react';
import { Badge, Button, Card, EmptyState, Input, Spinner, Tabs } from '../../components/ui/index.js';
import EnrollmentCard from '../../features/enrollments/EnrollmentCard.jsx';
import PaymentSimulator from '../../features/enrollments/PaymentSimulator.jsx';
import { useOrgEnrollments } from '../../features/enrollments/hooks.js';

const TABS = ['all', 'payment_pending', 'requested', 'active', 'completed'];

/** /org/enrollments — employees' enrollments, progress, simulated employer payment (docs/09). */
export default function OrgEnrollments() {
  const { t } = useTranslation('learning');
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const query = useOrgEnrollments({ search });
  const [paying, setPaying] = useState(null);

  const all = query.data ?? [];
  const items = tab === 'all' ? all : all.filter((e) => e.status === tab);
  const count = (s) => all.filter((e) => e.status === s).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold md:text-3xl">{t('org.title')}</h1>
        <p className="mt-1 text-ink-muted">{t('org.subtitle')}</p>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <Tabs
          label={t('org.title')}
          value={tab}
          onChange={setTab}
          className="flex-wrap"
          tabs={TABS.map((s) => ({
            value: s,
            label: s === 'all' ? t('org.all') : t(`status.${s}`),
            badge: s !== 'all' && count(s) ? <Badge variant={s === 'payment_pending' ? 'pending' : 'neutral'}>{count(s)}</Badge> : null,
          }))}
        />
        <Input
          className="w-full sm:w-72"
          label={t('org.search')}
          placeholder={t('org.searchPlaceholder')}
          onKeyDown={(e) => e.key === 'Enter' && setSearch(e.currentTarget.value.trim())}
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
          <EmptyState illustration={<ClipboardList size={32} strokeWidth={1.75} aria-hidden="true" />} title={t('org.emptyTitle')} description={t('org.emptyText')} />
        </Card>
      )}
      {items.length > 0 && (
        <div className="grid gap-4 xl:grid-cols-2">
          {items.map((e) => (
            <EnrollmentCard key={e.id} enrollment={e} onPay={setPaying} showLearner />
          ))}
        </div>
      )}

      <PaymentSimulator key={paying?.id} enrollment={paying} open={!!paying} onClose={() => setPaying(null)} />
    </div>
  );
}
