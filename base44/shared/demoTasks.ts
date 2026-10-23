// ── demoTasks — the demo marketplace engine ─────────────────────────────────
//
// ONE implementation of "produce realistic activity", shared by the manual
// generator (bulkSimulatorTasks) and the Market Maker automaton (marketMaker).
// The two must never drift: a task published by hand and one published by the
// automaton land in the same feed, from the same demo profiles, in the same
// voice — so the logic lives here and nowhere else.
//
// It does three things, and only these three:
//   • PUBLISH   — realistic tasks from demo profiles, in the live categories
//   • ENGAGE    — views, clicks and applicants that grow over time
//   • CLOSE     — retire the oldest open tasks so the feed churns instead of
//                 filling up with the same posts forever
//
// All of it runs with service authority: demo tasks belong to demo clients,
// never to a real account, and no real user's data is touched.

import {
  CONTENT, GENERIC_TASKS, BODY_FRAMES, CITY_CENTERS, STREETS,
  FIRST_NAMES_MALE, FIRST_NAMES_FEMALE, LAST_NAMES,
  PROFESSION_BY_CATEGORY, PROFESSION_FALLBACKS,
  randomFrom, shuffle, randInt, roundPrice, generatePhone, generateBio,
} from './demoTaskContent.ts';

const POOL_SIZE = 100;

const ACTIONABLE_TYPES = ['root', 'service'];

/**
 * Every category a task may actually be posted under — the live catalogue,
 * never a hard-coded list. A category the admin adds in Admin → Categories is
 * therefore usable by the generator the moment it exists.
 */
export async function loadActionableCategories(base44: any) {
  const rows = await base44.asServiceRole.entities.GlobalCategory.list('sort_order', 500);
  return (rows || []).filter((r: any) =>
    r && r.active !== false && ACTIONABLE_TYPES.includes(r.node_type || 'service')
  );
}

/**
 * The title + description pair for one task.
 *
 * Order matters: a curated pair first (hand-written, specific), then the
 * category's OWN examples from the catalogue (so a newly added category is
 * covered with no code change), and only then the generic fallback.
 *
 * The generated body never mentions scope or duration — see the rule at the top
 * of demoTaskContent.
 */
export function contentFor(categoryKey: string, catalogueRow: any) {
  const curated = CONTENT[categoryKey];
  if (curated && curated.length) return randomFrom(curated);

  const examples = (catalogueRow?.examples || []).filter((e: string) => String(e || '').trim());
  if (examples.length) {
    const title = randomFrom(examples);
    return { title, description: `${title}. ${randomFrom(BODY_FRAMES)}` };
  }

  return randomFrom(GENERIC_TASKS);
}

// ═══════════════════════════════════════════════════════════════════════════
//  DEMO PROFILE POOL
// ═══════════════════════════════════════════════════════════════════════════

export async function getOrCreateDemoUsers(base44: any, count = POOL_SIZE) {
  const existing = await base44.asServiceRole.entities.DemoUser.list('-created_date', 200);
  if (existing.length >= count) return existing;

  const cities = Object.keys(CITY_CENTERS);
  const categoryKeys = Object.keys(CONTENT);
  const created: any[] = [];

  for (let i = 0; i < count - existing.length; i++) {
    const isMale = Math.random() > 0.5;
    const fullName = `${randomFrom(isMale ? FIRST_NAMES_MALE : FIRST_NAMES_FEMALE)} ${randomFrom(LAST_NAMES)}`;
    const city = randomFrom(cities);
    const category = randomFrom(categoryKeys);
    const profession = PROFESSION_BY_CATEGORY[category] || randomFrom(PROFESSION_FALLBACKS);
    const isVerified = Math.random() > 0.35;
    const hasInstagram = Math.random() > 0.6;
    const hasFacebook = Math.random() > 0.7;

    const user = await base44.asServiceRole.entities.DemoUser.create({
      demo_id: `demo_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      full_name: fullName,
      phone: generatePhone(),
      bio: generateBio(isMale, profession),
      profession,
      // The profile's trade is the CATEGORY the profile belongs to, so the
      // availability counts and the avatar stack agree with the feed.
      preferred_categories: [category, randomFrom(categoryKeys)],
      preferred_cities: [city],
      profile_photo: `https://api.dicebear.com/7.x/avataaars/png?seed=${encodeURIComponent(fullName)}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`,
      rating: Math.round((3.5 + Math.random() * 1.5) * 10) / 10,
      rating_count: randInt(1, 40),
      tasks_completed: randInt(0, 50),
      tasks_posted: randInt(0, 25),
      is_verified: isVerified,
      instagram_username: hasInstagram ? fullName.replace(/\s/g, '').toLowerCase() + randInt(1, 99) : undefined,
      instagram_verified: hasInstagram && isVerified && Math.random() > 0.5,
      facebook_username: hasFacebook ? fullName.replace(/\s/g, '').toLowerCase() : undefined,
      facebook_verified: hasFacebook && isVerified && Math.random() > 0.5,
      repeat_hires: randInt(0, 10),
      avg_response_minutes: randInt(5, 60),
      on_time_rate: Math.round((0.7 + Math.random() * 0.3) * 100) / 100,
      certificates: [],
      certificate_files: [],
      profile_media: [],
    });
    created.push(user);
  }

  return [...existing, ...created];
}

// ═══════════════════════════════════════════════════════════════════════════
//  PUBLISH
// ═══════════════════════════════════════════════════════════════════════════

export async function buildDemoTasks({
  base44, city, count, minPrice, maxPrice, categories, brandIds,
}: any) {
  const centre = CITY_CENTERS[city] || { lat: 32.0853, lng: 34.7818 };
  const min = Math.max(1, Number(minPrice) || 100);
  const max = Math.max(min, Number(maxPrice) || 2000);
  const n = Math.min(100, Math.max(1, Number(count) || 1));

  const catalogue = await loadActionableCategories(base44);
  const catalogueByKey: Record<string, any> = {};
  for (const row of catalogue) catalogueByKey[row.category_key] = row;

  // Only keys that really exist in the catalogue are used. A stale key the
  // caller passed in can never produce a task filed under a category that is
  // not in the live taxonomy.
  const liveKeys = catalogue.map((r: any) => r.category_key);
  const requested = Array.isArray(categories) ? categories.filter((c: any) => typeof c === 'string' && c) : [];
  const usable = requested.filter((c: string) => liveKeys.includes(c));
  const selectedCats: string[] = usable.length ? usable : (liveKeys.length ? liveKeys : Object.keys(CONTENT));

  const selectedBrands: string[] = Array.isArray(brandIds) && brandIds.length
    ? brandIds.filter((b: any) => typeof b === 'string' && b)
    : [undefined];

  const pool = shuffle(await getOrCreateDemoUsers(base44, POOL_SIZE));
  const estimatedTimes = ['15 דקות', '30 דקות', 'שעה', 'שעתיים', '3 שעות', 'חצי יום'];
  const paymentMethods = ['Cash', 'Bit', 'PayBox'];
  const urgencyTags = ['immediate', 'few_hours', 'evening', 'flexible'];

  // Categories we have a hand-written pair for produce a richer, more specific
  // post than the one-line example the catalogue stores, so they are preferred
  // — but only preferred, never exclusive: the catalogue's own services still
  // appear, which is exactly what a real feed looks like.
  const curatedCats = selectedCats.filter((c: string) => (CONTENT[c] || []).length);
  const pickCategory = () => {
    if (curatedCats.length && (Math.random() < 0.6 || !selectedCats.length)) {
      return randomFrom(curatedCats);
    }
    return randomFrom(selectedCats);
  };

  const tasks: any[] = [];
  for (let i = 0; i < n; i++) {
    const category = pickCategory();
    const { title, description } = contentFor(category, catalogueByKey[category]);
    const price = Math.max(min, roundPrice(min + Math.random() * (max - min)));

    const lat = centre.lat + (Math.random() - 0.5) * 0.06;
    const lng = centre.lng + (Math.random() - 0.5) * 0.06;
    const demoUser = pool[i % pool.length];
    const brandId = selectedBrands[i % selectedBrands.length];

    tasks.push({
      title,
      description,
      price,
      base_price: price,
      city,
      location_name: `${city}, ${randomFrom(STREETS)} ${randInt(1, 120)}`,
      lat: parseFloat(lat.toFixed(6)),
      lng: parseFloat(lng.toFixed(6)),
      category,
      status: 'OPEN',
      payment_method: randomFrom(paymentMethods),
      payment_status: 'funded',
      approval_mode: Math.random() > 0.5 ? 'instant' : 'manual',
      estimated_time: randomFrom(estimatedTimes),
      urgency_tag: randomFrom(urgencyTags),
      client_id: demoUser.demo_id,
      client_name: demoUser.full_name,
      client_verified: demoUser.is_verified || false,
      client_rating: demoUser.rating || 0,
      expires_at: new Date(Date.now() + randInt(6, 48) * 60 * 60 * 1000).toISOString(),
      expiry_duration_hours: 24,
      views_count: randInt(3, 25),
      clicks_count: randInt(0, 6),
      applicants: [],
      origin_brand_id: brandId,
    });
  }

  await base44.asServiceRole.entities.Task.bulkCreate(tasks);
  return tasks;
}

// ═══════════════════════════════════════════════════════════════════════════
//  READ THE DEMO SIDE OF THE MARKETPLACE
// ═══════════════════════════════════════════════════════════════════════════

/** Open demo tasks, oldest first — the ones a cycle works on. */
export async function listOpenDemoTasks(base44: any, limit = 200) {
  const page = await base44.asServiceRole.entities.Task.filter(
    { status: 'OPEN' },
    { sort: 'created_date', limit },
  );
  const items = page?.items || page || [];
  return items.filter((t: any) => String(t.client_id || '').startsWith('demo_'));
}

// ═══════════════════════════════════════════════════════════════════════════
//  ENGAGE — views, clicks and applicants that grow over time
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Ages every open demo task by the configured amounts.
 *
 * Views and clicks go up on ALL of them — a listing nobody looks at is the
 * exact impression this is meant to remove. Applicants are added to a small
 * random subset instead: in a real marketplace most listings get views long
 * before they get applicants, and giving every task a candidate every hour
 * would read as noise rather than as demand.
 */
export async function bumpEngagement({
  base44, viewsMin, viewsMax, clicksMin, clicksMax, applicantsMin, applicantsMax,
}: any) {
  const open = await listOpenDemoTasks(base44);
  if (!open.length) return { tasks: 0, applicants: 0 };

  const pool = await getOrCreateDemoUsers(base44, POOL_SIZE);
  const applicants = Math.min(3, open.length);
  const withApplicants = new Set(
    shuffle(open).slice(0, applicants).map((t: any) => t.id),
  );

  let addedApplicants = 0;
  const patches = open.map((t: any) => {
    const patch: any = {
      id: t.id,
      views_count: (t.views_count || 0) + randInt(viewsMin, viewsMax),
      clicks_count: (t.clicks_count || 0) + randInt(clicksMin, clicksMax),
    };
    if (withApplicants.has(t.id)) {
      const count = randInt(applicantsMin, applicantsMax);
      const existing = Array.isArray(t.applicants) ? t.applicants : [];
      const taken = new Set(existing.map((a: any) => a.worker_id));
      const fresh: any[] = [];
      for (let i = 0; i < count; i++) {
        const worker = randomFrom(pool);
        if (taken.has(worker.demo_id)) continue;
        taken.add(worker.demo_id);
        fresh.push({
          worker_id: worker.demo_id,
          worker_name: worker.full_name,
          message: randomFrom([
            'אשמח להגיע ולבדוק, מתי נוח לך?',
            'זמין להיום או מחר. יש לי את כל הציוד.',
            'אפשר לתאם טלפונית? אשמח להצעת מחיר.',
            'מניסיון דומה, אשמח לעזור.',
          ]),
          applied_at: new Date().toISOString(),
        });
      }
      if (fresh.length) {
        patch.applicants = [...existing, ...fresh];
        addedApplicants += fresh.length;
      }
    }
    return patch;
  });

  await base44.asServiceRole.entities.Task.bulkUpdate(patches);
  return { tasks: patches.length, applicants: addedApplicants };
}

// ═══════════════════════════════════════════════════════════════════════════
//  CLOSE — retire the oldest listings so the feed churns
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Closes the OLDEST open demo tasks — the ones a visitor has already seen.
 *
 * They do not all end the same way: some were taken and finished, some are
 * still being worked on, and some simply expired. A feed where every listing
 * ends identically is as much of a tell as a feed where nothing ever ends.
 */
export async function closeDemoTasks({ base44, min, max }: any) {
  const open = await listOpenDemoTasks(base44);
  const count = Math.min(open.length, randInt(min, max));
  if (count <= 0) return { closed: 0, completed: 0, taken: 0, expired: 0 };

  const pool = await getOrCreateDemoUsers(base44, POOL_SIZE);
  const oldest = open.slice(0, count);
  const now = new Date().toISOString();

  let completed = 0, taken = 0, expired = 0;
  const patches = oldest.map((t: any) => {
    const roll = Math.random();
    if (roll < 0.6) {
      completed++;
      const worker = randomFrom(pool);
      return {
        id: t.id,
        status: 'COMPLETED',
        worker_id: worker.demo_id,
        worker_name: worker.full_name,
        worker_status: 'done',
        worker_confirmed: true,
        client_confirmed: true,
        completed_at: now,
        payment_status: 'funded',
      };
    }
    if (roll < 0.85) {
      taken++;
      const worker = randomFrom(pool);
      return {
        id: t.id,
        status: 'TAKEN',
        worker_id: worker.demo_id,
        worker_name: worker.full_name,
        worker_status: 'on_the_way',
        on_the_way_at: now,
      };
    }
    expired++;
    return { id: t.id, status: 'EXPIRED' };
  });

  await base44.asServiceRole.entities.Task.bulkUpdate(patches);
  return { closed: patches.length, completed, taken, expired };
}

// ═══════════════════════════════════════════════════════════════════════════
//  CONFIG
// ═══════════════════════════════════════════════════════════════════════════

export const DEFAULT_MARKET_MAKER_CONFIG = {
  enabled: false,
  interval_hours: 1,
  tasks_min: 5,
  tasks_max: 10,
  close_min: 1,
  close_max: 3,
  views_min: 5,
  views_max: 10,
  clicks_min: 1,
  clicks_max: 3,
  applicants_min: 1,
  applicants_max: 2,
  max_open_tasks: 60,
  min_price: 100,
  max_price: 2000,
  cities: ['תל אביב', 'ירושלים', 'חיפה', 'רמת גן'],
  categories: [],
  brand_ids: [],
};

/** The single configuration row, or the defaults when none was saved yet. */
export async function loadConfig(base44: any) {
  const rows = await base44.asServiceRole.entities.MarketMakerConfig.list('-created_date', 1);
  return { id: rows?.[0]?.id || null, ...DEFAULT_MARKET_MAKER_CONFIG, ...(rows?.[0] || {}) };
}