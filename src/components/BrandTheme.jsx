import { useEffect } from 'react';
import { useBrand } from '@/lib/brand/BrandProvider';
import { useLanguage } from '@/lib/LanguageContext';

/**
 * BrandTheme — makes the Brand's BrandConfig values REAL on the surface.
 *
 * Without this, colours/logo/favicon/language would be decorative database
 * fields. It applies, on every surface that resolves to a Brand:
 *   • colours   → the --brand-* tokens and the shadcn --primary/--accent tokens
 *   • favicon   → <link rel="icon">
 *   • title     → document.title
 *   • language  → the Brand's default_locale, only when the visitor has not
 *                 chosen a language themselves
 *
 * The platform Brand (Joba24) is left completely untouched: a value is only
 * applied when the Brand actually sets it, and Joba24 sets none of them.
 */

function hexToHsl(hex) {
  let h = String(hex).replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (h.length !== 6) return null;
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

export default function BrandTheme() {
  const { isResolved, effective } = useBrand();
  const { setLang } = useLanguage();

  // Colours
  useEffect(() => {
    if (!isResolved) return;
    const root = document.documentElement;
    const pairs = [
      ['--brand-primary', effective.primaryColor],
      ['--brand-primary-dark', effective.primaryDarkColor],
      ['--brand-accent', effective.accentColor],
    ];
    for (const [name, value] of pairs) {
      if (value) root.style.setProperty(name, value);
      else root.style.removeProperty(name);
    }

    const primaryHsl = effective.primaryColor ? hexToHsl(effective.primaryColor) : null;
    if (primaryHsl) {
      root.style.setProperty('--primary', primaryHsl);
      root.style.setProperty('--accent', primaryHsl);
      root.style.setProperty('--ring', primaryHsl);
    } else {
      root.style.removeProperty('--primary');
      root.style.removeProperty('--accent');
      root.style.removeProperty('--ring');
    }

    const darkHsl = effective.primaryDarkColor ? hexToHsl(effective.primaryDarkColor) : null;
    if (darkHsl) root.style.setProperty('--brand-primary-dark-hsl', darkHsl);
    else root.style.removeProperty('--brand-primary-dark-hsl');

    return () => {
      for (const [name] of pairs) root.style.removeProperty(name);
      root.style.removeProperty('--primary');
      root.style.removeProperty('--accent');
      root.style.removeProperty('--ring');
      root.style.removeProperty('--brand-primary-dark-hsl');
    };
  }, [isResolved, effective.primaryColor, effective.primaryDarkColor, effective.accentColor]);

  // Favicon
  useEffect(() => {
    if (!isResolved || !effective.faviconUrl) return;
    const links = Array.from(document.querySelectorAll('link[rel="icon"], link[rel="apple-touch-icon"]'));
    const previous = links.map((l) => l.getAttribute('href'));
    links.forEach((l) => l.setAttribute('href', effective.faviconUrl));
    return () => links.forEach((l, i) => { if (previous[i]) l.setAttribute('href', previous[i]); });
  }, [isResolved, effective.faviconUrl]);

  // Title
  useEffect(() => {
    if (!isResolved || !effective.displayName) return;
    const previous = document.title;
    document.title = effective.displayName;
    return () => { document.title = previous; };
  }, [isResolved, effective.displayName]);

  // Language — the Brand's default, only when the visitor has not chosen one.
  useEffect(() => {
    if (!isResolved || !effective.defaultLocale) return;
    if (localStorage.getItem('joba24_lang')) return;
    setLang(effective.defaultLocale);
  }, [isResolved, effective.defaultLocale, setLang]);

  return null;
}