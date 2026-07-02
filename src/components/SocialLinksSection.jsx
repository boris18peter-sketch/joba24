import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Instagram, Facebook, Loader2, Check, X, ExternalLink, ShieldCheck, Music2 } from 'lucide-react';

const INSTAGRAM_CONNECTOR_ID = '6a461cba44174744ca6f4c1c';
const TIKTOK_CONNECTOR_ID = '6a461cbcb8f2b9b391f70d9e';

const PLATFORMS = [
  {
    key: 'instagram',
    label: 'Instagram',
    icon: Instagram,
    color: 'linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)',
    url: (u) => `https://instagram.com/${u}`,
    oauth: true,
    connectorId: INSTAGRAM_CONNECTOR_ID,
    note: 'עובד עם חשבונות Business/Creator בלבד',
  },
  {
    key: 'tiktok',
    label: 'TikTok',
    icon: Music2,
    color: '#000000',
    url: (u) => `https://tiktok.com/@${u}`,
    oauth: true,
    connectorId: TIKTOK_CONNECTOR_ID,
    note: '',
  },
  {
    key: 'facebook',
    label: 'Facebook',
    icon: Facebook,
    color: '#1877F2',
    url: (u) => `https://facebook.com/${u}`,
    oauth: false,
    connectorId: null,
    note: '',
  },
];

export default function SocialLinksSection({ user }) {
  const queryClient = useQueryClient();
  const [activePlatform, setActivePlatform] = useState(null);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState('');

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['me'] });

  const getData = (key) => ({
    username: user?.[`${key}_username`],
    verified: user?.[`${key}_verified`],
  });

  // ── OAuth connect (Instagram, TikTok) ──
  const handleOAuthConnect = async (platformKey, connectorId) => {
    setLoading(true);
    setError('');
    setResult('');
    try {
      const url = await base44.connectors.connectAppUser(connectorId);
      const popup = window.open(url, '_blank');
      const timer = setInterval(async () => {
        if (!popup || popup.closed) {
          clearInterval(timer);
          // OAuth completed — fetch the profile from the backend
          try {
            const res = await base44.functions.invoke('verifyInstagram', { action: 'fetch_profile', platform: platformKey });
            if (res.data?.success) {
              await refresh();
              setResult('אומת בהצלחה! 🎉');
              setTimeout(() => { setResult(''); setActivePlatform(null); }, 1500);
            } else {
              setError(res.data?.error || 'החיבור נכשל — נסה שוב');
            }
          } catch (e) {
            setError('החיבור נכשל — ודא שאישרת את ההרשאה');
          }
          setLoading(false);
        }
      }, 500);
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'שגיאה');
      setLoading(false);
    }
  };

  // ── Manual connect (Facebook) ──
  const handleManualConnect = async () => {
    const clean = username.replace(/^@/, '').trim();
    if (!clean) return;
    setLoading(true);
    setError('');
    try {
      await base44.functions.invoke('verifyInstagram', { action: 'connect_manual', platform: activePlatform, username: clean });
      await refresh();
      setActivePlatform(null);
      setUsername('');
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'שגיאה');
    }
    setLoading(false);
  };

  // ── Disconnect ──
  const handleDisconnect = async (platform) => {
    setLoading(true);
    setError('');
    try {
      const config = PLATFORMS.find(p => p.key === platform);
      if (config?.oauth && config?.connectorId) {
        try { await base44.connectors.disconnectAppUser(config.connectorId); } catch {}
      }
      await base44.functions.invoke('verifyInstagram', { action: 'disconnect', platform });
      await refresh();
      setActivePlatform(null);
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'שגיאה');
    }
    setLoading(false);
  };

  const activeConfig = PLATFORMS.find(p => p.key === activePlatform);
  const activeData = activePlatform ? getData(activePlatform) : null;
  const verifiedCount = PLATFORMS.filter(p => getData(p.key)?.verified).length;

  return (
    <>
      <div style={{ background: 'var(--surface-2)', borderRadius: 18, border: '1px solid var(--border-1)', overflow: 'hidden' }}>
        <div style={{ padding: '14px 16px 10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-3)', letterSpacing: 0.5, textTransform: 'uppercase' }}>רשתות חברתיות</div>
            {verifiedCount > 0 && (
              <span style={{ fontSize: 10, fontWeight: 700, color: '#059669', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 99, padding: '2px 8px' }}>{verifiedCount} מאומתות</span>
            )}
          </div>
        </div>
        <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {PLATFORMS.map(({ key, label, icon: Icon, color, url, oauth, note }) => {
            const data = getData(key);
            const isVerified = data?.verified;
            const hasUsername = !!data?.username;

            return (
              <div key={key} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 12px', borderRadius: 14,
                background: isVerified ? '#f0fdf4' : hasUsername ? 'var(--surface-3)' : 'var(--surface-3)',
                border: `1px solid ${isVerified ? '#bbf7d0' : 'var(--border-1)'}`,
              }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 11,
                  background: hasUsername ? 'var(--surface-2)' : color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  border: hasUsername ? '1px solid var(--border-1)' : 'none',
                }}>
                  <Icon size={18} color={hasUsername ? 'var(--text-2)' : 'white'} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {hasUsername ? (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>@{data.username}</span>
                        {isVerified && <ShieldCheck size={13} color="#059669" />}
                      </div>
                      <div style={{ fontSize: 11, color: isVerified ? '#059669' : 'var(--text-3)', fontWeight: 600 }}>
                        {isVerified ? 'מאומת ✓' : oauth ? 'לא מאומת' : 'מחובר'}
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-2)' }}>{label}</div>
                      {note && <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 1 }}>{note}</div>}
                    </>
                  )}
                </div>
                {hasUsername ? (
                  <button onClick={() => { setActivePlatform(key); setError(''); setResult(''); }}
                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border-1)', borderRadius: 8, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                    <span style={{ fontSize: 14, color: 'var(--text-3)' }}>⋯</span>
                  </button>
                ) : (
                  <button onClick={() => { setActivePlatform(key); setError(''); setResult(''); }}
                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border-1)', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 700, color: 'var(--text-2)', cursor: 'pointer', flexShrink: 0 }}>
                    חבר
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom sheet */}
      {activePlatform && activeConfig && activeData && createPortal(
        <BottomSheet onClose={() => { setActivePlatform(null); setError(''); setResult(''); setUsername(''); }}>
          {/* Success state */}
          {result && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '20px 0' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid #bbf7d0' }}>
                <Check size={32} color="#059669" strokeWidth={3} />
              </div>
              <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-1)' }}>{result}</div>
            </div>
          )}

          {/* Not connected — OAuth platform */}
          {!result && !activeData.username && activeConfig.oauth && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ textAlign: 'center', marginBottom: 4 }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: activeConfig.color, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  <activeConfig.icon size={28} color="white" />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-1)', margin: 0 }}>חבר את {activeConfig.label} שלך</h3>
                <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 6, lineHeight: 1.5 }}>
                  תתחבר עם הסיסמה שלך ל{activeConfig.label}, ואנחנו נאמת אוטומטית שהחשבון שלך.
                </p>
                {activeConfig.note && (
                  <div style={{ fontSize: 11, color: '#d97706', fontWeight: 600, marginTop: 8, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '6px 10px' }}>
                    ⚠️ {activeConfig.note}
                  </div>
                )}
              </div>
              {error && <div style={{ fontSize: 12, color: '#dc2626', fontWeight: 600 }}>{error}</div>}
              <button onClick={() => handleOAuthConnect(activePlatform, activeConfig.connectorId)} disabled={loading}
                style={{ height: 50, borderRadius: 14, background: 'linear-gradient(135deg, #1a6fd4, #0a52b0)', color: 'white', fontWeight: 800, fontSize: 15, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {loading ? <><Loader2 size={18} className="animate-spin" /> מחכה לאישור...</> : <><activeConfig.icon size={18} /> התחבר ל{activeConfig.label}</>}
              </button>
            </div>
          )}

          {/* Not connected — Manual platform (Facebook) */}
          {!result && !activeData.username && !activeConfig.oauth && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ textAlign: 'center', marginBottom: 4 }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: activeConfig.color, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  <activeConfig.icon size={28} color="white" />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-1)', margin: 0 }}>חבר את {activeConfig.label} שלך</h3>
                <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 6, lineHeight: 1.5 }}>הזן את שם המשתמש שלך ב{activeConfig.label}</p>
              </div>
              <input
                type="text"
                dir="ltr"
                placeholder="username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoFocus
                style={{ width: '100%', height: 50, borderRadius: 14, border: '1.5px solid var(--border-1)', padding: '0 16px', fontSize: 16, background: 'var(--surface-3)', color: 'var(--text-1)', outline: 'none', boxSizing: 'border-box', textAlign: 'right' }}
              />
              {error && <div style={{ fontSize: 12, color: '#dc2626', fontWeight: 600 }}>{error}</div>}
              <button onClick={handleManualConnect} disabled={loading || !username.trim()}
                style={{ height: 50, borderRadius: 14, background: username.trim() ? 'linear-gradient(135deg, #1a6fd4, #0a52b0)' : 'var(--surface-3)', color: username.trim() ? 'white' : 'var(--text-3)', fontWeight: 800, fontSize: 15, border: 'none', cursor: username.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {loading ? <Loader2 size={18} className="animate-spin" /> : 'שמור'}
              </button>
            </div>
          )}

          {/* Connected — manage */}
          {!result && activeData.username && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ textAlign: 'center', marginBottom: 4 }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: activeConfig.color, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  <activeConfig.icon size={28} color="white" />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-1)', margin: 0 }}>{activeConfig.label}</h3>
                <a href={activeConfig.url(activeData.username)} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 14, color: '#1a6fd4', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                  @{activeData.username} <ExternalLink size={12} />
                </a>
              </div>
              {activeData.verified ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: '#f0fdf4', borderRadius: 14, border: '1px solid #bbf7d0' }}>
                  <ShieldCheck size={18} color="#059669" />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#065f46' }}>החשבון מאומת</div>
                    <div style={{ fontSize: 12, color: '#059669' }}>הבעלות אומתה באמצעות התחברות</div>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: 'var(--surface-3)', borderRadius: 14, border: '1px solid var(--border-1)' }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-2)' }}>חשבון מחובר</div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{activeConfig.oauth ? 'לא מאומת' : 'חיבור ידני ללא אימות'}</div>
                  </div>
                </div>
              )}
              {error && <div style={{ fontSize: 12, color: '#dc2626', fontWeight: 600 }}>{error}</div>}
              <button onClick={() => handleDisconnect(activePlatform)} disabled={loading}
                style={{ height: 48, borderRadius: 14, background: '#fff1f2', border: '1px solid #fecaca', color: '#dc2626', fontWeight: 700, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {loading ? <Loader2 size={18} className="animate-spin" /> : <><X size={16} /> נתק חשבון</>}
              </button>
            </div>
          )}
        </BottomSheet>,
        document.body
      )}
    </>
  );
}

function BottomSheet({ children, onClose }) {
  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, zIndex: 999999, background: 'rgba(5,15,40,0.72)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backdropFilter: 'blur(8px)' }}
    >
      <div dir="rtl" style={{ background: 'var(--sheet-bg)', borderRadius: '28px 28px 0 0', width: '100%', maxWidth: 480, boxShadow: '0 -24px 120px rgba(0,0,0,0.3)', paddingBottom: 'max(28px, env(safe-area-inset-bottom))', maxHeight: '90dvh', overflowY: 'auto' }}>
        <div style={{ width: 40, height: 4, borderRadius: 99, background: 'var(--border-1)', margin: '14px auto 0' }} />
        <div style={{ display: 'flex', justifyContent: 'flex-start', padding: '12px 16px 0' }}>
          <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 11, background: 'var(--surface-3)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={16} color="var(--text-3)" />
          </button>
        </div>
        <div style={{ padding: '8px 20px 8px' }}>{children}</div>
      </div>
    </div>
  );
}