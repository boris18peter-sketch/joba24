import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Instagram, Facebook, Loader2, Check, X, ExternalLink, ShieldCheck, Copy, Music2 } from 'lucide-react';

const PLATFORMS = [
  { key: 'instagram', label: 'Instagram', icon: Instagram, color: 'linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)', url: (u) => `https://instagram.com/${u}` },
  { key: 'facebook', label: 'Facebook', icon: Facebook, color: '#1877F2', url: (u) => `https://facebook.com/${u}` },
  { key: 'tiktok', label: 'TikTok', icon: Music2, color: '#000000', url: (u) => `https://tiktok.com/@${u}` },
];

export default function SocialLinksSection({ user }) {
  const queryClient = useQueryClient();
  const [activePlatform, setActivePlatform] = useState(null);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState('');
  const [copied, setCopied] = useState(false);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['me'] });

  const getPlatformData = (key) => {
    return {
      username: user?.[`${key}_username`],
      verified: user?.[`${key}_verified`],
      code: user?.[`${key}_verify_code`],
    };
  };

  const handleConnect = async () => {
    const clean = username.replace(/^@/, '').trim();
    if (!clean) return;
    setLoading(true);
    setError('');
    setResult('');
    try {
      await base44.functions.invoke('verifyInstagram', { action: 'connect', platform: activePlatform, username: clean });
      await refresh();
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'שגיאה');
    }
    setLoading(false);
  };

  const handleVerify = async () => {
    setVerifying(true);
    setError('');
    setResult('');
    try {
      const res = await base44.functions.invoke('verifyInstagram', { action: 'verify', platform: activePlatform });
      if (res.data?.verified) {
        await refresh();
        setResult('אומת בהצלחה! 🎉');
        setTimeout(() => { setResult(''); setActivePlatform(null); }, 1500);
      } else {
        setError(res.data?.note || 'הקוד לא נמצא. ודא שהוספת את הקוד לביו ונסה שוב.');
      }
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'שגיאה');
    }
    setVerifying(false);
  };

  const handleDisconnect = async () => {
    setLoading(true);
    setError('');
    try {
      await base44.functions.invoke('verifyInstagram', { action: 'disconnect', platform: activePlatform });
      await refresh();
      setActivePlatform(null);
      setUsername('');
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'שגיאה');
    }
    setLoading(false);
  };

  const copyCode = (code) => {
    navigator.clipboard?.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const activePlatformData = activePlatform ? getPlatformData(activePlatform) : null;
  const activePlatformConfig = PLATFORMS.find(p => p.key === activePlatform);
  const isPending = activePlatformData?.username && !activePlatformData?.verified && activePlatformData?.code;

  // Count verified platforms
  const verifiedCount = PLATFORMS.filter(p => getPlatformData(p.key)?.verified).length;

  return (
    <>
      {/* Section card with all platforms */}
      <div style={{
        background: 'var(--surface-2)', borderRadius: 18, border: '1px solid var(--border-1)',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '14px 16px 10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-3)', letterSpacing: 0.5, textTransform: 'uppercase' }}>רשתות חברתיות</div>
            {verifiedCount > 0 && (
              <span style={{ fontSize: 10, fontWeight: 700, color: '#059669', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 99, padding: '2px 8px' }}>{verifiedCount} מאומתות</span>
            )}
          </div>
        </div>
        <div style={{ padding: '0 16px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {PLATFORMS.map(({ key, label, icon: Icon, color, url }) => {
            const data = getPlatformData(key);
            const isVerified = data?.verified;
            const isPendingThis = data?.username && !data?.verified && data?.code;

            return (
              <div key={key} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 12px', borderRadius: 14,
                background: isVerified ? '#f0fdf4' : isPendingThis ? '#fffbeb' : 'var(--surface-3)',
                border: `1px solid ${isVerified ? '#bbf7d0' : isPendingThis ? '#fde68a' : 'var(--border-1)'}`,
              }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 11,
                  background: isVerified || isPendingThis ? 'var(--surface-2)' : color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  border: isVerified || isPendingThis ? `1px solid var(--border-1)` : 'none',
                }}>
                  <Icon size={18} color={isVerified || isPendingThis ? 'var(--text-2)' : 'white'} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {data?.username ? (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>@{data.username}</span>
                        {isVerified && <ShieldCheck size={13} color="#059669" />}
                      </div>
                      <div style={{ fontSize: 11, color: isVerified ? '#059669' : '#d97706', fontWeight: 600 }}>
                        {isVerified ? 'מאומת ✓' : 'ממתין לאימות'}
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-2)' }}>{label}</div>
                  )}
                </div>
                {isVerified ? (
                  <button onClick={() => { setActivePlatform(key); }}
                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border-1)', borderRadius: 8, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                    <span style={{ fontSize: 14, color: 'var(--text-3)' }}>⋯</span>
                  </button>
                ) : (
                  <button onClick={() => { setActivePlatform(key); setUsername(data?.username || ''); setError(''); setResult(''); }}
                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border-1)', borderRadius: 8, padding: '6px 12px', fontSize: 12, fontWeight: 700, color: 'var(--text-2)', cursor: 'pointer', flexShrink: 0 }}>
                    {isPendingThis ? 'אמת' : 'חבר'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom sheet for active platform */}
      {activePlatform && activePlatformConfig && activePlatformData && createPortal(
        <BottomSheet onClose={() => { setActivePlatform(null); setError(''); setResult(''); }}>
          {/* Step 1: Enter username */}
          {!activePlatformData.username && !result && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ textAlign: 'center', marginBottom: 4 }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: activePlatformConfig.color, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  <activePlatformConfig.icon size={28} color="white" />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-1)', margin: 0 }}>חבר את {activePlatformConfig.label} שלך</h3>
                <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 6, lineHeight: 1.5 }}>הזן את שם המשתמש שלך. נבקש ממך לאמת את הבעלות עם קוד פשוט.</p>
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
              <button onClick={handleConnect} disabled={loading || !username.trim()}
                style={{ height: 50, borderRadius: 14, background: username.trim() ? 'linear-gradient(135deg, #1a6fd4, #0a52b0)' : 'var(--surface-3)', color: username.trim() ? 'white' : 'var(--text-3)', fontWeight: 800, fontSize: 15, border: 'none', cursor: username.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {loading ? <Loader2 size={18} className="animate-spin" /> : 'המשך'}
              </button>
            </div>
          )}

          {/* Step 2: OTP verification */}
          {isPending && !result && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ textAlign: 'center', marginBottom: 4 }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: activePlatformConfig.color, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  <activePlatformConfig.icon size={28} color="white" />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-1)', margin: 0 }}>אימות @{activePlatformData.username}</h3>
                <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 6, lineHeight: 1.5 }}>
                  העתק את הקוד והוסף אותו ל<b>ביו</b> בפרופיל ה{activePlatformConfig.label} שלך, ואז לחץ "אמת".
                </p>
              </div>

              {/* OTP code box */}
              <div onClick={() => copyCode(activePlatformData.code)} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                background: 'var(--surface-3)', borderRadius: 14, padding: '16px',
                border: '2px dashed var(--border-2)', cursor: 'pointer',
              }}>
                <code style={{ fontSize: 28, fontWeight: 900, color: 'var(--text-1)', letterSpacing: 6 }}>{activePlatformData.code}</code>
                {copied ? <Check size={18} color="#059669" /> : <Copy size={18} color="var(--text-3)" />}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', textAlign: 'center' }}>{copied ? 'הקוד הועתק!' : 'לחץ על הקוד להעתקה'}</div>

              {/* Instructions */}
              <div style={{ background: '#eff6ff', borderRadius: 14, padding: '12px 14px', border: '1px solid #bfdbfe' }}>
                <div style={{ fontSize: 12, color: '#1a6fd4', fontWeight: 700, marginBottom: 6 }}>איך מאמתים?</div>
                <ol style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.8, margin: 0, paddingRight: 16 }}>
                  <li>פתח את <a href={activePlatformConfig.url(activePlatformData.username)} target="_blank" rel="noopener noreferrer" style={{ color: '#1a6fd4', fontWeight: 600 }}>הפרופיל שלך</a> ב{activePlatformConfig.label}</li>
                  <li>ערוך את הפרופיל ← הוסף את הקוד לביו</li>
                  <li>ודא שהפרופיל <b>ציבורי</b> (לא פרטי)</li>
                  <li>חזור לכאן ולחץ "אמת"</li>
                </ol>
              </div>

              {error && <div style={{ fontSize: 12, color: '#dc2626', fontWeight: 600, lineHeight: 1.5 }}>{error}</div>}

              <button onClick={handleVerify} disabled={verifying}
                style={{ height: 50, borderRadius: 14, background: 'linear-gradient(135deg, #1a6fd4, #0a52b0)', color: 'white', fontWeight: 800, fontSize: 15, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {verifying ? <><Loader2 size={18} className="animate-spin" /> בודק... (יכול לקחת כמה שניות)</> : <><Check size={18} /> אמת</>}
              </button>

              <button onClick={handleDisconnect} disabled={loading}
                style={{ height: 42, borderRadius: 12, background: 'none', border: 'none', color: 'var(--text-3)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                ביטול והתחל מחדש
              </button>
            </div>
          )}

          {/* Verified: manage */}
          {activePlatformData.verified && !result && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ textAlign: 'center', marginBottom: 4 }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: activePlatformConfig.color, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  <activePlatformConfig.icon size={28} color="white" />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-1)', margin: 0 }}>{activePlatformConfig.label}</h3>
                <a href={activePlatformConfig.url(activePlatformData.username)} target="_blank" rel="noopener noreferrer"
                  style={{ fontSize: 14, color: '#1a6fd4', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                  @{activePlatformData.username} <ExternalLink size={12} />
                </a>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: '#f0fdf4', borderRadius: 14, border: '1px solid #bbf7d0' }}>
                <Check size={18} color="#059669" />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#065f46' }}>החשבון מאומת</div>
                  <div style={{ fontSize: 12, color: '#059669' }}>הבעלות על החשבון אומתה בהצלחה</div>
                </div>
              </div>
              {error && <div style={{ fontSize: 12, color: '#dc2626', fontWeight: 600 }}>{error}</div>}
              <button onClick={handleDisconnect} disabled={loading}
                style={{ height: 48, borderRadius: 14, background: '#fff1f2', border: '1px solid #fecaca', color: '#dc2626', fontWeight: 700, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {loading ? <Loader2 size={18} className="animate-spin" /> : <><X size={16} /> נתק חשבון</>}
              </button>
            </div>
          )}

          {/* Success */}
          {result && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '20px 0' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid #bbf7d0' }}>
                <Check size={32} color="#059669" strokeWidth={3} />
              </div>
              <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-1)' }}>{result}</div>
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
      style={{
        position: 'fixed', inset: 0, zIndex: 999999,
        background: 'rgba(5,15,40,0.72)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div
        dir="rtl"
        style={{
          background: 'var(--sheet-bg)', borderRadius: '28px 28px 0 0',
          width: '100%', maxWidth: 480,
          boxShadow: '0 -24px 120px rgba(0,0,0,0.3)',
          paddingBottom: 'max(28px, env(safe-area-inset-bottom))',
          maxHeight: '90dvh', overflowY: 'auto',
        }}
      >
        <div style={{ width: 40, height: 4, borderRadius: 99, background: 'var(--border-1)', margin: '14px auto 0' }} />
        <div style={{ display: 'flex', justifyContent: 'flex-start', padding: '12px 16px 0' }}>
          <button onClick={onClose}
            style={{ width: 34, height: 34, borderRadius: 11, background: 'var(--surface-3)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={16} color="var(--text-3)" />
          </button>
        </div>
        <div style={{ padding: '8px 20px 8px' }}>
          {children}
        </div>
      </div>
    </div>
  );
}