/**
 * Vertical Engine — Runtime API
 * ───────────────────────────────────────────────────────────────────────────
 * The single entry point for loading vertical behavior.
 *
 * Every screen should call:
 *   const config = getVerticalConfig(category)
 *   const section = getVerticalSection(category, 'task_form')
 *
 * The engine loads configs from the VerticalConfig entity (single source of
 * truth) and deep-merges them over the built-in defaults. If the entity has
 * no record for a category, the default config (which reproduces current
 * behavior) is returned — so the app always works even before seeding.
 *
 * React components should use the useVerticalConfig hook.
 */

import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { buildDefaultVerticalConfig } from './defaults';
import { getSpecializedVerticalConfig } from './verticals';
import { VERTICAL_SECTIONS } from './schema';

// ── In-memory cache (survives navigations within a session) ───────────────
let _cache = null;        // Map<vertical_id, mergedConfig>
let _loadPromise = null;  // prevents duplicate parallel fetches

// ── Deep merge: entity override wins, defaults fill the gaps ──────────────
function deepMerge(base, override) {
  if (!override || typeof override !== 'object') return base;
  if (Array.isArray(base)) return override ?? base;
  const result = { ...base };
  for (const key of Object.keys(override)) {
    if (
      base[key] && typeof base[key] === 'object' && !Array.isArray(base[key]) &&
      override[key] && typeof override[key] === 'object'
    ) {
      result[key] = deepMerge(base[key], override[key]);
    } else {
      result[key] = override[key];
    }
  }
  // Ensure all schema sections exist (fill missing from defaults)
  for (const section of VERTICAL_SECTIONS) {
    if (!(section in result)) result[section] = base[section];
  }
  return result;
}

// ── Load all vertical configs from the entity into cache ──────────────────
async function loadCache() {
  if (_cache) return _cache;
  if (_loadPromise) return _loadPromise;

  _loadPromise = (async () => {
    try {
      const records = await base44.asServiceRole
        ? base44.entities.VerticalConfig.list('-updated_date', 100)
        : base44.entities.VerticalConfig.list('-updated_date', 100);

      const map = new Map();
      for (const rec of records) {
        if (!rec.is_active) continue;
        // 3-layer merge: defaults ← specialized ← entity
        const defaults = buildDefaultVerticalConfig(rec.vertical_id);
        const specialized = getSpecializedVerticalConfig(rec.vertical_id);
        const merged = deepMerge(deepMerge(defaults, specialized), rec.config);
        map.set(rec.vertical_id, merged);
      }
      _cache = map;
      return map;
    } catch (err) {
      // If entity fetch fails, fall back to empty cache → defaults used per-call
      console.warn('[VerticalEngine] Failed to load configs, using built-in defaults:', err.message);
      _cache = new Map();
      return _cache;
    } finally {
      _loadPromise = null;
    }
  })();

  return _loadPromise;
}

// Re-export specialized vertical utilities
export { hasSpecializedVertical, getSpecializedVerticalIds } from './verticals';

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Get the full merged Vertical configuration for a category.
 * Sync — returns default immediately if cache not yet loaded, then
 * components re-render via useVerticalConfig once loaded.
 */
export function getVerticalConfig(category) {
  if (_cache?.has(category)) return _cache.get(category);
  // 3-layer merge: defaults ← specialized (entity loaded async into cache)
  const defaults = buildDefaultVerticalConfig(category);
  const specialized = getSpecializedVerticalConfig(category);
  return deepMerge(defaults, specialized);
}

/**
 * Get a specific section of a Vertical configuration.
 */
export function getVerticalSection(category, section) {
  const config = getVerticalConfig(category);
  return config[section];
}

/**
 * Async load — prefetch all configs into cache.
 * Call on app init or before a screen that needs fresh configs.
 */
export async function loadVerticalConfigs() {
  const map = await loadCache();
  return map;
}

/**
 * Invalidate the cache so the next read fetches fresh data from the entity.
 * Call after an admin edits a vertical config.
 */
export function invalidateVerticalConfigs() {
  _cache = null;
  _loadPromise = null;
}

/**
 * React hook: loads the merged config for a category, with loading state.
 * Uses React Query for caching & refetch.
 */
export function useVerticalConfig(category) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['verticalConfig', category],
    queryFn: async () => {
      await loadCache();
      return getVerticalConfig(category);
    },
    staleTime: 5 * 60 * 1000, // 5 min
  });

  // Always return a usable config (default) even while loading
  return {
    config: data || getVerticalConfig(category),
    isLoading,
    error,
  };
}

/**
 * React hook: load ALL active vertical configs.
 */
export function useAllVerticalConfigs() {
  const { data, isLoading } = useQuery({
    queryKey: ['verticalConfigsAll'],
    queryFn: async () => {
      const map = await loadCache();
      return Array.from(map.values());
    },
    staleTime: 5 * 60 * 1000,
  });

  return { verticals: data || [], isLoading };
}

/**
 * Seed all default configs into the entity via the backend function.
 * Admin-only. Idempotent (upserts).
 */
export async function seedVerticalConfigs() {
  const { buildAllDefaultVerticalConfigs } = await import('./defaults');
  const configs = buildAllDefaultVerticalConfigs();
  const res = await base44.functions.invoke('seedVerticalConfigs', { configs });
  invalidateVerticalConfigs();
  return res.data;
}