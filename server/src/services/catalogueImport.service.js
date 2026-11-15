/**
 * "Import from campus2b.com" (admin): finds courses on the C2B WordPress site that are not on the platform yet
 * and lets an admin import them as draft programmes, add their dates to an existing programme (another run
 * of a course we already have), or ignore them.
 *
 * A site course counts as "already on the platform" when its URL is in any programme's `sourceUrls`
 * (whatever the programme's status) or in the ignore list.
 */
import { Programme } from '../models/Programme.js';
import { Category } from '../models/Category.js';
import { CatalogueImportIgnore } from '../models/CatalogueImportIgnore.js';
import { ApiError } from '../utils/ApiError.js';
import { isCloudinaryConfigured } from '../config/cloudinary.js';
import { uploadImageFromUrl } from './upload.service.js';
import { emitProgrammesChanged } from '../sockets/events.js';
import { canonicalCourseUrl, discoverCourses, fetchShopPrice, mapLimit, scrapeCourse, titleKey, toProgrammeData } from './import/campus2b.scraper.js';

const CACHE_MS = 10 * 60 * 1000;
const MAX_NEW_SCRAPED = 60; // safety cap per preview

/* Course pages scraped during a preview are reused by the import that follows (no second fetch). */
const pageCache = new Map(); // url → { page, at }
let discoveryCache = null; // { at, found }
let discoveryInFlight = null;

const cachedPage = (url) => {
  const hit = pageCache.get(url);
  return hit && Date.now() - hit.at < CACHE_MS ? hit.page : null;
};

async function getPage(url, listingDate) {
  const hit = cachedPage(url);
  if (hit) return hit;
  const page = await scrapeCourse(url, listingDate);
  pageCache.set(url, { page, at: Date.now() });
  return page;
}

/** Discovery is ~30 requests; share one run between concurrent previews and reuse it briefly. */
async function getDiscovery(fresh) {
  if (!fresh && discoveryCache && Date.now() - discoveryCache.at < CACHE_MS) return discoveryCache.found;
  if (!discoveryInFlight) {
    discoveryInFlight = discoverCourses()
      .then((found) => {
        discoveryCache = { at: Date.now(), found };
        return found;
      })
      .finally(() => {
        discoveryInFlight = null;
      });
  }
  try {
    return await discoveryInFlight;
  } catch (err) {
    throw new ApiError(502, 'IMPORT_SITE_UNAVAILABLE', `campus2b.com could not be read: ${err.message}`);
  }
}

const programmeRef = (p) => ({ id: String(p._id), code: p.code ?? null, title: p.title, status: p.status, catalogue: p.catalogue });

async function knownUrls() {
  const [programmes, ignored] = await Promise.all([
    Programme.find({ sourceUrls: { $exists: true, $ne: [] } }, 'sourceUrls').lean(),
    CatalogueImportIgnore.find({}, 'url').lean(),
  ]);
  return new Set([...programmes.flatMap((p) => p.sourceUrls), ...ignored.map((i) => i.url)]);
}

const intakePreview = (i) => ({
  startDate: i.startDate,
  endDate: i.endDate ?? null,
  startTime: i.startTime ?? null,
  endTime: i.endTime ?? null,
  location: i.location ?? '',
});

/** GET /admin/programmes/import/preview */
export async function preview({ fresh = false } = {}) {
  const found = await getDiscovery(fresh);
  const known = await knownUrls();
  const newUrls = [...found.keys()].filter((u) => !known.has(u)).sort();
  const toScrape = newUrls.slice(0, MAX_NEW_SCRAPED);

  const [categories, programmes, ignored] = await Promise.all([
    Category.find({}, 'slug name isActive').lean(),
    Programme.find({}, 'code title status catalogue').lean(),
    CatalogueImportIgnore.find().sort({ createdAt: -1 }).lean(),
  ]);
  // Another run of a course we already have: same catalogue and same title once dates/editions are removed.
  const byTitle = new Map();
  for (const p of programmes) {
    for (const t of [p.title?.es, p.title?.en]) {
      const key = t && `${p.catalogue}|${titleKey(t)}`;
      if (key && (!byTitle.has(key) || byTitle.get(key).status === 'archived')) byTitle.set(key, p);
    }
  }

  const results = await mapLimit(toScrape, (url) => getPage(url, found.get(url)?.date ?? null));
  const items = toScrape.map((url, i) => {
    const r = results[i];
    if (!r.ok) return { url, title: url.split('/').filter(Boolean).pop(), error: 'IMPORT_PAGE_FAILED' };
    const { data, image, unmatchedCategories } = toProgrammeData(r.value, categories);
    const match = byTitle.get(`${data.catalogue}|${titleKey(data.title.es)}`);
    return {
      url,
      title: data.title.es,
      shortDescription: data.shortDescription.es,
      image,
      catalogue: data.catalogue,
      categories: data.categories,
      unmatchedCategories,
      featured: data.featured,
      subsidised: data.subsidised,
      price: data.price,
      deliveryMode: data.deliveryMode,
      intakes: data.intakes.map(intakePreview),
      match: match ? programmeRef(match) : null,
    };
  });

  return {
    source: 'https://www.campus2b.com',
    checkedAt: new Date(discoveryCache?.at ?? Date.now()),
    totalOnSite: found.size,
    alreadyImported: found.size - newUrls.length,
    truncated: newUrls.length > toScrape.length,
    items,
    ignored: ignored.map((i) => ({ id: String(i._id), url: i.url, title: i.title, ignoredAt: i.createdAt })),
  };
}

/* ───────────── import ───────────── */

/** Next free code in the C2B-EL-NN / C2B-GN-NN series. */
async function nextCode(catalogue) {
  const prefix = catalogue === 'general' ? 'C2B-GN-' : 'C2B-EL-';
  const codes = await Programme.find({ code: { $regex: `^${prefix}\\d+$` } }, 'code').lean();
  const max = codes.reduce((m, p) => Math.max(m, Number(p.code.slice(prefix.length)) || 0), 0);
  return `${prefix}${String(max + 1).padStart(2, '0')}`;
}

async function importCover(programme, image) {
  if (!image || !isCloudinaryConfigured) return;
  try {
    const cover = await uploadImageFromUrl(image, 'programmes', (programme.code ?? String(programme._id)).toLowerCase());
    await Programme.updateOne({ _id: programme._id }, { $set: { coverImage: cover } });
  } catch {
    // The programme falls back to its category image; the admin can upload a cover later.
  }
}

const sameIntake = (a, b) =>
  new Date(a.startDate).toISOString().slice(0, 10) === new Date(b.startDate).toISOString().slice(0, 10) &&
  (a.startTime ?? '') === (b.startTime ?? '');

async function createDraft(url, page, categories, userId) {
  const { data, image } = toProgrammeData(page, categories);
  let programme;
  for (let attempt = 0; ; attempt += 1) {
    try {
      programme = await Programme.create({ ...data, code: await nextCode(data.catalogue), status: 'draft', createdBy: userId });
      break;
    } catch (err) {
      if (err?.code !== 11000 || attempt >= 2) throw err; // code taken by a concurrent import → retry
    }
  }
  await importCover(programme, image);
  return { url, programme: programmeRef(programme) };
}

async function mergeInto(url, page, categories, programmeId) {
  const programme = await Programme.findById(programmeId);
  if (!programme) throw ApiError.notFound('PROGRAMME_NOT_FOUND', 'Programme not found');
  const { data } = toProgrammeData(page, categories);
  const added = data.intakes.filter((i) => !programme.intakes.some((existing) => sameIntake(existing, i)));
  programme.intakes.push(...added);
  programme.intakes.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
  programme.sourceUrls = [...new Set([...(programme.sourceUrls ?? []), url])];
  if (data.shopProductId) programme.shopProductId = data.shopProductId; // the newest run is the one on sale
  await programme.save();
  return { url, programme: programmeRef(programme), intakesAdded: added.length };
}

/** POST /admin/programmes/import  body: { items: [{ url, action: 'create'|'merge'|'ignore', programmeId?, title? }] } */
export async function applyImport(items, userId) {
  const categories = await Category.find({}, 'slug name').lean();
  const known = await knownUrls();
  const created = [];
  const merged = [];
  const ignored = [];
  const failed = [];

  // Sequential on purpose: codes are allocated one after another and the site is not hammered.
  for (const item of items) {
    const url = canonicalCourseUrl(item.url);
    try {
      if (item.action === 'ignore') {
        await CatalogueImportIgnore.updateOne(
          { url },
          { $setOnInsert: { url, title: item.title ?? '', ignoredBy: userId } },
          { upsert: true },
        );
        ignored.push({ url });
        continue;
      }
      if (known.has(url)) throw ApiError.conflict('IMPORT_ALREADY_IMPORTED', 'Already on the platform');
      const page = await getPage(url, discoveryCache?.found.get(url)?.date ?? null);
      if (item.action === 'merge') merged.push(await mergeInto(url, page, categories, item.programmeId));
      else created.push(await createDraft(url, page, categories, userId));
      known.add(url);
    } catch (err) {
      failed.push({ url, code: err instanceof ApiError ? err.code : 'IMPORT_PAGE_FAILED' });
    }
  }

  if (created.length || merged.length) emitProgrammesChanged(null);
  return { created, merged, ignored, failed };
}

/** DELETE /admin/programmes/import/ignored/:id — show that course in the import list again. */
export async function restoreIgnored(id) {
  const doc = await CatalogueImportIgnore.findByIdAndDelete(id);
  if (!doc) throw ApiError.notFound('NOT_FOUND', 'Not found');
  return { id: String(doc._id) };
}

/* ───────────── shop products ───────────── */

/**
 * POST /admin/programmes/import/shop-products — keeps programmes in line with the campus2b.com shop:
 * - fills in missing shop product IDs (the "Comprar" button of each imported course page); IDs an admin
 *   already set are never overwritten
 * - sets the price to what the shop charges for the programme's product (the page rounds it, e.g. 187 € for 187.50 €)
 */
export async function syncShopProducts() {
  const programmes = await Programme.find({ $or: [{ sourceUrls: { $exists: true, $ne: [] } }, { shopProductId: { $gt: 0 } }] });
  const categories = await Category.find({}, 'slug name').lean();
  const urls = [...new Set(programmes.flatMap((p) => p.sourceUrls ?? []))];
  const results = await mapLimit(urls, (url) => getPage(url, null));
  const pages = new Map(urls.map((url, i) => [url, results[i].ok ? results[i].value : null]));
  const priceOf = new Map(); // shop product → { amount, currency }
  for (const page of pages.values()) if (page?.shopProductId && page.shopPrice) priceOf.set(page.shopProductId, page.shopPrice);

  const summary = { checked: programmes.length, updated: 0, alreadySet: 0, noProduct: 0, pricesUpdated: 0, failedPages: 0 };
  for (const programme of programmes) {
    let latest = null;
    let changed = false;
    for (const url of programme.sourceUrls ?? []) {
      const page = pages.get(url);
      if (!page) {
        summary.failedPages += 1;
        continue;
      }
      const { data } = toProgrammeData(page, categories);
      if (!data.shopProductId) continue;
      latest = data.shopProductId;
      for (const run of data.intakes) {
        const mine = programme.intakes.find((i) => sameIntake(i, run));
        if (mine && !mine.shopProductId) {
          mine.shopProductId = data.shopProductId;
          changed = true;
        }
      }
    }
    const hadId = !!programme.shopProductId;
    if (latest && !hadId) {
      programme.shopProductId = latest; // the last merged run is the newest one on sale
      changed = true;
    }

    // Price = what the shop charges for this programme's product (also for IDs typed in by an admin).
    if (programme.shopProductId && !programme.subsidised) {
      if (!priceOf.has(programme.shopProductId)) priceOf.set(programme.shopProductId, await fetchShopPrice(programme.shopProductId));
      const shopPrice = priceOf.get(programme.shopProductId);
      if (shopPrice && Math.abs((programme.price?.amount ?? 0) - shopPrice.amount) > 0.001) {
        programme.price = { amount: shopPrice.amount, currency: shopPrice.currency };
        summary.pricesUpdated += 1;
        changed = true;
      }
    }

    if (changed) {
      await programme.save();
      summary.updated += 1;
    } else if (hadId) summary.alreadySet += 1;
    else summary.noProduct += 1;
  }

  if (summary.updated) emitProgrammesChanged(null);
  return summary;
}
