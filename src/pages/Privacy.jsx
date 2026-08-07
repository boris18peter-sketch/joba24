import PageHeader from '@/components/PageHeader';
import { useAuth } from '@/lib/AuthContext';
import AccountDeletionRequest from '@/components/AccountDeletionRequest';
import { useLanguage } from '@/lib/LanguageContext';
import { getPrivacySections, getPrivacyIntro } from '@/lib/privacyContent';

export default function Privacy() {
  const { isAuthenticated } = useAuth();
  const { t, isRTL, lang } = useLanguage();
  const intro = getPrivacyIntro(lang);
  const sections = getPrivacySections(lang);

  return (
    <div style={{ background: '#f8f9fc', minHeight: '100vh' }} dir={isRTL ? 'rtl' : 'ltr'}>
      <PageHeader title={t('privacy_title')} backTo={!isAuthenticated ? '/join' : undefined} />
      
      {/* Intro Section */}
      <div style={{ padding: '20px 16px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: '#0f2b6b', marginBottom: 12, textAlign: 'center' }}>
          {t('privacy_h1')}
        </h1>
        <p style={{ fontSize: 13, color: '#64748b', textAlign: 'center', marginBottom: 8 }}>
          <strong>{t('privacy_last_update')}</strong> {t('privacy_date')}
        </p>
        
        <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', padding: '16px', marginBottom: 20 }}>
          {intro.map((p, i) => (
            <p key={i} style={{ fontSize: 14, color: '#1a2540', lineHeight: 1.8, margin: 0, marginTop: i > 0 ? 12 : 0 }}>
              {p}
            </p>
          ))}
        </div>
      </div>

      {/* Sections */}
      <div style={{ paddingBottom: 40 }}>
        {sections.map((section) => (
          <div key={section.number} style={{ paddingX: 16, marginBottom: 16 }}>
            <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              {/* Section Header */}
              <div style={{ background: 'linear-gradient(135deg, #1a6fd4, #0a52b0)', padding: '16px', borderBottom: '1px solid #e2e8f0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ color: 'white', fontWeight: 900, fontSize: 18 }}>{section.number}</span>
                  </div>
                  <h2 style={{ color: 'white', fontWeight: 800, fontSize: 16, margin: 0 }}>{section.title}</h2>
                </div>
              </div>

              {/* Section Content */}
              <div style={{ padding: '16px' }}>
                <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.8, whiteSpace: 'pre-wrap', margin: 0 }}>
                  {section.content}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Account Deletion — Google Play requirement */}
      <div style={{ padding: '0 16px 24px' }}>
        <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', padding: 20, textAlign: 'center' }}>
          <h2 style={{ fontSize: 16, fontWeight: 900, color: '#0f2b6b', margin: '0 0 6px' }}>{t('privacy_delete_account')}</h2>
          <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.5, margin: '0 0 16px' }}>
            {t('privacy_delete_desc')}
          </p>
          <AccountDeletionRequest />
        </div>
      </div>

      {/* Footer */}
      <div style={{ background: '#f1f5f9', borderTop: '1px solid #e2e8f0', padding: '20px 16px', textAlign: 'center' }}>
        <p style={{ fontSize: 12, color: '#64748b', margin: 0, lineHeight: 1.6 }}>
          {t('privacy_footer')}
           <br />
           <strong style={{ color: '#1a6fd4' }}>{t('privacy_footer_agree')}</strong>
        </p>
      </div>
    </div>
  );
}