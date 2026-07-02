import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Instagram, Facebook, Loader2, Check, X, ExternalLink, ShieldCheck, Copy, Music2, ArrowRight } from 'lucide-react';

const TIKTOK_CONNECTOR_ID = '6a461cbcb8f2b9b391f70d9e';

const PLATFORMS = [
  {
    key: 'instagram',
    label: 'Instagram',
    icon: Instagram,
    color: 'linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)',
    url: (u) => `https://instagram.com/${u}`,
    mode: 'code',
  },
  {
    key: 'tiktok',
    label: 'TikTok',
    icon: Music2,
    color: '#000000',
    url: (u) => `https://tiktok.com/@${u}`,
    mode: 'oauth',
  },
  {
    key: 'facebook',
    label: 'Facebook',
    icon: Facebook,
    color: '#1877F2',
    url: (u) => `https://facebook.com/${u}`,
    mode: 'code',
  },
];

export default function SocialLinksSection({ user }) {
  const queryClient = useQueryClient();
  const [activeKey, setActiveKey] = useState(null);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [copied, setCopied] = useState(false);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['me'] });

  const getData = (key) => ({
    username: user?.[`${key}_username`],
    verified: user?.[`${key}_verified`],
    code: user?.[`${key}_verify_code`],
  });

  // ── TikTok OAuth connect ──
  const handleOAuthConnect = async () => {
    setLoading(true);
    setError('');
    try {
      const url = await base44.connectors.connectAppUser(TIKTOK_CONNECTOR_ID);
      const popup = window.open(url, '_blank');
      const timer = setInterval(async () => {
        if (!popup || popup.closed) {
          clearInterval(timer);
          try {
            const res = await base44.functions.invoke('verifyInstagram', { action: 'fetch_profile', platform: 'tiktok' });
            if (res.data?.success) {
              await refresh();
              setSuccess('אומת בהצלחה! 🎉');
              setTimeout(() => { setSuccess(''); setActiveKey(null); }, 1500);
            } else {
              setError(res.data?.error || 'החיבור נכשל');
            }
          } catch {
            setError('החיבור נכשל — ודא שאישרת את ההרשאה');
          }
          setLoading(false);
        }
      }, 500);
    } catch (e) {
      setError(e?.message || 'שגיאה');
      setLoading(false);
    }
  };

  // ── Instagram/Facebook: connect with code ──
  const handleCodeConnect = async () => {
    const clean = username.replace(/^@/, '').trim();
    if (!clean) return;
    setLoading(true);
    setError('');
    try {
      await base44.functions.invoke('verifyInstagram', { action: 'connect_code', platform: activeKey, username: clean });
      await refresh();
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'שגיאה');
    }
    setLoading(false);
  };

  // ── Instagram/Facebook: verify code in bio ──
  const handleVerifyCode = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await base44.functions.invoke('verifyInstagram', { action: 'verify_code', platform: activeKey });
      if (res.data?.verified) {
        await refresh();
        setSuccess('אומת בהצלחה! 🎉');
        setTimeout(() => { setSuccess(''); setActiveKey(null); }, 1500);
      } else {
        setError(res.data?.note || 'הקוד לא נמצא. ודא שהוספת את הקוד לביו ושהפרופיל ציבורי.');
      }
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'שגיאה');
    }
    setLoading(false);
  };

  // ── Reset username (go back to step 1, keep sheet open) ──
  const handleResetUsername = async () => {
    setLoading(true);
    setError('');
    try {
      await base44.functions.invoke('verifyInstagram', { action: 'disconnect', platform: activeKey });
      await refresh();
      setUsername('');
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'שגיאה');
    }
    setLoading(false);
  };

  // ── Disconnect ──
  const handleDisconnect = async (key) => {
    setLoading(true);
    setError('');
    try {
      const config = PLATFORMS.find(p => p.key === key);
      if (config?.mode === 'oauth') {
        try { await base44.connectors.disconnectAppUser(TIKTOK_CONNECTOR_ID); } catch {}
      }
      await base44.functions.invoke('verifyInstagram', { action: 'disconnect', platform: key });
      await refresh();
      setActiveKey(null);
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

  const activeConfig = PLATFORMS.find(p => p.key === activeKey);
  const activeData = activeKey ? getData(activeKey) : null;
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
          {PLATFORMS.map(({ key, label, icon: Icon, color }) => {
            const data = getData(key);
            const isVerified = data?.verified;
            const hasUsername = !!data?.username;
            return (
              <div key={key} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 12px', borderRadius: 14,
                background: isVerified ? '#f0fdf4' : 'var(--surface-3)',
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
                        {isVerified ? 'מאומת ✓' : 'ממתין לאימות'}
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-2)' }}>{label}</div>
                  )}
                </div>
                {hasUsername ? (
                  <button onClick={() => { setActiveKey(key); setError(''); setSuccess(''); }}
                    style={{ background: 'var(--surface-2)', border: '1px solid var(--border-1)', borderRadius: 8, width: 30, height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                    <span style={{ fontSize: 14, color: 'var(--text-3)' }}>⋯</span>
                  </button>
                ) : (
                  <button onClick={() => { setActiveKey(key); setError(''); setSuccess(''); setUsername(''); }}
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
      {activeKey && activeConfig && activeData && createPortal(
        <Sheet onClose={() => { setActiveKey(null); setError(''); setSuccess(''); setUsername(''); }}>
          {/* Success */}
          {success && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '24px 0' }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '3px solid #bbf7d0' }}>
                <Check size={32} color="#059669" strokeWidth={3} />
              </div>
              <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-1)' }}>{success}</div>
            </div>
          )}

          {/* === TikTok OAuth === */}
          {!success && activeConfig.mode === 'oauth' && !activeData.username && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <SheetHeader icon={activeConfig.icon} color={activeConfig.color} title={`חבר את ${activeConfig.label}`} subtitle="התחבר עם הסיסמה שלך לטיקטוק ונאמת אוטומטית" />
              {error && <ErrorBox text={error} />}
              <button onClick={handleOAuthConnect} disabled={loading}
                style={btnPrimary(loading || !username.trim())}>
                {loading ? <><Loader2 size={18} className="animate-spin" /> מחכה לאישור...</> : <><activeConfig.icon size={18} /> התחבר ל{activeConfig.label}</>}
              </button>
            </div>
          )}

          {/* === Instagram/Facebook: Step 1 — Enter username === */}
          {!success && activeConfig.mode === 'code' && !activeData.username && !activeData.code && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <SheetHeader icon={activeConfig.icon} color={activeConfig.color} title={`חבר את ${activeConfig.label}`} subtitle={`הזן את שם המשתמש שלך ב${activeConfig.label}`} />
              <input
                type="text" dir="ltr" placeholder="username" value={username}
                onChange={e => setUsername(e.target.value)} autoFocus
                style={{ width: '100%', height: 50, borderRadius: 14, border: '1.5px solid var(--border-1)', padding: '0 16px', fontSize: 16, background: 'var(--surface-3)', color: 'var(--text-1)', outline: 'none', boxSizing: 'border-box', textAlign: 'right' }}
              />
              {error && <ErrorBox text={error} />}
              <button onClick={handleCodeConnect} disabled={loading || !username.trim()}
                style={btnPrimary(loading || !username.trim())}>
                {loading ? <Loader2 size={18} className="animate-spin" /> : <>המשך <ArrowRight size={16} /></>}
              </button>
            </div>
          )}

          {/* === Instagram/Facebook: Step 2 — Code verification === */}
          {!success && activeConfig.mode === 'code' && activeData.username && activeData.code && !activeData.verified && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <SheetHeader icon={activeConfig.icon} color={activeConfig.color} title={`אימות @{activeData.username}`} subtitle={`הוסף את הקוד לביו ב${activeConfig.label} שלך, ואז לחץ "אמת"`} />
              <button onClick={handleResetUsername} disabled={loading} style={{ all: 'unset', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#1a6fd4', marginBottom: 2 }}>
                <ArrowRight size={14} style={{ transform: 'rotate(180deg)' }} /> שנה משתמש
              </button>

              {/* OTP Code box */}
              <div onClick={() => copyCode(activeData.code)} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                background: 'var(--surface-3)', borderRadius: 16, padding: '20px',
                border: '2px dashed var(--border-2)', cursor: 'pointer',
              }}>
                <code style={{ fontSize: 32, fontWeight: 900, color: 'var(--text-1)', letterSpacing: 8 }}>{activeData.code}</code>
                {copied ? <Check size={20} color="#059669" /> : <Copy size={20} color="var(--text-3)" />}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', textAlign: 'center', fontWeight: 600 }}>{copied ? 'הקוד הועתק ✓' : 'לחץ על הקוד להעתקה'}</div>

              {/* Instructions */}
              <div style={{ background: '#eff6ff', borderRadius: 14, padding: '14px 16px', border: '1px solid #bfdbfe' }}>
                <div style={{ fontSize: 13, color: '#1a6fd4', fontWeight: 800, marginBottom: 8 }}>איך מאמתים?</div>
                <ol style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 2, margin: 0, paddingRight: 18 }}>
                  <li>פתח את <a href={activeConfig.url(activeData.username)} target="_blank" rel="noopener noreferrer" style={{ color: '#1a6fd4', fontWeight: 700 }}>הפרופיל שלך</a> ב{activeConfig.label}</li>
                  <li>ערוך פרופיל ← הוסף את הקוד <strong>{activeData.code}</strong> לביו</li>
                  <li>ודא שהפרופיל <strong>ציבורי</strong> (לא פרטי)</li>
                  <li>חזור לכאן ולחץ "אמת"</li>
                </ol>
              </div>

              {error && <ErrorBox text={error} />}

              <button onClick={handleVerifyCode} disabled={loading}
                style={btnPrimary(loading)}>
                {loading ? <><Loader2 size={18} className="animate-spin" /> בודק... יכול לקחת כמה שניות</> : <><Check size={18} /> אמת</>}
              </button>

              <button onClick={handleResetUsername} disabled={loading}
                style={{ height: 42, borderRadius: 12, background: 'none', border: 'none', color: 'var(--text-3)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                ביטול והתחל מחדש
              </button>
            </div>
          )}

          {/* === Connected: Manage === */}
          {!success && activeData.username && (activeData.verified || activeConfig.mode === 'oauth') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <SheetHeader icon={activeConfig.icon} color={activeConfig.color} title={activeConfig.label} subtitle={`@${activeData.username}`} link={activeConfig.url(activeData.username)} />
              {activeData.verified ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px', background: '#f0fdf4', borderRadius: 14, border: '1px solid #bbf7d0' }}>
                  <ShieldCheck size={20} color="#059669" />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#065f46' }}>החשבון מאומת</div>
                    <div style={{ fontSize: 12, color: '#059669' }}>הבעלות אומתה בהצלחה</div>
                  </div>
                </div>
              ) : null}
              {error && <ErrorBox text={error} />}
              <button onClick={() => handleDisconnect(activeKey)} disabled={loading}
                style={{ height: 48, borderRadius: 14, background: '#fff1f2', border: '1px solid #fecaca', color: '#dc2626', fontWeight: 700, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {loading ? <Loader2 size={18} className="animate-spin" /> : <><X size={16} /> נתק חשבון</>}
              </button>
            </div>
          )}
        </Sheet>,
        document.body
      )}
    </>
  );
}

// ── Helpers ──
function btnPrimary(disabled) {
  return {
    height: 50, borderRadius: 14,
    background: disabled ? 'var(--surface-3)' : 'linear-gradient(135deg, #1a6fd4, #0a52b0)',
    color: disabled ? 'var(--text-3)' : 'white',
    fontWeight: 800, fontSize: 15, border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
  };
}

function ErrorBox({ text }) {
  return <div style={{ fontSize: 12, color: '#dc2626', fontWeight: 600, lineHeight: 1.5, background: '#fff1f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 12px' }}>{text}</div>;
}

function SheetHeader({ icon: Icon, color, title, subtitle, link }) {
  return (
    <div style={{ textAlign: 'center', marginBottom: 4 }}>
      <div style={{ width: 56, height: 56, borderRadius: 16, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
        <Icon size={28} color="white" />
      </div>
      <h3 style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-1)', margin: 0 }}>{title}</h3>
      {link ? (
        <a href={link} target="_blank" rel="noopener noreferrer" style={{ fontSize: 14, color: '#1a6fd4', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
          {subtitle} <ExternalLink size={12} />
        </a>
      ) : (
        <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 6, lineHeight: 1.5 }}>{subtitle}</p>
      )}
    </div>
  );
}

function Sheet({ children, onClose }) {
  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, zIndex: 999999, background: 'rgba(5,15,40,0.72)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
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