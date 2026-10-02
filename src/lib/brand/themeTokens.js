/**
 * Brand design tokens (frontend).
 *
 * The authoritative KEY LIST for `BrandConfig.theme`, the Joba24 defaults, and
 * the mapping from a token to the CSS variables the app actually reads.
 *
 * Everything is applied CENTRALLY by BrandTheme. Components must never hardcode
 * a brand colour: they read the CSS variable, and the variable is what a Brand
 * overrides. Each variable has a fallback equal to the current Joba24 value, so
 * an unset token leaves the platform untouched.
 *
 * Mirrors `base44/shared/brandTheme.ts` (separate bundles, no shared import).
 */

export const TOKEN_GROUPS = [
  {
    id: 'core', title: 'בסיס', hint: 'הצבעים והמשטחים הבסיסיים של המותג.',
    tokens: [
      { key: 'primary', type: 'color', label: 'צבע ראשי' },
      { key: 'primary_dark', type: 'color', label: 'ראשי כהה' },
      { key: 'secondary', type: 'color', label: 'צבע משני' },
      { key: 'accent', type: 'color', label: 'צבע הדגשה' },
      { key: 'background', type: 'color', label: 'רקע עמוד' },
      { key: 'surface', type: 'color', label: 'משטח / כרטיס' },
      { key: 'surface_elevated', type: 'color', label: 'משטח מוגבה' },
      { key: 'surface_alt', type: 'color', label: 'משטח משני' },
      { key: 'text_primary', type: 'color', label: 'טקסט ראשי' },
      { key: 'text_secondary', type: 'color', label: 'טקסט משני' },
      { key: 'text_muted', type: 'color', label: 'טקסט עמום' },
      { key: 'border', type: 'color', label: 'גבול' },
      { key: 'divider', type: 'color', label: 'קו מפריד' },
      { key: 'hero_bg', type: 'color', label: 'רקע כותרת עמוד / Hero' },
      { key: 'hero_text', type: 'color', label: 'טקסט כותרת עמוד / Hero' },
    ],
  },
  {
    id: 'status', title: 'צבעי מערכת', hint: 'הצלחה, אזהרה ושגיאה — משפיעים על תגיות וסטטוסים.',
    tokens: [
      { key: 'success', type: 'color', label: 'הצלחה' },
      { key: 'warning', type: 'color', label: 'אזהרה' },
      { key: 'error', type: 'color', label: 'שגיאה' },
    ],
  },
  {
    id: 'buttons', title: 'כפתורים', hint: 'כפתור ראשי, משני, מצב מושבת ורדיוס.',
    tokens: [
      { key: 'button_primary_bg', type: 'color', label: 'רקע כפתור ראשי' },
      { key: 'button_primary_text', type: 'color', label: 'טקסט כפתור ראשי' },
      { key: 'button_secondary_bg', type: 'color', label: 'רקע כפתור משני' },
      { key: 'button_secondary_text', type: 'color', label: 'טקסט כפתור משני' },
      { key: 'button_disabled_bg', type: 'color', label: 'רקע כפתור מושבת' },
      { key: 'button_disabled_text', type: 'color', label: 'טקסט כפתור מושבת' },
      { key: 'button_radius', type: 'number', label: 'רדיוס כפתור', unit: 'px' },
    ],
  },
  {
    id: 'cards', title: 'כרטיסים', hint: 'רקע, גבול, רדיוס וצל.',
    tokens: [
      { key: 'card_bg', type: 'color', label: 'רקע כרטיס' },
      { key: 'card_border', type: 'color', label: 'גבול כרטיס' },
      { key: 'card_radius', type: 'number', label: 'רדיוס כרטיס', unit: 'px' },
      { key: 'card_shadow', type: 'shadow', label: 'עומק צל' },
    ],
  },
  {
    id: 'inputs', title: 'שדות קלט', hint: 'רקע, גבול, מיקוד, טקסט ורדיוס.',
    tokens: [
      { key: 'input_bg', type: 'color', label: 'רקע שדה' },
      { key: 'input_border', type: 'color', label: 'גבול שדה' },
      { key: 'input_focus', type: 'color', label: 'צבע מיקוד' },
      { key: 'input_text', type: 'color', label: 'טקסט בשדה' },
      { key: 'input_placeholder', type: 'color', label: 'טקסט מציין מקום' },
      { key: 'input_radius', type: 'number', label: 'רדיוס שדה', unit: 'px' },
    ],
  },
  {
    id: 'modals', title: 'חלונות ופופ-אפים', hint: 'משטח, גבול, כותרת, טקסט, רעלה ורדיוס.',
    tokens: [
      { key: 'modal_bg', type: 'color', label: 'רקע חלון' },
      { key: 'modal_border', type: 'color', label: 'גבול חלון' },
      { key: 'modal_title', type: 'color', label: 'כותרת בחלון' },
      { key: 'modal_text', type: 'color', label: 'טקסט בחלון' },
      { key: 'modal_cta_bg', type: 'color', label: 'פעולה בחלון' },
      { key: 'modal_cta_text', type: 'color', label: 'טקסט פעולה בחלון' },
      { key: 'modal_radius', type: 'number', label: 'רדיוס חלון', unit: 'px' },
      { key: 'overlay', type: 'color', label: 'צבע רעלה' },
    ],
  },
  {
    id: 'banners', title: 'באנרים', hint: 'רקע (עם מעבר גרדיאנט), טקסט, הדגשה וכפתור.',
    tokens: [
      { key: 'banner_bg', type: 'color', label: 'רקע באנר' },
      { key: 'banner_bg_2', type: 'color', label: 'רקע באנר (סיום גרדיאנט)' },
      { key: 'banner_text', type: 'color', label: 'טקסט באנר' },
      { key: 'banner_accent', type: 'color', label: 'הדגשת באנר' },
      { key: 'banner_cta_bg', type: 'color', label: 'רקע כפתור בבאנר' },
      { key: 'banner_cta_text', type: 'color', label: 'טקסט כפתור בבאנר' },
    ],
  },
  {
    id: 'header', title: 'כותרת וניווט', hint: 'רקע וטקסט לכותרת, לרקע הניווט ולמצב הפעיל.',
    tokens: [
      { key: 'header_bg', type: 'color', label: 'רקע כותרת' },
      { key: 'header_text', type: 'color', label: 'טקסט כותרת' },
      { key: 'header_active', type: 'color', label: 'מצב פעיל בכותרת' },
      { key: 'nav_bg', type: 'color', label: 'רקע ניווט' },
      { key: 'nav_text', type: 'color', label: 'טקסט ניווט' },
      { key: 'nav_active', type: 'color', label: 'מצב פעיל בניווט' },
    ],
  },
  {
    id: 'badges', title: 'תגיות וסטטוסים', hint: 'תגית רגילה ותגית פעילה/מאושרת.',
    tokens: [
      { key: 'status_bg', type: 'color', label: 'רקע תגית' },
      { key: 'status_text', type: 'color', label: 'טקסט תגית' },
      { key: 'status_active_bg', type: 'color', label: 'רקע תגית פעילה' },
      { key: 'status_active_text', type: 'color', label: 'טקסט תגית פעילה' },
    ],
  },
];

export const ALL_TOKENS = TOKEN_GROUPS.flatMap((g) => g.tokens);

/** Joba24 defaults — the values already in src/index.css. */
export const TOKEN_DEFAULTS = {
  primary: '#1a6fd4',
  primary_dark: '#0a52b0',
  hero_bg: '#0a52b0',
  hero_text: '#ffffff',
  modal_cta_bg: '#1a6fd4',
  modal_cta_text: '#ffffff',
  secondary: '#eef3fc',
  accent: '#fbbf24',
  background: '#f2f5fb',
  surface: '#ffffff',
  surface_elevated: '#ffffff',
  surface_alt: '#eef3fc',
  text_primary: '#0d1e40',
  text_secondary: '#4b6083',
  text_muted: '#94a3b8',
  border: '#e4eaf5',
  divider: '#e4eaf5',
  success: '#059669',
  warning: '#d97706',
  error: '#dc2626',
  button_primary_bg: '#1a6fd4',
  button_primary_text: '#ffffff',
  button_secondary_bg: '#eef3fc',
  button_secondary_text: '#4b6083',
  button_disabled_bg: '#e2e8f0',
  button_disabled_text: '#94a3b8',
  button_radius: 14,
  card_bg: '#ffffff',
  card_border: '#e4eaf5',
  card_radius: 18,
  card_shadow: 'xs',
  input_bg: '#f2f5fb',
  input_border: '#e4eaf5',
  input_focus: '#1a6fd4',
  input_text: '#0d1e40',
  input_placeholder: '#94a3b8',
  input_radius: 14,
  modal_bg: '#ffffff',
  modal_border: '#e4eaf5',
  modal_title: '#0d1e40',
  modal_text: '#4b6083',
  modal_radius: 28,
  overlay: 'rgba(5,15,40,0.6)',
  banner_bg: '#0f2b6b',
  banner_bg_2: '#1a6fd4',
  banner_text: '#ffffff',
  banner_accent: '#fbbf24',
  banner_cta_bg: '#fbbf24',
  banner_cta_text: '#1a3a6b',
  header_bg: 'rgba(248,250,254,0.96)',
  header_text: '#0d1e40',
  header_active: '#1a6fd4',
  nav_bg: '#ffffff',
  nav_text: '#4b6083',
  nav_active: '#1a6fd4',
  status_bg: '#eef3fc',
  status_text: '#4b6083',
  status_active_bg: '#dcfce7',
  status_active_text: '#166534',
};

export const SHADOW_PRESETS = {
  none: 'none',
  xs: '0 1px 3px rgba(15,40,107,0.06)',
  sm: '0 2px 8px rgba(15,40,107,0.08)',
  md: '0 4px 16px rgba(15,40,107,0.10)',
  lg: '0 8px 32px rgba(15,40,107,0.13)',
  xl: '0 16px 56px rgba(15,40,107,0.18)',
};

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;
const FUNC_RE = /^(rgb|rgba|hsl|hsla)\([^)]*\)$/i;
const NAME_RE = /^[a-z]{3,20}$/i;

export function isColorValue(v) {
  return typeof v === 'string' && (HEX_RE.test(v) || FUNC_RE.test(v) || NAME_RE.test(v));
}

/** Hex -> "H S% L%" for the shadcn HSL tokens. Returns null for non-hex. */
export function hexToHsl(hex) {
  let h = String(hex || '').replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (h.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(h)) return null;
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let hue = 0;
  let sat = 0;
  if (max !== min) {
    const d = max - min;
    sat = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) hue = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) hue = (b - r) / d + 2;
    else hue = (r - g) / d + 4;
    hue /= 6;
  }
  return `${Math.round(hue * 360)} ${Math.round(sat * 100)}% ${Math.round(l * 100)}%`;
}

/** Defaults -> inherited overrides -> own overrides. Dependent defaults follow core tokens. */
export function resolveTheme(theme, inherited = {}) {
  const overrides = { ...inherited, ...theme };
  const t = { ...TOKEN_DEFAULTS };
  for (const token of ALL_TOKENS) {
    const raw = overrides[token.key];
    if (raw === undefined || raw === null || raw === '') continue;
    if (token.type === 'color' && !isColorValue(raw)) continue;
    if (token.type === 'number' && !Number.isFinite(Number(raw))) continue;
    t[token.key] = token.type === 'number' ? Number(raw) : raw;
  }
  const links = {
    primary_dark:'primary',
    button_primary_bg:'primary', button_secondary_bg:'surface_alt', button_secondary_text:'text_secondary',
    card_bg:'surface', card_border:'border', surface_elevated:'surface', divider:'border',
    input_border:'border', input_focus:'primary', input_text:'text_primary', input_placeholder:'text_muted',
    modal_bg:'surface', modal_border:'border', modal_title:'text_primary', modal_text:'text_secondary',
    modal_cta_bg:'button_primary_bg', modal_cta_text:'button_primary_text',
    banner_bg_2:'banner_bg', banner_cta_bg:'accent', banner_accent:'accent',
    header_active:'primary', nav_active:'primary', status_text:'text_secondary',
    hero_bg:'header_bg', hero_text:'header_text',
  };
  for (const [key, source] of Object.entries(links)) {
    if (overrides[key] === undefined || overrides[key] === null || overrides[key] === '') {
      if (overrides[source] != null || t[source] !== TOKEN_DEFAULTS[source]) t[key] = t[source];
    }
  }
  if (!overrides.button_secondary_bg && overrides.secondary) t.button_secondary_bg = t.secondary;
  if (!overrides.hero_bg && !overrides.header_bg && overrides.primary) t.hero_bg = t.primary_dark !== TOKEN_DEFAULTS.primary_dark ? t.primary_dark : t.primary;
  return t;
}

/** A tint of a hex colour over white — used for the light "selected" surface. */
function tint(hex, amount = 0.9) {
  let h = String(hex || '').replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (h.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(h)) return null;
  const mix = (c) => Math.round(parseInt(c, 16) * (1 - amount) + 255 * amount);
  return `rgb(${mix(h.slice(0, 2))}, ${mix(h.slice(2, 4))}, ${mix(h.slice(4, 6))})`;
}

/**
 * Token map -> the CSS variables the app reads.
 * Only variables a token actually controls are emitted; every one of them has a
 * fallback in CSS, so an unset token keeps the platform's current look.
 */
export function themeToCssVars(theme) {
  const t = resolveTheme(theme);
  const shadow = SHADOW_PRESETS[t.card_shadow] || SHADOW_PRESETS.xs;
  const vars = {
    '--brand-primary': t.primary,
    '--brand-primary-dark': t.primary_dark,
    '--brand-secondary': t.secondary,
    '--brand-accent': t.accent,

    '--surface-1': t.background,
    '--surface-2': t.surface,
    '--surface-3': t.surface_alt,
    '--surface-4': t.surface_alt,
    '--text-1': t.text_primary,
    '--text-2': t.text_secondary,
    '--text-3': t.text_muted,
    '--border-1': t.border,
    '--border-2': t.divider,

    '--brand-surface-elevated': t.surface_elevated,
    '--brand-text-muted': t.text_muted,
    '--brand-text-primary': t.text_primary,
    '--brand-text-secondary': t.text_secondary,
    '--brand-divider': t.divider,
    '--brand-success': t.success,
    '--brand-warning': t.warning,
    '--brand-error': t.error,
    '--brand-nav-bg': t.nav_bg,
    '--brand-nav-text': t.nav_text,
    '--brand-nav-active': t.nav_active,
    '--brand-status-bg': t.status_bg,
    '--brand-status-text': t.status_text,
    '--brand-status-active-bg': t.status_active_bg,
    '--brand-status-active-text': t.status_active_text,

    '--card-bg': t.card_bg,
    '--sheet-bg': t.modal_bg,
    '--nav-bg': t.nav_bg,
    '--brand-muted-surface': t.surface_alt,
    '--brand-hero-bg': t.hero_bg,
    '--brand-hero-text': t.hero_text,
    '--brand-modal-cta-bg': t.modal_cta_bg,
    '--brand-modal-cta-text': t.modal_cta_text,
    '--modal-bg': t.modal_bg,
    '--input-bg': t.input_bg,
    '--overlay-bg': t.overlay,
    '--header-bg': t.header_bg,

    '--brand-btn-primary-bg': t.button_primary_bg,
    '--brand-btn-primary-text': t.button_primary_text,
    '--brand-btn-secondary-bg': t.button_secondary_bg,
    '--brand-btn-secondary-text': t.button_secondary_text,
    '--brand-btn-disabled-bg': t.button_disabled_bg,
    '--brand-btn-disabled-text': t.button_disabled_text,
    '--brand-btn-radius': `${t.button_radius}px`,

    '--brand-card-bg': t.card_bg,
    '--brand-card-border': t.card_border,
    '--brand-card-radius': `${t.card_radius}px`,
    '--brand-card-shadow': shadow,

    '--brand-input-bg': t.input_bg,
    '--brand-input-border': t.input_border,
    '--brand-input-focus': t.input_focus,
    '--brand-input-text': t.input_text,
    '--brand-input-placeholder': t.input_placeholder,
    '--brand-input-radius': `${t.input_radius}px`,

    '--brand-modal-bg': t.modal_bg,
    '--brand-modal-border': t.modal_border,
    '--brand-modal-title': t.modal_title,
    '--brand-modal-text': t.modal_text,
    '--brand-modal-radius': `${t.modal_radius}px`,

    '--brand-banner-bg': t.banner_bg,
    '--brand-banner-bg-2': t.banner_bg_2,
    '--brand-banner-text': t.banner_text,
    '--brand-banner-accent': t.banner_accent,
    '--brand-banner-cta-bg': t.banner_cta_bg,
    '--brand-banner-cta-text': t.banner_cta_text,

    '--brand-header-bg': t.header_bg,
    '--brand-header-text': t.header_text,
    '--brand-header-active': t.header_active,
  };

  const lightTint = tint(t.primary);
  if (lightTint) vars['--brand-primary-light'] = lightTint;

  // shadcn semantic tokens follow the core colours.
  const primaryHsl = hexToHsl(t.button_primary_bg);
  if (primaryHsl) {
    vars['--primary'] = primaryHsl;
    vars['--accent'] = primaryHsl;
    vars['--ring'] = primaryHsl;
  }
  const bgHsl = hexToHsl(t.background);
  if (bgHsl) vars['--background'] = bgHsl;
  const fgHsl = hexToHsl(t.text_primary);
  if (fgHsl) vars['--foreground'] = fgHsl;
  const cardHsl = hexToHsl(t.card_bg);
  if (cardHsl) {
    vars['--card'] = cardHsl;
    vars['--popover'] = cardHsl;
  }
  const borderHsl = hexToHsl(t.border);
  if (borderHsl) {
    vars['--border'] = borderHsl;
    vars['--input'] = borderHsl;
  }

  for (const [name, key] of Object.entries({
    '--primary-foreground':'button_primary_text', '--secondary':'button_secondary_bg',
    '--secondary-foreground':'button_secondary_text', '--card-foreground':'text_primary',
    '--popover-foreground':'modal_title', '--muted':'surface_alt', '--muted-foreground':'text_muted',
    '--success':'success', '--warning':'warning', '--destructive':'error',
  })) { const hsl = hexToHsl(t[key]); if (hsl) vars[name] = hsl; }
  const popoverHsl = hexToHsl(t.modal_bg);
  if (popoverHsl) vars['--popover'] = popoverHsl;

  // System colours follow the Brand's own success / warning / error tokens, so
  // every status chip, badge and semantic surface re-themes with them.
  vars['--color-success'] = t.success;
  vars['--color-warning'] = t.warning;
  vars['--color-danger'] = t.error;
  for (const [kind, color] of Object.entries({ success:t.success, warning:t.warning, danger:t.error })) {
    const background = tint(color, 0.94), border = tint(color, 0.55);
    if (background) { vars[`--color-${kind}-bg`] = background; vars[`--${kind}-bg`] = background; }
    if (border) vars[`--color-${kind}-border`] = border;
  }
  vars['--tag-bg'] = t.status_bg;
  vars['--tag-muted'] = t.surface_alt;

  return vars;
}