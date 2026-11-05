/**
 * npm run seed — idempotent. Safe to run repeatedly; never overwrites data edited by admins.
 * - Phase 1: first c2b_admin from SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD
 * - Phase 2: programme catalogue from programmes.json (matched by `code`, inserted only if missing)
 * - Phase 7: `npm run seed:demo` (or --demo) also adds demo accounts and learning history (never in production)
 */
import { readFile } from 'node:fs/promises';
import { env } from '../config/env.js';
import { connectDB, disconnectDB } from '../config/db.js';
import { User } from '../models/User.js';
import { Programme } from '../models/Programme.js';
import { ROLES } from '../models/_shared.js';
import { seedDemo } from './demo.js';

async function seedAdmin() {
  const email = env.SEED_ADMIN_EMAIL?.toLowerCase();
  const password = env.SEED_ADMIN_PASSWORD;
  if (!email || !password) {
    console.warn('⚠️  SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD not set; skipping admin seed');
    return null;
  }

  const existing = await User.findOne({ email });
  if (existing) {
    if (existing.role !== ROLES.C2B_ADMIN) {
      console.warn(`⚠️  ${email} exists with role "${existing.role}"; not changing it`);
    } else {
      console.log(`✔  C2B admin already exists: ${email}`);
    }
    return existing;
  }

  const admin = await User.create({ name: 'C2B Admin', email, password, role: ROLES.C2B_ADMIN, authProvider: 'local' });
  console.log(`✅ Created C2B admin: ${email}`);
  return admin;
}

async function seedProgrammes(admin) {
  const raw = await readFile(new URL('./programmes.json', import.meta.url), 'utf8');
  const programmes = JSON.parse(raw);

  // Pass 1: insert missing programmes (without prerequisites).
  let created = 0;
  const newCodes = new Set();
  for (const { prerequisites, ...data } of programmes) {
    const exists = await Programme.exists({ code: data.code });
    if (exists) continue;
    await Programme.create({ ...data, status: 'published', createdBy: admin?._id });
    newCodes.add(data.code);
    created += 1;
  }

  // Pass 2: link prerequisites (by code) for the programmes created in this run.
  const idByCode = new Map((await Programme.find({}, 'code').lean()).map((p) => [p.code, p._id]));
  for (const { code, prerequisites = [] } of programmes) {
    if (!newCodes.has(code) || prerequisites.length === 0) continue;
    const ids = prerequisites.map((c) => idByCode.get(c)).filter(Boolean);
    await Programme.updateOne({ code }, { $set: { prerequisites: ids } });
  }

  console.log(`✅ Programmes: ${created} created, ${programmes.length - created} already present`);
}

async function run() {
  await connectDB();
  const admin = await seedAdmin();
  await seedProgrammes(admin);
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
