/**
 * npm run seed — idempotent. Safe to run repeatedly; never overwrites data edited by admins.
 * - Phase 1: main c2b_admin from SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD (also synced on every server start)
 * - Categories from categories.json (inserted only if missing)
 * - Phase 2: programme catalogue from programmes.json (matched by `code`, inserted only if missing).
 *   programmes.json is the real C2B catalogue imported from campus2b.com (eLearning + General catalogues).
 * - Phase 7: `npm run seed:demo` (or --demo) also adds demo accounts and learning history (never in production)
 *
 * npm run catalogue:sync (--sync-catalogue) — one-off switch to the campus2b.com catalogue on an existing database:
 *   1. migrates the legacy single `category` field to `categories`
 *   2. inserts missing programmes AND overwrites existing ones (by code) with the content of programmes.json
 *   3. archives the 15 old demo programmes (LEGACY_DEMO_CODES) — programmes created by admins are never touched;
 *      archived programmes stay linked to existing enrollments and recommendations but leave the catalogue
 * Source URLs: every programme remembers the campus2b.com page(s) it came from (`sourceUrls`, backfilled on
 *   existing databases); the admin "Import from campus2b.com" tool uses them to find courses not imported yet.
 *   import-ignore.json lists site pages deliberately left out (webinars).
 * Covers: when Cloudinary is configured, each programme without a cover gets its campus2b.com image imported.
 */
import { readFile } from 'node:fs/promises';
import { env } from '../config/env.js';
import { connectDB, disconnectDB } from '../config/db.js';
import { Programme } from '../models/Programme.js';
import { Category } from '../models/Category.js';
import { CatalogueImportIgnore } from '../models/CatalogueImportIgnore.js';
import { isCloudinaryConfigured } from '../config/cloudinary.js';
import { uploadImageFromUrl } from '../services/upload.service.js';
import { seedDemo } from './demo.js';
import { syncSuperAdmin } from '../services/superAdmin.service.js';

const SYNC = process.argv.includes('--sync-catalogue');

/** The placeholder catalogue used before the campus2b.com import (archived by --sync-catalogue). */
const LEGACY_DEMO_CODES = [
  'C2B-DA-101', 'C2B-DA-201', 'C2B-DA-301', 'C2B-CL-101', 'C2B-CL-201', 'C2B-CY-101', 'C2B-DT-101', 'C2B-DT-201',
  'C2B-AG-101', 'C2B-FN-101', 'C2B-FN-201', 'C2B-LC-201', 'C2B-HR-101', 'C2B-MK-101', 'C2B-SS-101',
];

const readJson = async (name) => JSON.parse(await readFile(new URL(`./${name}`, import.meta.url), 'utf8'));

async function seedCategories() {
  const categories = await readJson('categories.json');
  let created = 0;
  for (const [index, c] of categories.entries()) {
    if (await Category.exists({ slug: c.slug })) continue;
    await Category.create({ ...c, order: index });
    created += 1;
  }
  console.log(`✅ Categories: ${created} created, ${categories.length - created} already present`);
}

/** Legacy schema had a single `category` string; copy it into `categories` and drop it. */
async function migrateLegacyCategory() {
  const res = await Programme.collection.updateMany({ category: { $exists: true } }, [
    {
      $set: {
        categories: {
          $cond: [{ $gt: [{ $size: { $ifNull: ['$categories', []] } }, 0] }, '$categories', ['$category']],
        },
        catalogue: { $ifNull: ['$catalogue', 'elearning'] },
      },
    },
    { $unset: 'category' },
  ]);
  if (res.modifiedCount) console.log(`✅ Migrated legacy category on ${res.modifiedCount} programme(s)`);
}

async function importCover(programme, source) {
  if (!source || programme.coverImage?.url || !isCloudinaryConfigured) return;
  try {
    const cover = await uploadImageFromUrl(source, 'programmes', programme.code.toLowerCase());
    await Programme.updateOne({ _id: programme._id }, { $set: { coverImage: cover } });
  } catch (err) {
    console.warn(`⚠️  Cover for ${programme.code} not imported: ${err.message}`);
  }
}

async function seedProgrammes(admin) {
  const programmes = await readJson('programmes.json');

  let created = 0;
  let updated = 0;
  let backfilled = 0;
  const touched = new Set();
  for (const { prerequisites, coverImageSource, ...data } of programmes) {
    const existing = await Programme.findOne({ code: data.code });
    if (existing && !SYNC) {
      // Backfill only — never overwrites admin edits.
      if (!existing.sourceUrls?.length && data.sourceUrls?.length) {
        await Programme.updateOne({ _id: existing._id }, { $set: { sourceUrls: data.sourceUrls } });
        backfilled += 1;
      }
      continue;
    }
    let doc;
    if (existing) {
      existing.set({ ...data, status: existing.status === 'archived' ? 'published' : existing.status });
      doc = await existing.save();
      updated += 1;
    } else {
      doc = await Programme.create({ ...data, status: 'published', createdBy: admin?._id });
      created += 1;
    }
    touched.add(data.code);
    await importCover(doc, coverImageSource);
  }

  // Link prerequisites (by code) for programmes created/updated in this run.
  const idByCode = new Map((await Programme.find({}, 'code').lean()).map((p) => [p.code, p._id]));
  for (const { code, prerequisites = [] } of programmes) {
    if (!touched.has(code) || prerequisites.length === 0) continue;
    const ids = prerequisites.map((c) => idByCode.get(c)).filter(Boolean);
    await Programme.updateOne({ code }, { $set: { prerequisites: ids } });
  }

  let archived = 0;
  if (SYNC) {
    const res = await Programme.updateMany({ code: { $in: LEGACY_DEMO_CODES }, status: { $ne: 'archived' } }, { $set: { status: 'archived' } });
    archived = res.modifiedCount;
  }

  console.log(
    `✅ Programmes: ${created} created, ${updated} updated, ${programmes.length - created - updated} already present` +
      (SYNC ? `, ${archived} old programme(s) archived` : '') +
      (backfilled ? `, source links added to ${backfilled}` : ''),
  );
}

async function seedImportIgnores() {
  const ignores = await readJson('import-ignore.json');
  for (const { url, title } of ignores) {
    await CatalogueImportIgnore.updateOne({ url }, { $setOnInsert: { url, title } }, { upsert: true });
  }
}

async function run() {
  await connectDB();
  const admin = await syncSuperAdmin();
  await seedCategories();
  await migrateLegacyCategory();
  await seedProgrammes(admin);
  await seedImportIgnores();
  if (process.argv.includes('--demo')) {
    if (env.NODE_ENV === 'production' && !process.argv.includes('--force')) {
      console.warn('⚠️  Refusing to seed demo accounts in production (add --force to override).');
    } else {
      await seedDemo();
    }
  }
}

run()
  .then(() => console.log('🌱 Seed complete'))
  .catch((err) => {
    console.error('❌ Seed failed:', err);
    process.exitCode = 1;
  })
  .finally(() => disconnectDB());
