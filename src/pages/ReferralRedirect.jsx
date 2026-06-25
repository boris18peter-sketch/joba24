import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';

export default function ReferralRedirect() {
  const { code } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    if (!code) {
      navigate('/', { replace: true });
      return;
    }

    // Store the ref code so AuthContext applies it after login
    localStorage.setItem('joba24_ref_code', code);

    // Track the click (once per session per ref code)
    const clickKey = `joba24_ref_click_${code}`;
    if (!sessionStorage.getItem(clickKey)) {
      sessionStorage.setItem(clickKey, '1');
      base44.functions.invoke('trackReferralClick', { agent_code: code }).catch(() => {});
    }

    // Redirect to home with ref in URL so CaptureRefCode also processes it
    navigate(`/?ref=${code}`, { replace: true });
  }, [code, navigate]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh', background: 'linear-gradient(135deg, #0a1f4e, #1a6fd4)' }}>
      <div style={{ width: 36, height: 36, border: '3px solid rgba(255,255,255,0.2)', borderTopColor: '#fbbf24', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}