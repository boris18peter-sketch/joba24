import { Link } from 'react-router-dom';
import { useLanguage } from '@/lib/LanguageContext';
import StoreDownloadButtons from '@/components/StoreDownloadButtons';

/**
 * The ONE footer shared by Welcome and Join.
 *
 * Both pages render this exact component, so the three policy links and the two
 * store badges can never drift apart between them.
 *
 * The store badges keep their existing logic untouched: StoreDownloadButtons
 * itself hides them inside the iOS/Android app and the installed PWA, and shows
 * them only when the dashboard has store URLs configured. Nothing here
 * re-implements or overrides that.
 */
export default function OnboardingFooter() {
  const { t } = useLanguage();

  return (
    <footer className="j-hero-foot">
      <div className="j-hero-links">
        <Link to="/terms" className="j-hero-link">{t('terms_title')}</Link>
        <span className="j-hero-link-sep">|</span>
        <Link to="/privacy" className="j-hero-link">{t('privacy_title')}</Link>
        <span className="j-hero-link-sep">|</span>
        <Link to="/faq" className="j-hero-link">{t('faq_title')}</Link>
      </div>

      <StoreDownloadButtons size="sm" />
    </footer>
  );
}