import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Search } from 'lucide-react';
import { Button, EmptyState, Input, Modal, Spinner } from '../../components/ui/index.js';
import { useProgrammes } from '../programmes/hooks.js';
import { useCategoryLabel } from '../programmes/hooks.js';
import { loc } from '../../lib/localized.js';

/** Searchable picker over published programmes (docs/06 §9). `excludeIds` are already used. */
export default function ProgrammePicker({ open, onClose, onPick, excludeIds = [], title }) {
  const { t, i18n } = useTranslation('pathway');
  const categoryLabel = useCategoryLabel();
  const [search, setSearch] = useState('');
  const query = useProgrammes({ search: search || undefined, limit: 50 });
  const excluded = new Set(excludeIds);
  const items = (query.data?.items ?? []).filter((p) => !excluded.has(p.id));

  return (
    <Modal open={open} onClose={onClose} title={title ?? t('editor.addProgramme')} size="lg">
      <div className="space-y-4">
        <Input
          label={t('editor.searchProgrammes')}
          placeholder={t('editor.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          autoFocus
        />
        {query.isPending ? (
          <div className="flex justify-center py-8 text-emerald">
            <Spinner size="lg" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState illustration={<Search size={28} strokeWidth={1.75} aria-hidden="true" />} title={t('editor.noProgrammes')} />
        ) : (
          <ul className="max-h-[50vh] divide-y divide-line overflow-y-auto rounded-xl border border-line">
            {items.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <p className="font-medium text-ink">{loc(p.title, i18n.resolvedLanguage)}</p>
                  <p className="text-xs text-ink-muted">
                    {[p.code, (p.categories ?? []).map(categoryLabel).join(', '), t(`programme.levels.${p.level}`, { ns: 'common' })]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onPick(p)}
                  leftIcon={<Plus size={16} strokeWidth={1.75} aria-hidden="true" />}
                  aria-label={t('editor.addNamed', { title: loc(p.title, i18n.resolvedLanguage) })}
                >
                  {t('editor.add')}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Modal>
  );
}
