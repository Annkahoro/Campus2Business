import { useTranslation } from 'react-i18next';
import { FileText } from 'lucide-react';

function Block({ title, onEdit, editLabel, children }) {
  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-display text-base font-semibold">{title}</h3>
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className="rounded text-sm font-semibold text-emerald hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald"
          >
            {editLabel}
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

const Empty = ({ children }) => <p className="text-sm italic text-ink-muted">{children}</p>;
const Chips = ({ items }) => (
  <ul className="flex flex-wrap gap-1.5">
    {items.map((x) => (
      <li key={x} className="rounded-full bg-mint-soft px-2.5 py-0.5 text-sm text-emerald-darker">
        {x}
      </li>
    ))}
  </ul>
);
const Row = ({ label, value }) =>
  value || value === 0 ? (
    <div className="grid gap-1 py-1 sm:grid-cols-[180px_1fr]">
      <dt className="text-sm text-ink-muted">{label}</dt>
      <dd className="text-sm text-ink">{value}</dd>
    </div>
  ) : null;

const years = (a, b, t) => [a, b ?? t('summary.present')].filter(Boolean).join(' – ');

/**
 * Read-only profile overview. Used by the learner review step; admin and org views reuse it later.
 * onEdit(stepKey) shows "Edit" links when provided.
 */
export default function ProfileSummary({ profile, onEdit }) {
  const { t } = useTranslation('profile');
  const { personal, education, employment, skills, goals, cv } = profile;
  const edit = (step) => (onEdit ? () => onEdit(step) : undefined);
  const editLabel = t('actions.edit');
  const emp = employment.employment ?? {};
  const prefs = goals.learningPreferences ?? {};

  return (
    <div className="space-y-4">
      <Block title={t('steps.personal.title')} onEdit={edit('personal')} editLabel={editLabel}>
        <dl>
          <Row label={t('personal.location')} value={[personal.city, personal.country].filter(Boolean).join(', ')} />
          <Row
            label={t('personal.languages')}
            value={personal.languages.map((l) => `${l.name} (${t(`personal.levels.${l.level}`)})`).join(', ')}
          />
        </dl>
        {personal.bio ? <p className="mt-2 whitespace-pre-line text-sm text-ink">{personal.bio}</p> : <Empty>{t('summary.noBio')}</Empty>}
      </Block>

      <Block title={t('steps.education.title')} onEdit={edit('education')} editLabel={editLabel}>
        {education.education.length === 0 && <Empty>{t('education.noStudies')}</Empty>}
        <ul className="space-y-2">
          {education.education.map((e) => (
            <li key={e.id} className="text-sm">
              <p className="font-medium text-ink">
                {[e.qualification, e.fieldOfStudy].filter(Boolean).join(' · ') || e.institution}
              </p>
              <p className="text-ink-muted">
                {e.institution} {e.startYear ? `· ${years(e.startYear, e.endYear, t)}` : ''}
                {e.currentYearOfStudy ? ` · ${t('summary.yearOfStudy', { n: e.currentYearOfStudy })}` : ''}
              </p>
            </li>
          ))}
        </ul>
        {education.certifications.length > 0 && (
          <div className="mt-3">
            <p className="mb-1 text-sm text-ink-muted">{t('education.certifications')}</p>
            <Chips items={education.certifications.map((c) => [c.name, c.year].filter(Boolean).join(' '))} />
          </div>
        )}
      </Block>

      <Block title={t('steps.employment.title')} onEdit={edit('employment')} editLabel={editLabel}>
        {!emp.jobTitle && !emp.department && employment.pastExperience.length === 0 ? (
          <Empty>{t('summary.noEmployment')}</Empty>
        ) : (
          <dl>
            <Row label={t('employment.jobTitle')} value={emp.jobTitle} />
            <Row label={t('employment.department')} value={emp.department} />
            <Row label={t('employment.totalYears')} value={emp.totalYearsExperience} />
            <Row label={t('employment.responsibilities')} value={emp.responsibilities} />
            <Row
              label={t('employment.pastExperience')}
              value={employment.pastExperience.map((x) => [x.title, x.company].filter(Boolean).join(' @ ')).join('; ')}
            />
          </dl>
        )}
      </Block>

      <Block title={t('steps.skills.title')} onEdit={edit('skills')} editLabel={editLabel}>
        {skills.skills.length === 0 ? (
          <Empty>{t('summary.noSkills')}</Empty>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {skills.skills.map((s) => (
              <li key={s.id} className="rounded-full border border-line px-3 py-1 text-sm">
                {s.name} <span className="text-ink-muted">· {s.level}/5</span>
              </li>
            ))}
          </ul>
        )}
      </Block>

      <Block title={t('steps.goals.title')} onEdit={edit('goals')} editLabel={editLabel}>
        <dl>
          <Row label={t('goals.shortTerm')} value={goals.careerGoals.shortTerm} />
          <Row label={t('goals.longTerm')} value={goals.careerGoals.longTerm} />
          <Row label={t('goals.targetRoles')} value={goals.careerGoals.targetRoles.join(', ')} />
          <Row label={t('goals.interests')} value={goals.interests.join(', ')} />
          <Row label={t('goals.hobbies')} value={goals.hobbies.join(', ')} />
          <Row label={t('goals.mode')} value={t(`goals.modes.${prefs.mode ?? 'any'}`)} />
          <Row label={t('goals.hoursPerWeek')} value={prefs.hoursPerWeek} />
        </dl>
        {!goals.careerGoals.shortTerm && !goals.careerGoals.longTerm && <Empty>{t('summary.noGoals')}</Empty>}
      </Block>

      <Block title={t('steps.cv.title')} onEdit={edit('cv')} editLabel={editLabel}>
        {cv ? (
          <a href={cv.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-medium text-emerald hover:underline">
            <FileText size={16} strokeWidth={1.75} aria-hidden="true" />
            {cv.fileName}
          </a>
        ) : (
          <Empty>{t('summary.noCv')}</Empty>
        )}
      </Block>
    </div>
  );
}
