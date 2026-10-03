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

export const BRAND_THEME_TOKENS = [
  ...['primary','primary_dark','secondary','accent','background','surface','surface_elevated','surface_alt','text_primary','text_secondary','text_muted','border','divider','success','warning','error','hero_bg','hero_text',
    'button_primary_bg','button_primary_text','button_secondary_bg','button_secondary_text','button_disabled_bg','button_disabled_text',
    'card_bg','card_border','input_bg','input_border','input_focus','input_text','input_placeholder',
    'modal_bg','modal_border','modal_title','modal_text','modal_cta_bg','modal_cta_text','overlay',
    'banner_bg','banner_bg_2','banner_text','banner_accent','banner_cta_bg','banner_cta_text',
    'header_bg','header_text','header_active','nav_bg','nav_text','nav_active',
    'status_bg','status_text','status_active_bg','status_active_text',
    'menu_bg','menu_surface','menu_text','menu_icon','menu_active_bg','menu_active_text','menu_btn_bg','menu_btn_text',
    'glow_primary','glow_accent'].map(key => ({ key, type: 'color' })),
  ...['button_radius','card_radius','input_radius','modal_radius','glow_opacity'].map(key => ({ key, type: 'number' })),
  { key: 'card_shadow', type: 'shadow' },
];

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
/** A CSS colour that is not a hex literal: rgb()/hsl()/rgba()/hsla() or a named colour. */
const FUNC_RE = /^(rgb|rgba|hsl|hsla)\([^)]*\)$/i;
const NAME_RE = /^[a-z]{3,20}$/i;
/** A shadow token: numeric length / colour / keyword characters only. */
const SHADOW_RE = /^[0-9a-zA-Z#%.,()\s-]{1,120}$/;

export const SHADOW_PRESETS: Record<string, string> = {
  none: 'none',
  xs: '0 1px 3px rgba(15,40,107,0.06)',
  sm: '0 2px 8px rgba(15,40,107,0.08)',
  xl: '0 16px 56px rgba(15,40,107,0.18)',
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

  const known = new Set(BRAND_THEME_TOKENS.map(token => token.key));
  const invalid: string[] = Object.keys(incoming).filter(key => !known.has(key));
  for (const token of BRAND_THEME_TOKENS) {
    if (!(token.key in (incoming as any))) continue;
    const raw = (incoming as any)[token.key];
    if (raw === null) { delete base[token.key]; continue; }
    if (raw === '') { invalid.push(token.key); continue; }
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