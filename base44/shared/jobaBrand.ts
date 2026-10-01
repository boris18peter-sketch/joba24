/**
 * jobaBrand — canonical Brand.id of the default Joba24 brand.
 *
 * ── Contract (ADR-23) ─────────────────────────────────────────────────
 * The canonical relational Brand identifier is **Brand.id** — never the slug.
 * The value below MUST equal the `id` of the Brand record where:
 *   slug = 'joba24' · is_default = true · status = 'active' · origin = 'platform'
 *
 * Never store a slug, domain, hostname or Base44 identifier here.
 *
 * ── Why a constant and not a runtime lookup ───────────────────────────
 * This is a canonical, permanent identifier — not a hostname-derived value.
 * A database read on every task/application creation would add latency and a
 * failure point to the most critical write paths in the marketplace, so a
 * runtime resolution step was explicitly rejected.
 *
 * Attribution is therefore applied from a constant, and attribution integrity
 * is verified by a separate read-only audit — not by blocking user writes.
 *
 * ── Changing the canonical identity ───────────────────────────────────
 * Changing it means updating the Brand record **and** this constant.
 * The two must stay in sync. There is no third place.
 *
 * ── Note on the deliberate duplication ────────────────────────────────
 * Frontend and backend have no shared import path (separate bundles), so the
 * constant is defined once per runtime:
 *   • Backend  — this file
 *   • Frontend — src/lib/jobaBrand.js
 * That is the minimum necessary duplication. Do not copy the ID anywhere else.
 */

export const JOBA24_BRAND_ID = '6abdfc541dc144ca0d91fde9';