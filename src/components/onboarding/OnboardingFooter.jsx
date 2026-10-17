import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '@/lib/LanguageContext';
import StoreDownloadButtons from '@/components/StoreDownloadButtons';

/**
 * The ONE footer shared by Welcome and Join.
 *
 * Both pages render this exact component, so the three policy links and the two
 * store badges can never drift apart between them.
 *
 * Each link records the page it was clicked from. The policy pages read that and
 * send Back to the very screen the visitor left — the welcome flow or the join
 * flow — rather than to one fixed page that is only right for one of them.
 *
 * The store badges keep their existing logic untouched: StoreDownloadButtons
 * itself hides them inside the iOS/Android app and the installed PWA, and shows
 * them only when the dashboard has store URLs configured. Nothing here
 * re-implements or overrides that.
 */
export default function OnboardingFooter() {
  const { t } = useLanguage();
  const location = useLocation();
  const from = { from: location.pathname };

  return (
    <footer className="j-hero-foot">
      <div className="j-hero-links">
        <Link to="/terms" state={from} className="j-hero-link">{t('terms_title')}</Link>
        <span className="j-hero-link-sep">|</span>
        <Link to="/privacy" state={from} className="j-hero-link">{t('privacy_title')}</Link>
        <span className="j-hero-link-sep">|</span>
        <Link to="/faq" state={from} className="j-hero-link">{t('faq_title')}</Link>
      </div>

      <StoreDownloadButtons size="sm" />
    </footer>
  );
}