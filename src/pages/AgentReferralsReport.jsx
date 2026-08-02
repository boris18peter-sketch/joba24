import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';
import AgentReferralsTab from '@/components/AgentReferralsTab';

// Thin page wrapper for the /admin/agent-referrals route.
// The report body lives in AgentReferralsTab so it can also be embedded
// directly inside the Admin Dashboard.
export default function AgentReferralsReport() {
  const navigate = useNavigate();
  const { isRTL } = useLanguage();

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} style={{ minHeight: '100dvh', background: 'var(--surface-1)' }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'linear-gradient(135deg, #0f2b6b, #1a6fd4)', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate(-1)} style={{ width: 36, height: 36, borderRadius: 11, background: 'rgba(255,255,255,0.15)', border: '1.5px solid rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <ChevronLeft size={18} color="white" style={{ transform: 'rotate(180deg)' }} />
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 17, fontWeight: 900, color: 'white' }}>דוח הפניות סוכנים</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', marginTop: 1 }}>כמה משתמשים נרשמו בפועל דרך כל סוכן</div>
        </div>
      </div>
      <div style={{ padding: '16px 16px 40px' }}>
        <AgentReferralsTab />
      </div>
    </div>
  );
}