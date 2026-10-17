import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { useLanguage } from '@/lib/LanguageContext';
import { BrandLogo, BrandName, useBrandIdentity, useBrandText } from '@/components/BrandIdentity';
import LoginPromptModal from '@/components/LoginPromptModal';
import OnboardingFooter from '@/components/onboarding/OnboardingFooter';
import { useRegistrationCount } from '@/hooks/useRegistrationCount';
import { useJobaSettings } from '@/hooks/useJobaSettings';

/**
 * The join screen, INSIDE the worker flow — the last step, not a separate page.
 *
 * It is the same join content the standalone /join page shows (brand lockup,
 * headline, live sign-up count, register button, continue-as-guest), rendered
 * in the onboarding shell with the progress bar carried through, so finishing
 * the explainer screens leads straight into it and the visitor never feels
 * handed off to another page.
 *
 * The LOGIC is untouched. Signing in still lands the visitor in the existing
 * worker profile setup (/join, which shows the stepper once authenticated), and
 * "continue as guest" still enters guest mode and opens the app — exactly as
 * the standalone page does. Nothing here authenticates anyone or writes a
 * profile.
 */
export default function WorkerJoinStep({ onBack }) {
  const navigate = useNavigate();
  const { enterGuestMode } = useAuth();
  const { t, isRTL } = useLanguage();
  const identity = useBrandIdentity();
  const brandText = useBrandText();
  const regCount = useRegistrationCount();
  const { settings: jobaSettings } = useJobaSettings();
  const guestEnabled = jobaSettings.guest_access_enabled !== false;
  const [showLogin, setShowLogin] = useState(false);

  return (
    <div className="j-onb" dir={isRTL ? 'rtl' : 'ltr'}>
      {showLogin && (
        <LoginPromptModal
          onClose={() => setShowLogin(false)}
          // Signing in continues the SAME journey: /join shows the worker
          // profile setup for an authenticated visitor.
          onLogin={() => navigate('/join')}
        />
      )}

      {/* Same bar as the explainer screens, with every step filled — this is the
          last screen of the flow, so it reads as arriving, not as starting over. */}
      <div className="j-onb-bar">
        <button className="j-onb-icon" onClick={onBack} aria-label="חזרה">
          <ArrowRight size={18} />
        </button>

        <div className="j-onb-progress">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="j-onb-pip" style={{ flex: 1, background: 'var(--brand-primary)' }} />
          ))}
        </div>

        <span style={{ width: 40, flexShrink: 0 }} />
      </div>

      <div className="j-onb-stage">
        <div className="j-onb-body">
          <div className="j-joinstep">
            <div className="j-hero-logo">
              <BrandLogo size={88} radius={0} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <span className="j-hero-brand">
              <BrandName />
            </span>

            <h1 className="j-hero-title">{t('wo_hero_title')}</h1>
            <p className="j-hero-body">{brandText(t('wo_hero_body'))}</p>
            <p className="j-hero-body" style={{ fontWeight: 700, color: 'var(--text-1)' }}>{t('wo_hero_body2')}</p>

            <span className="j-hero-count">
              <span className="j-hero-count-n">{regCount.toLocaleString()}</span>
              <span className="j-hero-count-t">{`כבר הצטרפו ל-${identity.name}`}</span>
            </span>
          </div>
        </div>
      </div>

      <div className="j-onb-foot">
        <button className="j-onb-cta" onClick={() => setShowLogin(true)}>
          {t('wo_register_btn')}
        </button>

        <div className="j-hero-note">{t('wo_setup_note')}</div>

        {guestEnabled && (
          <button
            className="j-hero-cta-2"
            style={{ width: '100%', maxWidth: 520, margin: '0 auto' }}
            onClick={() => { enterGuestMode(); navigate('/'); }}
          >
            {t('continue_as_guest')}
          </button>
        )}

        <OnboardingFooter />
      </div>
    </div>
  );
}