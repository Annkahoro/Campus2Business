/**
 * Reads the public campus2b.com WordPress site (no API key needed).
 *
 * Course discovery: the Yoast course-category sitemap lists every course category page; each category page
 * (and its /page/N/ pages) lists course cards linking to /formacion-categoria/<slug>/. The two catalogue
 * landing pages are read too, so a course that is only on the calendar is still found.
 *
 * Only URLs on SITE_ORIGIN are ever fetched (the import endpoints receive URLs from the browser).
 */
import * as cheerio from 'cheerio';

export const SITE_ORIGIN = 'https://www.campus2b.com';
const COURSE_PATH = '/formacion-categoria/';
const EXTRA_LISTINGS = [`${SITE_ORIGIN}/calendario-formativo/`, `${SITE_ORIGIN}/formacion/`];
const VENUE = 'C. de Pérez Galdós, 22, Abando, 48010 Bilbao (Bizkaia)';
const TIMEOUT_MS = 15_000;
const CONCURRENCY = 4;
const MAX_PAGES_PER_CATEGORY = 10;

/* ───────────── helpers ───────────── */

const clean = (s) => (s ?? '').replace(/[​ ]/g, ' ').replace(/\s+/g, ' ').trim();

/** Lower-case, accents removed — for comparing names and titles. */
export const normalize = (s) =>
  clean(s)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/** True for https://www.campus2b.com/formacion-categoria/<slug>/ (with or without www / trailing slash). */
export function isCourseUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && /^(www\.)?campus2b\.com$/.test(u.hostname) && /^\/formacion-categoria\/[a-z0-9-]+\/?$/.test(u.pathname);
  } catch {
    return false;
  }
}

/** Canonical form used for storage and comparison. */
export function canonicalCourseUrl(url) {
  const u = new URL(url);
  const slug = u.pathname.split('/').filter(Boolean).pop();
  return `${SITE_ORIGIN}${COURSE_PATH}${slug}/`;
}

async function fetchHtml(url) {
  const { origin } = new URL(url);
  if (origin !== SITE_ORIGIN) throw new Error(`Refusing to fetch ${url}`);
  const res = await fetch(url, {
    headers: { 'User-Agent': 'C2B-Platform-Importer/1.0', Accept: 'text/html,application/xml' },
    signal: AbortSignal.timeout(TIMEOUT_MS),
    redirect: 'follow',
  });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return res.text();
}

/** Runs `fn` over `items` with limited concurrency; failures are returned, not thrown. */
export async function mapLimit(items, fn, limit = CONCURRENCY) {
  const results = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      try {
        results[i] = { ok: true, value: await fn(items[i], i) };
      } catch (error) {
        results[i] = { ok: false, error };
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/* ───────────── discovery ───────────── */

function readListing(html, found) {
  const $ = cheerio.load(html);
  $('article.qodef-course-item').each((_, a) => {
    const href = $(a).find('a[itemprop=url]').first().attr('href') ?? $(a).find(`a[href*="${COURSE_PATH}"]`).first().attr('href');
    if (!href || !isCourseUrl(href)) return;
    const url = canonicalCourseUrl(href);
    const date = clean($(a).find('.c2b-course-date').text()) || null;
    if (!found.has(url) || (date && !found.get(url).date)) found.set(url, { date });
  });
  // Course list shortcode options carry the page count, e.g. {"max_pages_num":5}
  const m = html.match(/max_pages_num&quot;:\s*(\d+)/) ?? html.match(/"max_pages_num":\s*(\d+)/);
  return m ? Number(m[1]) : 1;
}

/** → Map(courseUrl → { date: listing date text | null }) */
export async function discoverCourses() {
  const sitemap = await fetchHtml(`${SITE_ORIGIN}/course-category-sitemap.xml`);
  const categoryPages = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((m) => m[1].trim())
    .filter((u) => u.startsWith(`${SITE_ORIGIN}/`));

  const found = new Map();
  const first = await mapLimit([...categoryPages, ...EXTRA_LISTINGS], async (url) => ({ url, pages: readListing(await fetchHtml(url), found) }));
  if (first.every((r) => !r.ok)) throw new Error('campus2b.com could not be read');

  const extra = first
    .filter((r) => r.ok && r.value.pages > 1)
    .flatMap(({ value }) =>
      Array.from({ length: Math.min(value.pages, MAX_PAGES_PER_CATEGORY) - 1 }, (_, i) => `${value.url.replace(/\/?$/, '/')}page/${i + 2}/`),
    );
  await mapLimit(extra, async (url) => readListing(await fetchHtml(url), found));
  return found;
}

/* ───────────── course page ───────────── */

export async function scrapeCourse(url, listingDate = null) {
  const html = await fetchHtml(canonicalCourseUrl(url));
  const $ = cheerio.load(html.replace(/<br\s*\/?>/gi, ' '));
  $('script,style,svg').remove();

  // Headings and content widgets in document order; the content of a heading is the next content widget.
  const seq = $('h1,h2,h3,h4,h5,h6,.elementor-widget-text-editor,.elementor-widget-icon-list').toArray();
  const listAfter = (re) => {
    const idx = seq.findIndex((el) => /^h\d$/.test(el.tagName) && re.test(clean($(el).text())));
    if (idx < 0) return [];
    const next = seq.slice(idx + 1).find((el) => !/^h\d$/.test(el.tagName));
    if (!next) return [];
    const n = $(next);
    const lis = n.find('li').map((_, li) => clean($(li).text())).get().filter(Boolean);
    if (lis.length) return lis;
    const ps = n.find('p').map((_, p) => clean($(p).text())).get().filter(Boolean);
    return ps.length ? ps : [clean(n.text())].filter(Boolean);
  };

  const info = {};
  $('.elementor-widget-container').each((_, el) => {
    const label = clean($(el).text());
    if (['Email', 'Organizador', 'Teléfono', 'Modalidad', 'Fecha', 'Fechas', 'Horario', 'Duración', 'Horas', 'Lugar'].includes(label)) {
      const value = clean($(el).closest('.elementor-element').next().text());
      if (value && !info[label]) info[label] = value;
    }
  });

  return {
    url: canonicalCourseUrl(url),
    title: clean($('h1').first().text()),
    price: clean($('.qodef-price').first().text()) || null,
    categories: $('.qodef-e-info--categories')
      .first()
      .find('a')
      .map((_, a) => ({ name: clean($(a).text()), slug: ($(a).attr('href') ?? '').split('/').filter(Boolean).pop() }))
      .get(),
    image: $('meta[property="og:image"]').attr('content') ?? null,
    info,
    about: listAfter(/^Sobre la formaci/i).join('\n'),
    topics: listAfter(/^Temas que se van/i),
    idealFor: listAfter(/^Es para tu empresa/i),
    listingDate,
  };
}

/* ───────────── mapping to a Programme ───────────── */

const MONTHS = { enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8, septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12 };
const toISO = (d, m, y) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

/** Year for "19 de octubre" style dates without a year: this year, or next year if that is long past. */
function guessYear(month, day) {
  const now = new Date();
  const thisYear = now.getFullYear();
  const candidate = new Date(Date.UTC(thisYear, month - 1, day));
  return now - candidate > 180 * 24 * 3600 * 1000 ? thisYear + 1 : thisYear;
}

function datesFrom(text) {
  const out = [];
  for (const [, d, m, y] of (text ?? '').matchAll(/(\d{1,2})\/(\d{1,2})\/(\d{4})/g)) out.push(toISO(d, m, y));
  if (!out.length) {
    // "19, 22, 27 y 29 de octubre" / "26, 28 de octubre, 2, 4 de noviembre"
    for (const [, days, month] of (text ?? '').matchAll(/((?:\d{1,2}(?:,\s*|\s+y\s+)?)+)\s+de\s+([a-záéíóú]+)/gi)) {
      const m = MONTHS[month.toLowerCase()];
      if (!m) continue;
      for (const d of days.match(/\d{1,2}/g)) out.push(toISO(d, m, guessYear(m, Number(d))));
    }
  }
  return [...new Set(out)].sort();
}

const DAY_EN = [
  [/mi[eé]rcoles/gi, 'Wednesday'],
  [/lunes/gi, 'Monday'],
  [/martes/gi, 'Tuesday'],
  [/jueves/gi, 'Thursday'],
  [/viernes/gi, 'Friday'],
];
function noteEn(es) {
  let s = es.replace(/^De\s+/i, '').replace(/^Los días\s+/i, 'Days ').replace(/Último día hasta las/i, 'last day until');
  for (const [re, en] of DAY_EN) s = s.replace(re, en);
  s = s.replace(/\s+y\s+/g, ' and ').replace(/\s+a\s+/g, ' to ').replace(/,(\S)/g, ', $1');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function intakeFrom(page) {
  const dates = datesFrom(page.listingDate).length ? datesFrom(page.listingDate) : datesFrom(page.info.Fecha ?? page.info.Fechas);
  if (!dates.length) return null;
  const schedule = page.info.Horario ?? '';
  const hm = (schedule || page.listingDate || '').match(/(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2})/);
  const paren = schedule
    .match(/\(([^)]+)\)/)?.[1]
    ?.trim()
    .replace(/Miercoles/gi, 'miércoles')
    .replace(/,(\S)/g, ', $1')
    .replace(/(?<=\S\s|,\s)(Lunes|Martes|Miércoles|Jueves|Viernes)/g, (d) => d.toLowerCase())
    .replace(/^./, (c) => c.toUpperCase());
  const inPerson = /^presencial/i.test(page.info.Modalidad ?? '');
  const pad = (t) => (t ? t.padStart(5, '0') : undefined);
  return {
    startDate: dates[0],
    endDate: dates.length > 1 ? dates[dates.length - 1] : undefined,
    startTime: pad(hm?.[1]),
    endTime: pad(hm?.[2]),
    note: paren ? { es: paren, en: noteEn(paren) } : { en: '', es: '' },
    location: inPerson ? (clean(page.info.Lugar) || VENUE) : 'Online',
    inPerson,
  };
}

function durationFrom(info) {
  const m = (info['Duración'] ?? info.Horas ?? '').match(/(\d+(?:[.,]\d+)?)\s*(h\b|horas?|d[ií]as?|semanas?|mes(?:es)?)/i);
  if (!m) return {};
  const unit = /^h/i.test(m[2]) ? 'hours' : /^d/i.test(m[2]) ? 'days' : /^s/i.test(m[2]) ? 'weeks' : 'months';
  return { durationValue: Number(m[1].replace(',', '.')), durationUnit: unit };
}

const cleanAbout = (s) =>
  (s ?? '')
    .replace(/^OBJETIVO DEL CURSO\s*/i, '')
    .replace(/^¿Qué conseguirás con este curso\?\s*/i, '')
    .split('\n')
    .map(clean)
    .filter(Boolean)
    .join('\n');

const firstSentence = (s) => {
  const t = clean((s ?? '').split('\n')[0]);
  const m = t.match(/^(.{20,280}?[.!?])(\s|$)/);
  return m ? m[1] : t.slice(0, 280);
};

function levelFrom(title) {
  const t = normalize(title);
  if (/\bexperto\b/.test(t)) return 'expert';
  if (/\bavanzad[oa]\b/.test(t)) return 'advanced';
  if (/\bintermedi[oa]\b/.test(t)) return 'intermediate';
  return 'beginner';
}

/** Site categories that are not subject categories. */
const NON_SUBJECT = /^(destacados|catalogo-)/;

function catalogueFrom(page, intake) {
  const slugs = page.categories.map((c) => c.slug ?? '');
  if (slugs.some((s) => /catalogo-(ecademy|elearning)$/.test(s) || s.endsWith('-catalogo-elearning'))) return 'elearning';
  if (slugs.some((s) => /catalogo-(online-live-presencial|general)$/.test(s))) return 'general';
  return intake ? 'general' : 'elearning';
}

/**
 * Raw page → Programme fields (Spanish content; English left blank for the admin to translate).
 * `categories` = our Category docs; site categories are matched by name (accent/case-insensitive).
 */
export function toProgrammeData(page, categories) {
  const byName = new Map();
  for (const c of categories) {
    for (const n of [c.name?.es, c.name?.en]) if (n) byName.set(normalize(n), c.slug);
  }
  const matched = [];
  const unmatched = [];
  for (const c of page.categories) {
    if (NON_SUBJECT.test(c.slug ?? '')) continue;
    const slug = byName.get(normalize(c.name));
    if (slug) matched.push(slug);
    else unmatched.push(c.name);
  }

  const intake = intakeFrom(page);
  const catalogue = catalogueFrom(page, intake);
  const subsidised = /subvencionad/i.test(page.price ?? '');
  const amount = subsidised ? null : Number((page.price ?? '').replace(/[^\d,.]/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.')) || null;
  const about = cleanAbout(page.about);
  const intakes = catalogue === 'general' && intake ? [(({ inPerson, ...i }) => i)(intake)] : [];

  return {
    data: {
      title: { es: page.title, en: '' },
      shortDescription: { es: firstSentence(about), en: '' },
      description: { es: about, en: '' },
      catalogue,
      categories: [...new Set(matched)],
      featured: page.categories.some((c) => c.slug === 'destacados'),
      subsidised,
      topics: { es: page.topics, en: [] },
      idealFor: { es: page.idealFor, en: [] },
      organizer: clean(page.info.Organizador) || 'C2B',
      level: levelFrom(page.title),
      ...durationFrom(page.info),
      deliveryMode: catalogue === 'elearning' ? 'online' : intake?.inPerson ? 'in_person' : 'online',
      language: ['es'],
      targetAudience: ['student', 'employee'],
      price: { amount, currency: 'EUR' },
      intakes,
      sourceUrls: [page.url],
    },
    image: page.image,
    unmatchedCategories: [...new Set(unmatched)],
  };
}

/** Title used to spot another run of a course we already have ("Excel avanzado (octubre)" ≈ "Excel avanzado"). */
export function titleKey(title) {
  return normalize(title)
    .replace(/\((?:copia|horario de (?:manana|tarde)|[^)]*\b(?:edicion|convocatoria)\b[^)]*)\)/g, ' ')
    .replace(/\b(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\b/g, ' ')
    .replace(/\b\d+\s*[ªa°º]?\s*(edicion|convocatoria)\b/g, ' ')
    .replace(/\b(?:100\s*%\s*)?subvencionad[oa]s?\b/g, ' ')
    .replace(/\b20\d{2}\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}
