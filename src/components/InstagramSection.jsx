import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Instagram, Loader2, Check, X, ExternalLink, ShieldCheck, Copy } from 'lucide-react';

export default function InstagramSection({ user }) {
  const queryClient = useQueryClient();
  const [showSheet, setShowSheet] = useState(false);
  const [username, setUsername] = useState(user?.instagram_username || '');
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState('');
  const [copied, setCopied] = useState(false);

  const isVerified = user?.instagram_verified;
  const igUsername = user?.instagram_username;
  const verifyCode = user?.instagram_verify_code;
  const isPending = igUsername && !isVerified && verifyCode;

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['me'] });

  const handleConnect = async () => {
    const clean = username.replace(/^@/, '').trim();
    if (!clean) return;
    setLoading(true);
    setError('');
    setResult('');
    try {
      await base44.functions.invoke('verifyInstagram', { action: 'connect', username: clean });
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
      const res = await base44.functions.invoke('verifyInstagram', { action: 'verify' });
      if (res.data?.verified) {
        await refresh();
        setResult('אומת בהצלחה! 🎉');
        setTimeout(() => { setResult(''); setShowSheet(false); }, 1500);
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
      await base44.functions.invoke('verifyInstagram', { action: 'disconnect' });
      await refresh();
      setUsername('');
      setShowSheet(false);
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'שגיאה');
    }
    setLoading(false);
  };

  const copyCode = () => {
    navigator.clipboard?.writeText(verifyCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── Verified: compact badge in profile ──
  if (isVerified && igUsername) {
    return (
      <>
        <div style={{
          background: 'var(--surface-2)', borderRadius: 18, border: '1px solid var(--border-1)',
          padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <div style={{
            width: 42, height: 42, borderRadius: 13,
            background: 'linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Instagram size={20} color="white" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-1)' }}>Instagram</span>
              <ShieldCheck size={14} color="#059669" />
              <span style={{ fontSize: 10, fontWeight: 700, color: '#059669', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 99, padding: '1px 6px' }}>מאומת</span>
            </div>
            <a href={`https://instagram.com/${igUsername}`} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 13, color: '#1a6fd4', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
              @{igUsername} <ExternalLink size={11} />
            </a>
          </div>
          <button onClick={() => setShowSheet(true)}
            style={{ background: 'var(--surface-3)', border: '1px solid var(--border-1)', borderRadius: 10, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
            <span style={{ fontSize: 16, color: 'var(--text-3)' }}>⋯</span>
          </button>
        </div>

        {showSheet && createPortal(
          <BottomSheet onClose={() => setShowSheet(false)} title="ניהול Instagram">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', background: '#f0fdf4', borderRadius: 14, border: '1px solid #bbf7d0' }}>
                <Check size={18} color="#059669" />
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#065f46' }}>החשבון מאומת</div>
                  <div style={{ fontSize: 12, color: '#059669' }}>@{igUsername}</div>
                </div>
              </div>
              {error && <div style={{ fontSize: 12, color: '#dc2626', fontWeight: 600 }}>{error}</div>}
              <button onClick={handleDisconnect} disabled={loading}
                style={{ height: 48, borderRadius: 14, background: '#fff1f2', border: '1px solid #fecaca', color: '#dc2626', fontWeight: 700, fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {loading ? <Loader2 size={18} className="animate-spin" /> : <><X size={16} /> נתק חשבון</>}
              </button>
            </div>
          </BottomSheet>,
          document.body
        )}
      </>
    );
  }

  // ── Not yet verified: show connect/pending card ──
  return (
    <>
      <button onClick={() => setShowSheet(true)} style={{ all: 'unset', cursor: 'pointer', width: '100%' }}>
        <div style={{
          background: 'var(--surface-2)', borderRadius: 18, border: '1px solid var(--border-1)',
          padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14,
        }}>
          <div style={{
            width: 42, height: 42, borderRadius: 13,
            background: isPending ? '#fffbeb' : 'linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            border: isPending ? '1px solid #fde68a' : 'none',
          }}>
            <Instagram size={20} color={isPending ? '#d97706' : 'white'} />
          </div>
          <div style={{ flex: 1, textAlign: 'right' }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-1)' }}>
              {isPending ? 'אימות Instagram ממתין' : 'חבר Instagram'}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>
              {isPending ? `@${igUsername} — לחץ לאימות` : 'אמת את החשבון שלך עם תג מאומת'}
            </div>
          </div>
          {isPending && (
            <span style={{ fontSize: 10, fontWeight: 700, color: '#d97706', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 99, padding: '2px 8px' }}>ממתין</span>
          )}
        </div>
      </button>

      {showSheet && createPortal(
        <BottomSheet onClose={() => { setShowSheet(false); setError(''); setResult(''); }}>
          {/* Step 1: Enter username */}
          {!igUsername && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ textAlign: 'center', marginBottom: 4 }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: 'linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  <Instagram size={28} color="white" />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-1)', margin: 0 }}>חבר את Instagram שלך</h3>
                <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 6, lineHeight: 1.5 }}>הזן את שם המשתמש שלך באינסטגרם. נבקש ממך לאמת את הבעלות על החשבון.</p>
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

          {/* Step 2: Verification code + instructions */}
          {isPending && !result && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ textAlign: 'center', marginBottom: 4 }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
                <h3 style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-1)', margin: 0 }}>אימות בעלות</h3>
                <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 6, lineHeight: 1.5 }}>
                  העתק את הקוד הבא והוסף אותו ל<b>ביו</b> שלך באינסטגרם, ואז לחץ "אמת".
                </p>
              </div>

              {/* Verification code box */}
              <div onClick={copyCode} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                background: 'var(--surface-3)', borderRadius: 14, padding: '14px 16px',
                border: '2px dashed var(--border-2)', cursor: 'pointer',
              }}>
                <code style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-1)', letterSpacing: 1 }}>{verifyCode}</code>
                {copied ? <Check size={16} color="#059669" /> : <Copy size={16} color="var(--text-3)" />}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', textAlign: 'center' }}>{copied ? 'הקוד הועתק!' : 'לחץ על הקוד להעתקה'}</div>

              {/* Instructions */}
              <div style={{ background: '#eff6ff', borderRadius: 14, padding: '12px 14px', border: '1px solid #bfdbfe' }}>
                <div style={{ fontSize: 12, color: '#1a6fd4', fontWeight: 700, marginBottom: 6 }}>איך מאמתים?</div>
                <ol style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.7, margin: 0, paddingRight: 16 }}>
                  <li>פתח את <a href={`https://instagram.com/${igUsername}`} target="_blank" rel="noopener noreferrer" style={{ color: '#1a6fd4', fontWeight: 600 }}>הפרופיל שלך</a> באינסטגרם</li>
                  <li>ערוך את הפרופיל ← הוסף את הקוד לביו</li>
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

function BottomSheet({ children, onClose, title }) {
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
          {title && <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-1)', margin: '0 0 14px' }}>{title}</h3>}
          {children}
        </div>
      </div>
    </div>
  );
}