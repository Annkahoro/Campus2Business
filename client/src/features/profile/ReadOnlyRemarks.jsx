import { useTranslation } from 'react-i18next';
import { Lock } from 'lucide-react';
import Badge from '../../components/ui/Badge.jsx';

/**
 * "Remarks from your organization (read-only)" — docs/08 §5. Employees can read but never edit:
 * there are no edit controls here and the API exposes no edit endpoint to them.
 */
export default function ReadOnlyRemarks({ remarks }) {
  const { t, i18n } = useTranslation('profile');
  if (!remarks?.length) return null;
  const fmt = new Intl.DateTimeFormat(i18n.resolvedLanguage, { dateStyle: 'medium' });

  return (
    <section aria-labelledby="org-remarks" className="rounded-xl border-l-4 border-emerald bg-mint-soft p-5">
      <h2 id="org-remarks" className="flex items-center gap-2 font-display text-base font-semibold text-emerald-darker">
        <Lock size={18} strokeWidth={1.75} aria-hidden="true" />
        {t('remarks.title')}
      </h2>
      <ul className="mt-3 space-y-3">
        {remarks.map((r) => (
          <li key={r.id} className="rounded-lg bg-surface p-3">
            <div className="mb-1 flex flex-wrap items-center gap-2 text-xs text-ink-muted">
              <Badge variant="soft">{t(`remarks.categories.${r.category}`)}</Badge>
              {r.authorName && <span>{r.authorName}</span>}
              <span>· {fmt.format(new Date(r.updatedAt ?? r.createdAt))}</span>
            </div>
            <p className="whitespace-pre-line text-sm text-ink">{r.text}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}
