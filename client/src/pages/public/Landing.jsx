import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  Building2,
  CheckCircle2,
  Compass,
  GraduationCap,
  History,
  Languages,
  Link2,
  ListOrdered,
  MessageSquareText,
  Receipt,
  Rocket,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  UserRound,
  Users,
} from 'lucide-react';
import { Button } from '../../components/ui/index.js';
import ProgrammeCard from '../../features/programmes/ProgrammeCard.jsx';
import { useProgrammes } from '../../features/programmes/hooks.js';
import { usePublicStats } from '../../features/landing/hooks.js';
import { CATEGORIES } from '../../features/programmes/constants.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { homeFor } from '../../lib/roles.js';
import heroImg from '../../assets/images/photos/hero-learning.webp';
import mentorImg from '../../assets/images/photos/mentor-session.webp';
import studentsImg from '../../assets/images/photos/students-campus.webp';
import orgImg from '../../assets/images/photos/organization-team.webp';
import ctaImg from '../../assets/images/photos/cta-band.webp';

const icon = (Icon, cls = '') => <Icon size={22} strokeWidth={1.75} className={cls} aria-hidden="true" />;

function SectionHeader({ eyebrow, title, text, center = false }) {
  return (
    <div className={center ? 'mx-auto max-w-2xl text-center' : 'max-w-2xl'}>
      {eyebrow && <p className="text-sm font-semibold uppercase tracking-wide text-emerald">{eyebrow}</p>}
      <h2 className="mt-2 font-display text-3xl font-bold text-ink md:text-4xl">{title}</h2>
      {text && <p className="mt-4 text-lg text-ink-muted">{text}</p>}
    </div>
  );
}

function BenefitList({ items }) {
  return (
    <ul className="space-y-4">
      {items.map(({ Icon, title, text }) => (
        <li key={title} className="flex gap-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-mint text-emerald-darker">{icon(Icon)}</span>
          <div>
            <p className="font-semibold text-ink">{title}</p>
            <p className="text-ink-muted">{text}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ───────── Hero ───────── */
function Hero() {
  const { t } = useTranslation('landing');
  const { isAuthenticated, user } = useAuth();
  const steps = ['step1', 'step2', 'step3'];
  return (
    <section className="bg-cream">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-14 md:px-8 lg:grid-cols-2 lg:py-20">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-mint-soft px-3 py-1 text-sm font-semibold text-emerald-darker">
            <Sparkles size={16} strokeWidth={1.75} aria-hidden="true" />
            {t('hero.eyebrow')}
          </p>
          <h1 className="mt-5 font-display text-4xl font-extrabold leading-tight text-ink md:text-5xl lg:text-6xl">{t('hero.title')}</h1>
          <p className="mt-5 max-w-xl text-lg text-ink-muted">{t('hero.text')}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            {isAuthenticated ? (
              <Button as={Link} to={homeFor(user)} size="lg" rightIcon={<ArrowRight size={18} aria-hidden="true" />}>
                {t('hero.dashboard')}
              </Button>
            ) : (
              <>
                <Button as={Link} to="/register" size="lg" leftIcon={<GraduationCap size={20} aria-hidden="true" />}>
                  {t('hero.ctaStudent')}
                </Button>
                <Button as={Link} to="/register-organization" size="lg" variant="outline" leftIcon={<Building2 size={20} aria-hidden="true" />}>
                  {t('hero.ctaOrg')}
                </Button>
              </>
            )}
          </div>
          <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-muted">
            {['point1', 'point2', 'point3'].map((k) => (
              <li key={k} className="inline-flex items-center gap-2">
                <CheckCircle2 size={18} strokeWidth={1.75} className="text-emerald" aria-hidden="true" />
                {t(`hero.${k}`)}
              </li>
            ))}
          </ul>
        </div>

        {/* Photo on a solid mint block, with a flat sample-pathway card */}
        <div className="relative">
          <div className="absolute -right-4 -top-4 hidden h-full w-full rounded-[2rem] bg-mint sm:block" aria-hidden="true" />
          <img
            src={heroImg}
            alt={t('hero.imageAlt')}
            width="1600"
            height="1200"
            fetchPriority="high"
            className="relative aspect-[4/3] w-full rounded-[2rem] object-cover"
          />
          <div className="relative -mt-16 ml-4 max-w-xs rounded-2xl border border-line bg-surface p-4 shadow-[var(--shadow-card)] sm:absolute sm:-bottom-8 sm:-left-6 sm:mt-0 sm:ml-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald">{t('hero.cardTitle')}</p>
            <ol className="mt-3 space-y-2.5">
              {steps.map((s, i) => (
                <li key={s} className="flex items-center gap-3 text-sm">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald text-xs font-bold text-white">{i + 1}</span>
                  <span className="font-medium text-ink">{t(`hero.${s}`)}</span>
                </li>
              ))}
            </ol>
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-mint-soft px-2.5 py-1 text-xs font-semibold text-emerald-darker">
              <ShieldCheck size={14} strokeWidth={2} aria-hidden="true" />
              {t('hero.cardReviewed')}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ───────── About C2B ───────── */
function AboutC2B() {
  const { t } = useTranslation('landing');
  const pillars = [
    { Icon: UserRound, key: 'experts' },
    { Icon: Sparkles, key: 'ai' },
    { Icon: History, key: 'history' },
    { Icon: Languages, key: 'bilingual' },
  ];
  return (
    <section id="about" className="scroll-mt-20 bg-surface">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 md:px-8 lg:grid-cols-2 lg:py-24">
        <div className="order-2 lg:order-1">
          <img src={mentorImg} alt={t('about.imageAlt')} loading="lazy" width="1200" height="800" className="aspect-[3/2] w-full rounded-[2rem] object-cover" />
        </div>
        <div className="order-1 space-y-8 lg:order-2">
          <SectionHeader eyebrow={t('about.eyebrow')} title={t('about.title')} text={t('about.text')} />
          <ul className="grid gap-5 sm:grid-cols-2">
            {pillars.map(({ Icon, key }) => (
              <li key={key} className="rounded-2xl border border-line bg-cream p-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald text-white">{icon(Icon)}</span>
                <p className="mt-3 font-semibold text-ink">{t(`about.pillars.${key}.title`)}</p>
                <p className="mt-1 text-sm text-ink-muted">{t(`about.pillars.${key}.text`)}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-line">
        <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
          <p className="text-center text-sm font-semibold text-ink-muted">{t('about.areas')}</p>
          <ul className="mt-4 flex flex-wrap justify-center gap-2">
            {CATEGORIES.map((c) => (
              <li key={c}>
                <Link
                  to={`/programmes?category=${c}`}
                  className="inline-block rounded-full border border-line bg-cream px-3.5 py-1.5 text-sm font-medium text-ink hover:border-emerald hover:text-emerald focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald"
                >
                  {t(`programme.categories.${c}`, { ns: 'common' })}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/* ───────── How it works ───────── */
function HowItWorks() {
  const { t } = useTranslation('landing');
  const steps = [
    { Icon: UserRound, key: 'profile' },
    { Icon: Sparkles, key: 'design' },
    { Icon: Rocket, key: 'grow' },
  ];
  return (
    <section id="how" className="scroll-mt-20 bg-cream">
      <div className="mx-auto max-w-7xl px-4 py-16 md:px-8 lg:py-24">
        <SectionHeader center eyebrow={t('how.eyebrow')} title={t('how.title')} text={t('how.text')} />
        <ol className="mt-12 grid gap-6 md:grid-cols-3">
          {steps.map(({ Icon, key }, i) => (
            <li key={key} className="relative rounded-[var(--radius-card)] border border-line bg-surface p-6 shadow-[var(--shadow-card)]">
              <span className="font-display text-5xl font-extrabold text-mint" aria-hidden="true">
                0{i + 1}
              </span>
              <span className="mt-2 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald text-white">{icon(Icon)}</span>
              <h3 className="mt-4 text-xl font-semibold">{t(`how.steps.${key}.title`)}</h3>
              <p className="mt-2 text-ink-muted">{t(`how.steps.${key}.text`)}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

/* ───────── For students ───────── */
function ForStudents() {
  const { t } = useTranslation('landing');
  const items = [
    { Icon: Compass, key: 'match' },
    { Icon: ListOrdered, key: 'order' },
    { Icon: MessageSquareText, key: 'why' },
    { Icon: TrendingUp, key: 'track' },
  ].map(({ Icon, key }) => ({ Icon, title: t(`students.items.${key}.title`), text: t(`students.items.${key}.text`) }));
  return (
    <section id="students" className="scroll-mt-20 bg-surface">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 md:px-8 lg:grid-cols-2 lg:py-24">
        <div className="space-y-8">
          <SectionHeader eyebrow={t('students.eyebrow')} title={t('students.title')} text={t('students.text')} />
          <BenefitList items={items} />
          <Button as={Link} to="/register" size="lg" rightIcon={<ArrowRight size={18} aria-hidden="true" />}>
            {t('students.cta')}
          </Button>
        </div>
        <div className="relative">
          <div className="absolute -bottom-4 -left-4 hidden h-full w-full rounded-[2rem] bg-cream-dark sm:block" aria-hidden="true" />
          <img src={studentsImg} alt={t('students.imageAlt')} loading="lazy" width="1200" height="900" className="relative aspect-[4/3] w-full rounded-[2rem] object-cover" />
        </div>
      </div>
    </section>
  );
}

/* ───────── For organizations ───────── */
function ForOrganizations() {
  const { t } = useTranslation('landing');
  const items = [
    { Icon: Link2, key: 'invite' },
    { Icon: Target, key: 'remarks' },
    { Icon: Receipt, key: 'enroll' },
    { Icon: BarChart3, key: 'reports' },
  ].map(({ Icon, key }) => ({ Icon, title: t(`orgs.items.${key}.title`), text: t(`orgs.items.${key}.text`) }));
  return (
    <section id="organizations" className="scroll-mt-20 bg-mint-soft">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 md:px-8 lg:grid-cols-2 lg:py-24">
        <div className="relative order-2 lg:order-1">
          <div className="absolute -right-4 -top-4 hidden h-full w-full rounded-[2rem] bg-mint sm:block" aria-hidden="true" />
          <img src={orgImg} alt={t('orgs.imageAlt')} loading="lazy" width="1200" height="800" className="relative aspect-[3/2] w-full rounded-[2rem] object-cover" />
        </div>
        <div className="order-1 space-y-8 lg:order-2">
          <SectionHeader eyebrow={t('orgs.eyebrow')} title={t('orgs.title')} text={t('orgs.text')} />
          <BenefitList items={items} />
          <div className="flex flex-wrap gap-3">
            <Button as={Link} to="/register-organization" size="lg" rightIcon={<ArrowRight size={18} aria-hidden="true" />}>
              {t('orgs.cta')}
            </Button>
          </div>
          <p className="text-sm text-ink-muted">{t('orgs.note')}</p>
        </div>
      </div>
    </section>
  );
}

/* ───────── Featured programmes ───────── */
function FeaturedProgrammes() {
  const { t } = useTranslation('landing');
  const query = useProgrammes({ limit: 6 });
  const items = query.data?.items ?? [];
  if (!query.isPending && items.length === 0) return null;
  return (
    <section id="programmes" className="scroll-mt-20 bg-cream">
      <div className="mx-auto max-w-7xl px-4 py-16 md:px-8 lg:py-24">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeader eyebrow={t('programmes.eyebrow')} title={t('programmes.title')} text={t('programmes.text')} />
          <Button as={Link} to="/programmes" variant="outline" rightIcon={<ArrowRight size={18} aria-hidden="true" />}>
            {t('programmes.all')}
          </Button>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {query.isPending
            ? Array.from({ length: 3 }, (_, i) => <div key={i} className="h-80 animate-pulse rounded-[var(--radius-card)] bg-cream-dark" />)
            : items.map((p) => <ProgrammeCard key={p.id} programme={p} to={`/programmes/${p.id}`} />)}
        </div>
      </div>
    </section>
  );
}

/* ───────── Stats band ───────── */
function StatsBand() {
  const { t, i18n } = useTranslation('landing');
  const { data } = usePublicStats();
  const fmt = new Intl.NumberFormat(i18n.resolvedLanguage);
  const stats = [
    { Icon: BookOpenCheck, key: 'programmes' },
    { Icon: Users, key: 'learners' },
    { Icon: Building2, key: 'organizations' },
    { Icon: GraduationCap, key: 'completions' },
  ];
  return (
    <section aria-label={t('stats.label')} className="bg-emerald text-white">
      <dl className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-4 py-14 md:grid-cols-4 md:px-8">
        {stats.map(({ Icon, key }) => (
          <div key={key} className="text-center">
            <Icon size={28} strokeWidth={1.75} className="mx-auto text-mint" aria-hidden="true" />
            <dd className="mt-3 font-display text-4xl font-extrabold">{data ? fmt.format(data[key]) : '—'}</dd>
            <dt className="mt-1 text-sm text-mint-soft">{t(`stats.${key}`)}</dt>
          </div>
        ))}
      </dl>
    </section>
  );
}

/* ───────── CTA band (photo + solid emerald overlay, docs/13 §6) ───────── */
function CtaBand() {
  const { t } = useTranslation('landing');
  return (
    <section className="relative overflow-hidden">
      <img src={ctaImg} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-emerald-darker/85" aria-hidden="true" />
      <div className="relative mx-auto max-w-4xl px-4 py-20 text-center text-white md:px-8">
        <h2 className="font-display text-3xl font-bold md:text-4xl">{t('cta.title')}</h2>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-mint-soft">{t('cta.text')}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button as={Link} to="/register" size="lg" variant="secondary">
            {t('cta.student')}
          </Button>
          <Button as={Link} to="/register-organization" size="lg" variant="outline" className="border-white text-white hover:bg-emerald-dark">
            {t('cta.org')}
          </Button>
        </div>
      </div>
    </section>
  );
}

/** `/` — public landing page (docs/09 §Landing): C2B, students and organizations sections. */
export default function Landing() {
  const { hash } = useLocation();

  // Navbar links like /#students scroll to their section (React Router does not do this by itself).
  useEffect(() => {
    if (!hash) return;
    const el = document.getElementById(hash.slice(1));
    if (el) requestAnimationFrame(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }, [hash]);

  return (
    <>
      <Hero />
      <AboutC2B />
      <HowItWorks />
      <ForStudents />
      <ForOrganizations />
      <FeaturedProgrammes />
      <StatsBand />
      <CtaBand />
    </>
  );
}
