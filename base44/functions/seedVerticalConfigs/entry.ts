import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Vertical Engine — Seed / Sync default configurations
 * ───────────────────────────────────────────────────────────────────────────
 * Upserts vertical configurations into the VerticalConfig entity.
 * Admin-only. Idempotent — safe to run multiple times.
 *
 * Payload: { configs: [{ vertical_id, name, config, is_active, version }] }
 *
 * The frontend builds defaults from current behavior (defaults.js) and sends
 * them here to persist as the single source of truth.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden — admin only' }, { status: 403 });

    const body = await req.json();
    const configs = Array.isArray(body?.configs) ? body.configs : null;
    if (!configs || configs.length === 0) {
      return Response.json({ error: 'configs array is required' }, { status: 400 });
    }

    // Fetch existing records to know which to update vs create
    const existing = await base44.asServiceRole.entities.VerticalConfig.list('-updated_date', 200);
    const existingMap = new Map(existing.map(r => [r.vertical_id, r.id]));

    const toCreate = [];
    const toUpdate = [];

    for (const cfg of configs) {
      if (!cfg.vertical_id || !cfg.config) continue;
      if (existingMap.has(cfg.vertical_id)) {
        toUpdate.push({
          id: existingMap.get(cfg.vertical_id),
          name: cfg.name,
          config: cfg.config,
          is_active: cfg.is_active !== false,
          version: cfg.version || 1,
        });
      } else {
        toCreate.push({
          vertical_id: cfg.vertical_id,
          name: cfg.name,
          config: cfg.config,
          is_active: cfg.is_active !== false,
          version: cfg.version || 1,
        });
      }
    }

    let created = 0;
    let updated = 0;

    if (toCreate.length > 0) {
      const res = await base44.asServiceRole.entities.VerticalConfig.bulkCreate(toCreate);
      created = res?.length || toCreate.length;
    }
    if (toUpdate.length > 0) {
      await base44.asServiceRole.entities.VerticalConfig.bulkUpdate(toUpdate);
      updated = toUpdate.length;
    }

    return Response.json({
      success: true,
      created,
      updated,
      total: created + updated,
    });
  } catch (error) {
    console.error('❌ seedVerticalConfigs error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});