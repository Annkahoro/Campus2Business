import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertCircle, GraduationCap } from 'lucide-react';
import { Button, Card, EmptyState, PageSpinner } from '../../components/ui/index.js';
import EnrollmentCard from '../../features/enrollments/EnrollmentCard.jsx';
import PaymentSimulator from '../../features/enrollments/PaymentSimulator.jsx';
import { useMyEnrollments } from '../../features/enrollments/hooks.js';
import { LEARNING_GROUPS } from '../../features/enrollments/constants.js';

/** /learner/learning — enrollments by status, simulated payment, progress, ratings (docs/09). */
export default function MyLearning() {
  const { t } = useTranslation('learning');
  const query = useMyEnrollments();
  const [paying, setPaying] = useState(null);

  if (query.isPending) return <PageSpinner />;
  if (query.isError) {
    return (
      <EmptyState
        illustration={<AlertCircle size={32} strokeWidth={1.75} aria-hidden="true" />}
        title={t('loadError')}
        action={<Button onClick={() => query.refetch()}>{t('actions.retry')}</Button>}
      />
    );
  }

  const items = query.data;
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold md:text-3xl">{t('title')}</h1>
        <p className="mt-1 text-ink-muted">{t('subtitle')}</p>
      </div>

      {items.length === 0 ? (
        <Card>
          <EmptyState
            illustration={<GraduationCap size={32} strokeWidth={1.75} aria-hidden="true" />}
            title={t('emptyTitle')}
            description={t('emptyText')}
            action={
              <div className="flex flex-wrap justify-center gap-3">
                <Button as={Link} to="/learner/pathway">
                  {t('goToPathway')}
                </Button>
                <Button as={Link} to="/learner/programmes" variant="outline">
                  {t('browse')}
                </Button>
              </div>
            }
          />
        </Card>
      ) : (
        LEARNING_GROUPS.map(({ key, statuses }) => {
          const group = items.filter((e) => statuses.includes(e.status));
          if (group.length === 0) return null;
          return (
            <section key={key} aria-labelledby={`group-${key}`} className="space-y-3">
              <h2 id={`group-${key}`} className="font-display text-xl font-semibold">
                {t(`groups.${key}`)} <span className="text-base font-normal text-ink-muted">({group.length})</span>
              </h2>
              <div className="grid gap-4 xl:grid-cols-2">
                {group.map((e) => (
                  <EnrollmentCard
                    key={e.id}
                    enrollment={e}
                    onPay={setPaying}
                    canRate
                    programmeHref={(id) => `/learner/programmes/${id}`}
                  />
                ))}
              </div>
            </section>
          );
        })
      )}

      <PaymentSimulator key={paying?.id} enrollment={paying} open={!!paying} onClose={() => setPaying(null)} />
    </div>
  );
}
