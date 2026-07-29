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

    // Generate or retrieve device_id for download tracking
    let deviceId = localStorage.getItem('joba24_device_id');
    if (!deviceId) {
      deviceId = 'dev_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('joba24_device_id', deviceId);
    }

    // Track the click (once per session per ref code) + create ReferralEvent
    const clickKey = `joba24_ref_click_${code}`;
    if (!sessionStorage.getItem(clickKey)) {
      sessionStorage.setItem(clickKey, '1');
      base44.functions.invoke('trackReferralClick', { agent_code: code, device_id: deviceId, count_click: true }).catch(() => {});
    } else {
      base44.functions.invoke('trackReferralClick', { agent_code: code, device_id: deviceId, count_click: false }).catch(() => {});
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