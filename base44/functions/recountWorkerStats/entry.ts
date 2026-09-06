import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

// Recomputes worker availability counts from scratch by scanning all users
// with preferred_categories. Stores results in a single WorkerStat record
// for O(1) reads on the frontend.
//
// Designed to run on a schedule (every 2-3 min) — safe to call repeatedly.
export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);

    // --- Read all users with preferred_categories (cursor pagination) ---
    let allWorkers = [];
    let lastCreatedDate = null;
    let hasMore = true;

    while (hasMore) {
      const query = lastCreatedDate ? { created_date: { $lt: lastCreatedDate } } : {};
      const batch = await base44.asServiceRole.entities.User.filter(
        query, '-created_date', 500
      );

      const workers = batch.filter(
        u => u.preferred_categories && u.preferred_categories.length > 0
      );
      allWorkers = allWorkers.concat(workers);

      if (batch.length < 500) {
        hasMore = false;
      } else {
        lastCreatedDate = batch[batch.length - 1].created_date;
      }
    }

    // --- Compute counts ---
    const categoryCounts = {};
    const cityCounts = {};
    const categoryCityCounts = {};

    allWorkers.forEach(user => {
      const cats = user.preferred_categories || [];
      const cities = user.preferred_cities || [];

      cats.forEach(cat => {
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
        cities.forEach(city => {
          const key = `${cat}|${city}`;
          categoryCityCounts[key] = (categoryCityCounts[key] || 0) + 1;
        });
      });

      cities.forEach(city => {
        cityCounts[city] = (cityCounts[city] || 0) + 1;
      });
    });

    const data = {
      total: allWorkers.length,
      categories: categoryCounts,
      cities: cityCounts,
      category_city: categoryCityCounts,
      updated_at: new Date().toISOString(),
    };

    // --- Upsert the single stats record ---
    const existing = await base44.asServiceRole.entities.WorkerStat.filter(
      { stat_type: 'worker_counts' }
    );
    if (existing[0]) {
      await base44.asServiceRole.entities.WorkerStat.update(existing[0].id, { data });
    } else {
      await base44.asServiceRole.entities.WorkerStat.create({
        stat_type: 'worker_counts',
        data,
      });
    }

    return Response.json({
      ok: true,
      total: allWorkers.length,
      categories: Object.keys(categoryCounts).length,
      cities: Object.keys(cityCounts).length,
      category_city_combos: Object.keys(categoryCityCounts).length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}