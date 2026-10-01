/**
 * Brand design tokens (backend).
 *
 * The authoritative KEY LIST for `BrandConfig.theme`. A Brand's theme is a flat
 * map of token key -> value; an unset token falls back to the platform default,
 * so a Brand overrides only what it wants to change.
 *
 * The frontend mirror lives in `src/lib/brand/themeTokens.js` (the two bundles
 * have no shared import path). Keep the key lists in step.
 */

export const BRAND_THEME_TOKENS: { key: string; type: 'color' | 'number' | 'shadow' }[] = [
  // ── Core ──
  { key: 'primary', type: 'color' },
  { key: 'primary_dark', type: 'color' },
  { key: 'secondary', type: 'color' },
  { key: 'accent', type: 'color' },
  { key: 'background', type: 'color' },
  { key: 'surface', type: 'color' },
  { key: 'surface_alt', type: 'color' },
  { key: 'text_primary', type: 'color' },
  { key: 'text_secondary', type: 'color' },
  { key: 'border', type: 'color' },
  // ── Buttons ──
  { key: 'button_primary_bg', type: 'color' },
  { key: 'button_primary_text', type: 'color' },
  { key: 'button_secondary_bg', type: 'color' },
  { key: 'button_secondary_text', type: 'color' },
  { key: 'button_radius', type: 'number' },
  // ── Cards ──
  { key: 'card_bg', type: 'color' },
  { key: 'card_border', type: 'color' },
  { key: 'card_radius', type: 'number' },
  { key: 'card_shadow', type: 'shadow' },
  // ── Inputs ──
  { key: 'input_bg', type: 'color' },
  { key: 'input_border', type: 'color' },
  { key: 'input_focus', type: 'color' },
  { key: 'input_radius', type: 'number' },
  // ── Popups / modals ──
  { key: 'modal_bg', type: 'color' },
  { key: 'modal_radius', type: 'number' },
  { key: 'overlay', type: 'color' },
  // ── Banners ──
  { key: 'banner_bg', type: 'color' },
  { key: 'banner_text', type: 'color' },
  { key: 'banner_accent', type: 'color' },
  // ── Header / navigation ──
  { key: 'header_bg', type: 'color' },
  { key: 'header_text', type: 'color' },
  { key: 'header_active', type: 'color' },
];

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
/** A CSS colour that is not a hex literal: rgb()/hsl()/rgba()/hsla() or a named colour. */
const FUNC_RE = /^(rgb|rgba|hsl|hsla)\([^)]*\)$/i;
const NAME_RE = /^[a-z]{3,20}$/i;
/** A shadow token: numeric length / colour / keyword characters only. */
const SHADOW_RE = /^[0-9a-zA-Z#%.,()\s-]{1,120}$/;

export const SHADOW_PRESETS: Record<string, string> = {
  none: 'none',
  sm: '0 1px 3px rgba(15,40,107,0.06)',
  md: '0 4px 16px rgba(15,40,107,0.10)',
  lg: '0 8px 32px rgba(15,40,107,0.13)',
};

export function isColorValue(v: string) {
  return HEX_RE.test(v) || FUNC_RE.test(v) || NAME_RE.test(v);
}

/**
 * Merge a partial theme into an existing one. Only known token keys are
 * accepted, and each value is validated for its token type. A provided-but-
 * invalid value is reported, never silently stored.
 */
export function mergeTheme(existing: unknown, incoming: unknown) {
  const base = (existing && typeof existing === 'object') ? { ...(existing as any) } : {};
  if (!incoming || typeof incoming !== 'object') return { theme: base, invalid: [] as string[] };

  const invalid: string[] = [];
  for (const token of BRAND_THEME_TOKENS) {
    if (!(token.key in (incoming as any))) continue;
    const raw = (incoming as any)[token.key];
    if (raw === null || raw === '') { delete base[token.key]; continue; }
    const value = String(raw).trim();

    if (token.type === 'color') {
      if (!isColorValue(value)) { invalid.push(token.key); continue; }
    } else if (token.type === 'number') {
      const n = Number(value);
      if (!Number.isFinite(n) || n < 0 || n > 60) { invalid.push(token.key); continue; }
      base[token.key] = n;
      continue;
    } else if (token.type === 'shadow') {
      if (value in SHADOW_PRESETS) { base[token.key] = value; continue; }
      if (!SHADOW_RE.test(value)) { invalid.push(token.key); continue; }
    }
    base[token.key] = value;
  }
  return { theme: base, invalid };
}