import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { detectMobilePlatform } from '@/lib/utils';

/**
 * ReferralRedirect — `/r/:code`
 *
 * Handles an agent's referral link. Acts as an instant, attribution-preserving
 * redirect: it records the click + device (so the user is attributed to the
 * agent), then immediately bounces the visitor to the best destination:
 *   1. The native app store (App Store / Google Play) when store URLs are set
 *      in JobaSettings AND the device is mobile — so it behaves like a direct
 *      store link (no visible landing page), while still crediting the agent.
 *   2. Otherwise the web app home (`/?ref=code`) so the user can register now.
 */
export default function ReferralRedirect() {
  const { code } = useParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('working'); // 'working' | 'redirecting'

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
    const countClick = !sessionStorage.getItem(clickKey);
    if (countClick) sessionStorage.setItem(clickKey, '1');

    const platform = detectMobilePlatform();

    const finish = (storeUrl) => {
      // Bounce to the store when available for this mobile platform, else web app.
      if (storeUrl) {
        setStatus('redirecting');
        window.location.href = storeUrl;
      } else {
        navigate(`/?ref=${code}`, { replace: true });
      }
    };

    // Record attribution first (await so the event is saved before we leave),
    // then fetch store settings to decide where to send the user.
    (async () => {
      try {
        await base44.functions.invoke('trackReferralClick', {
          agent_code: code,
          device_id: deviceId,
          count_click: countClick,
        });
      } catch {}

      let storeUrl = '';
      try {
        const settings = await base44.entities.JobaSettings.list('-updated_date', 1);
        const s = settings?.[0];
        if (s?.store_buttons_enabled !== false) {
          storeUrl = platform === 'ios'
            ? (s?.app_store_url || '')
            : platform === 'android'
              ? (s?.google_play_url || '')
              : '';
        }
      } catch {}

      finish(storeUrl);
    })();
  }, [code, navigate]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100dvh', gap: 16, background: 'linear-gradient(135deg, #0a1f4e, #1a6fd4)' }}>
      <div style={{ fontSize: 28, fontWeight: 900, color: 'white', letterSpacing: -0.3 }}>Joba24</div>
      <div style={{ width: 36, height: 36, border: '3px solid rgba(255,255,255,0.2)', borderTopColor: '#fbbf24', borderRadius: '50%', animation: 'rrSpin 0.7s linear infinite' }} />
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>
        {status === 'redirecting' ? 'פותח את החנות…' : 'רק רגע…'}
      </div>
      <style>{`@keyframes rrSpin { to { transform: rotate(360deg) } }`}</style>
    </div>
  );
}