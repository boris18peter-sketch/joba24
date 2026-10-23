import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import { JOBA24_BRAND_ID } from '../../shared/jobaBrand.ts';
import { requireInternalOperator } from '../../shared/internalAuth.ts';
import {
  DEFAULT_MARKET_MAKER_CONFIG, loadConfig,
  buildDemoTasks, bumpEngagement, closeDemoTasks, listOpenDemoTasks,
} from '../../shared/demoTasks.ts';

/**
 * Market Maker — the engine that keeps the marketplace looking alive.
 *
 * ── THE PROBLEM IT SOLVES ───────────────────────────────────────────────────
 * A visitor's first minute decides everything. Landing on an empty feed reads as
 * "this place is not working" and they leave before posting anything — the
 * marketplace's own cold start, which is the hardest thing to climb out of.
 *
 * So the demo side of the feed is kept in motion: tasks are published, the
 * listings already there gather views, clicks and applicants, and the oldest
 * ones finish and close. Everything runs through the demo profiles and the
 * shared generator, so it is indistinguishable from real activity.
 *
 * ── ONE HOURLY WORKFLOW, ANY CONFIGURED CADENCE ─────────────────────────────
 * The workflow fires every hour — the finest granularity anyone would ask for.
 * This function then decides whether a cycle is actually DUE, by comparing
 * `last_run_at` against `interval_hours`. That is what lets the interval be
 * changed from the simulator (1h, 3h, 12h…) without ever touching the schedule.
 *
 * ── IT ONLY EVER TOUCHES DEMO DATA ──────────────────────────────────────────
 * Every read and write is scoped to records whose client_id starts with
 * `demo_`. A real user's task, application or credit balance is never read,
 * never modified, and never counted.
 */
export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const denied = await requireInternalOperator(base44, req, user);
    if (denied) return denied;

    const body = await req.json().catch(() => ({}));
    const action = body?.action || 'run_cycle';

    // ── READ CONFIG ──
    if (action === 'get_config') {
      const config = await loadConfig(base44);
      const openTasks = await listOpenDemoTasks(base44);
      return Response.json({ success: true, config, open_demo_tasks: openTasks.length });
    }

    // ── SAVE CONFIG ──
    if (action === 'save_config') {
      const current = await loadConfig(base44);
      const patch = sanitizeConfig({ ...current, ...(body.config || {}) });
      let saved;
      if (current.id) {
        saved = await base44.asServiceRole.entities.MarketMakerConfig.update(current.id, patch);
      } else {
        saved = await base44.asServiceRole.entities.MarketMakerConfig.create(patch);
      }
      return Response.json({ success: true, config: { ...current, ...patch, id: saved?.id || current.id } });
    }

    if (action !== 'run_cycle') return Response.json({ error: 'Invalid action' }, { status: 400 });

    // ── RUN ONE CYCLE ──
    const config = await loadConfig(base44);
    const force = body?.force === true;

    if (!config.enabled && !force) {
      return Response.json({ success: true, skipped: 'disabled', config });
    }

    if (!force && config.last_run_at) {
      const dueAt = new Date(config.last_run_at).getTime() + config.interval_hours * 3600 * 1000;
      if (Date.now() < dueAt) {
        return Response.json({
          success: true,
          skipped: 'not_due',
          next_run_at: new Date(dueAt).toISOString(),
        });
      }
    }

    // 1. Retire the oldest listings first, so the cap below frees up room.
    const closed = await closeDemoTasks({
      base44,
      min: config.close_min,
      max: config.close_max,
    });

    // 2. Age everything still open — views, clicks, and a few new applicants.
    const engagement = await bumpEngagement({
      base44,
      viewsMin: config.views_min,
      viewsMax: config.views_max,
      clicksMin: config.clicks_min,
      clicksMax: config.clicks_max,
      applicantsMin: config.applicants_min,
      applicantsMax: config.applicants_max,
    });

    // 3. Publish the new listings, up to the open-task ceiling.
    const openNow = (await listOpenDemoTasks(base44)).length;
    let published = 0;
    let publishedIn: Record<string, number> = {};

    if (openNow < config.max_open_tasks) {
      const wanted = Math.min(
        randInt(config.tasks_min, config.tasks_max),
        config.max_open_tasks - openNow,
      );

      const cityList = (config.cities || []).filter(Boolean);
      const cities = cityList.length ? cityList.slice(0, 8) : ['תל אביב'];

      // Spread the cycle across the configured cities, so no single city's feed
      // fills up while the others stay empty.
      const perCity: Record<string, number> = {};
      for (let i = 0; i < wanted; i++) {
        const city = cities[i % cities.length];
        perCity[city] = (perCity[city] || 0) + 1;
      }

      for (const [city, count] of Object.entries(perCity)) {
        const created = await buildDemoTasks({
          base44,
          city,
          count,
          minPrice: config.min_price,
          maxPrice: config.max_price,
          categories: config.categories,
          brandIds: (config.brand_ids || []).length ? config.brand_ids : [JOBA24_BRAND_ID],
        });
        published += created.length;
        publishedIn[city] = created.length;
      }
    }

    const summary = {
      published,
      published_in: publishedIn,
      closed: closed.closed,
      completed: closed.completed,
      taken: closed.taken,
      expired: closed.expired,
      aged_tasks: engagement.tasks,
      new_applicants: engagement.applicants,
      open_demo_tasks: (await listOpenDemoTasks(base44)).length,
      at_cap: published === 0 && openNow >= config.max_open_tasks,
    };

    const patch = { last_run_at: new Date().toISOString(), last_run_summary: summary };
    if (config.id) {
      await base44.asServiceRole.entities.MarketMakerConfig.update(config.id, patch);
    } else {
      await base44.asServiceRole.entities.MarketMakerConfig.create({
        ...DEFAULT_MARKET_MAKER_CONFIG, ...config, ...patch,
      });
    }

    return Response.json({ success: true, summary });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

function randInt(min: number, max: number): number {
  const lo = Math.min(Number(min) || 0, Number(max) || 0);
  const hi = Math.max(Number(min) || 0, Number(max) || 0);
  return Math.floor(lo + Math.random() * (hi - lo + 1));
}

/**
 * Clamp whatever the simulator sent into a shape the engine can trust: numbers
 * are numbers, a minimum never exceeds its maximum, and the cadence can never
 * be faster than the hourly workflow that drives it.
 */
function sanitizeConfig(raw: any) {
  const num = (v: any, fallback: number, lo: number, hi: number) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(hi, Math.max(lo, n));
  };
  const pair = (minV: any, maxV: any, lo: number, hi: number) => {
    const a = num(minV, lo, lo, hi);
    const b = num(maxV, Math.max(a, lo), lo, hi);
    return { min: Math.min(a, b), max: Math.max(a, b) };
  };

  const tasks = pair(raw.tasks_min, raw.tasks_max, 1, 100);
  const close = pair(raw.close_min, raw.close_max, 0, 50);
  const views = pair(raw.views_min, raw.views_max, 0, 500);
  const clicks = pair(raw.clicks_min, raw.clicks_max, 0, 200);
  const applicants = pair(raw.applicants_min, raw.applicants_max, 0, 20);

  return {
    enabled: !!raw.enabled,
    interval_hours: num(raw.interval_hours, 1, 1, 168),
    tasks_min: tasks.min,
    tasks_max: tasks.max,
    close_min: close.min,
    close_max: close.max,
    views_min: views.min,
    views_max: views.max,
    clicks_min: clicks.min,
    clicks_max: clicks.max,
    applicants_min: applicants.min,
    applicants_max: applicants.max,
    max_open_tasks: num(raw.max_open_tasks, 60, 5, 500),
    min_price: num(raw.min_price, 100, 0, 100000),
    max_price: num(raw.max_price, 2000, 0, 100000),
    cities: Array.isArray(raw.cities) ? raw.cities.filter((c: any) => typeof c === 'string' && c) : [],
    categories: Array.isArray(raw.categories) ? raw.categories.filter((c: any) => typeof c === 'string' && c) : [],
    brand_ids: Array.isArray(raw.brand_ids) ? raw.brand_ids.filter((c: any) => typeof c === 'string' && c) : [],
  };
}