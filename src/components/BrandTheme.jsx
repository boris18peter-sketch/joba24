import { useEffect } from 'react';
import { useBrand } from '@/lib/brand/BrandProvider';
import { useLanguage } from '@/lib/LanguageContext';
import { themeToCssVars } from '@/lib/brand/themeTokens';

/**
 * BrandTheme — makes the Brand's design tokens REAL on the surface.
 *
 * Every token is applied CENTRALLY here, as CSS variables on <html>. Reusable
 * components read those variables (with the platform value as a fallback), so a
 * Brand re-themes buttons, cards, inputs, popups, banners and the header
 * without a single component being edited.
 *
 * A Brand with NO theme leaves the platform completely untouched — the
 * variables are removed, so src/index.css (and its dark-mode rules) govern.
 * That is what keeps Joba24 byte-identical.
 */

export default function BrandTheme() {
  const { isResolved, effective } = useBrand();
  const { setLang } = useLanguage();
  const theme = effective?.theme;

  // Design tokens
  useEffect(() => {
    if (!isResolved) return;
    const root = document.documentElement;
    const hasTheme = theme && typeof theme === 'object' && Object.keys(theme).length > 0;
    if (!hasTheme) return;

    const vars = themeToCssVars(theme);
    const names = Object.keys(vars);
    for (const name of names) root.style.setProperty(name, vars[name]);
    root.dataset.brandThemed = 'true';

    return () => { for (const name of names) root.style.removeProperty(name); delete root.dataset.brandThemed; };
  }, [isResolved, theme]);

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