/**
 * Vertical Research Center — Runtime API
 * ───────────────────────────────────────────────────────────────────────────
 * Internal knowledge base for vertical-specific product decisions.
 *
 * Each vertical has a "research document" — the operating manual that
 * documents competitors, UX patterns, trust factors, KPIs, fraud risks,
 * and roadmap. NOT exposed to end users.
 *
 * Used by the team and AI agents: "What should the review form ask for
 * plumbing?" → look it up in the research center.
 *
 * Documents are stored in the VerticalResearch entity and deep-merged
 * over the code-shipped defaults (from research/*.js files).
 */

import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { PLUMBING_RESEARCH } from './plumbing';

// ── Code-shipped research documents (Layer 1) ─────────────────────────────
export const SHIPPED_RESEARCH = {
  plumbing: PLUMBING_RESEARCH,
};

// ── In-memory cache for entity overrides (Layer 2) ────────────────────────
let _researchCache = null;

async function loadResearchCache() {
  if (_researchCache) return _researchCache;
  try {
    const records = await base44.entities.VerticalResearch.list('-updated_date', 100);
    const map = new Map();
    for (const rec of records) {
      if (rec.status === 'published' || rec.status === 'in_progress') {
        map.set(rec.vertical_id, rec);
      }
    }
    _researchCache = map;
    return map;
  } catch (err) {
    console.warn('[ResearchCenter] Failed to load, using shipped docs:', err.message);
    _researchCache = new Map();
    return _researchCache;
  }
}

/**
 * Get the research document for a vertical.
 * Sync — returns shipped doc immediately; entity override loaded async.
 */
export function getVerticalResearch(verticalId) {
  // Entity override (if loaded) takes precedence
  if (_researchCache?.has(verticalId)) {
    return _researchCache.get(verticalId);
  }
  // Fall back to shipped doc
  return SHIPPED_RESEARCH[verticalId] || null;
}

/**
 * Get a specific section of the research document.
 */
export function getResearchSection(verticalId, section) {
  const doc = getVerticalResearch(verticalId);
  if (!doc?.research) return null;
  return doc.research[section];
}

/**
 * React hook: load research document with async entity override.
 */
export function useVerticalResearch(verticalId) {
  const { data, isLoading } = useQuery({
    queryKey: ['verticalResearch', verticalId],
    queryFn: async () => {
      await loadResearchCache();
      return getVerticalResearch(verticalId);
    },
    staleTime: 10 * 60 * 1000, // 10 min — research changes rarely
  });

  return {
    research: data || getVerticalResearch(verticalId),
    isLoading,
  };
}

/**
 * React hook: list all research documents.
 */
export function useAllVerticalResearch() {
  const { data, isLoading } = useQuery({
    queryKey: ['verticalResearchAll'],
    queryFn: async () => {
      await loadResearchCache();
      const entityVerticals = Array.from(_researchCache.values()).map(r => r.vertical_id);
      const shippedVerticals = Object.keys(SHIPPED_RESEARCH);
      const allIds = [...new Set([...shippedVerticals, ...entityVerticals])];
      return allIds.map(id => getVerticalResearch(id)).filter(Boolean);
    },
    staleTime: 10 * 60 * 1000,
  });

  return { documents: data || [], isLoading };
}

/**
 * Invalidate cache — call after editing research in the entity.
 */
export function invalidateResearchCache() {
  _researchCache = null;
}