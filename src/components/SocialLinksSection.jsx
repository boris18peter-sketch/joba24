import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Loader2, X, ShieldCheck, Link2, Unlink, Sparkles,
  Instagram, Facebook, Music2, Copy, AlertCircle, ExternalLink,
  CheckCircle, ArrowRight,
} from 'lucide-react';
import { toast } from 'sonner';
import GoldBadge from '@/components/GoldBadge';
import { isUserVerified } from '@/lib/utils';

const PLATFORMS = [
  {
    key: 'instagram', label: 'Instagram', icon: Instagram,
    brandColor: 'linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)',
    brandSolid: '#dc2743',
    url: (u) => `https://instagram.com/${u}`,
    editBioUrl: 'https://www.instagram.com/accounts/edit/',
    bioHint: 'הביו הוא הטקסט שמופיע מתחת לשם שלך בפרופיל',
  },
  {
    key: 'facebook', label: 'Facebook', icon: Facebook,
    brandColor: '#1877F2',
    brandSolid: '#1877F2',
    url: (u) => `https://facebook.com/${u}`,
    editBioUrl: 'https://www.facebook.com/profile/',
    bioHint: 'הביו הוא הטקסט שמופיע ב"אודות" בפרופיל שלך',
  },
  {
    key: 'tiktok', label: 'TikTok', icon: Music2,
    brandColor: 'linear-gradient(135deg, #25F4EE, #000000, #FE2C55)',
    brandSolid: '#000000',
    url: (u) => `https://tiktok.com/@${u}`,
    editBioUrl: 'https://www.tiktok.com/profile/edit',
    bioHint: 'הביו הוא הטקסט שמופיע מתחת לתמונה שלך בפרופיל',
  },
];

function platformLabel(key) {
  const p = PLATFORMS.find(p => p.key === key);
  return p ? p.label : key;
}

export default function SocialLinksSection({ user }) {
  const queryClient = useQueryClient();
  const [showConnect, setShowConnect] = useState(false);
  const [showManage, setShowManage] = useState(false);
  const [loading, setLoading] = useState(false);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['me'] });

  const verifiedPlatforms = PLATFORMS.filter(p => user?.[`${p.key}_username`] && user?.[`${p.key}_verified`]);
  const isConnected = verifiedPlatforms.length > 0;
  const isKycVerified = isUserVerified(user);

  const handleConnectCode = async (platform, username) => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('verifyInstagram', {
        action: 'connect_code', platform, username,
      });
      if (res.data?.error) { toast.error(res.data.error); return false; }
      await refresh();
      return res.data;
    } catch (e) {
      toast.error('שגיאה בחיבור הרשת');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (platform) => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('verifyInstagram', {
        action: 'verify_code', platform,
      });
      if (res.data?.error) { toast.error(res.data.error); return false; }
      if (res.data?.verified) {
        toast.success(`${platformLabel(platform)} אומת בהצלחה! 🎉`);
        await refresh();
        return true;
      } else {
        toast.error(res.data?.note || 'הקוד לא נמצא בפרופיל. ודא שהוספת אותו לביו ונסה שוב.');
        return false;
      }
    } catch (e) {
      toast.error('שגיאה באימות');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async (platform) => {
    setLoading(true);
    try {
      await base44.functions.invoke('verifyInstagram', { action: 'disconnect', platform });
      await refresh();
      toast.success(`${platformLabel(platform)} הוסר בהצלחה`);
    } catch (e) {
      toast.error('שגיאה בניתוק');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div style={{
        background: 'var(--surface-2)', borderRadius: 16,
        border: '1px solid var(--border-1)', overflow: 'hidden',
      }}>
        <div style={{ padding: '12px 16px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-3)', letterSpacing: 0.4, textTransform: 'uppercase' }}>
            רשתות חברתיות
          </div>
          {isConnected && isKycVerified && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <GoldBadge size="sm" />
              <span style={{ fontSize: 10, fontWeight: 700, color: '#d97706' }}>מאומת זהב</span>
            </span>
          )}
          {isConnected && !isKycVerified && (
            <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8' }}>מחובר (ללא ווי זהב)</span>
          )}
        </div>

        {isConnected && (
          <div style={{ padding: '0 16px 10px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {verifiedPlatforms.map(p => {
              const username = user[`${p.key}_username`];
              return (
                <a key={p.key} href={p.url(username)} target="_blank" rel="noreferrer"
                   style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fffbeb', borderRadius: 12, padding: '6px 12px', border: '1px solid #fde68a', textDecoration: 'none' }}>
                  <span style={{ width: 22, height: 22, borderRadius: 6, background: p.brandColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <p.icon size={13} color="white" />
                  </span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1)' }}>{username}</span>
                  <ShieldCheck size={12} color="#d97706" />
                </a>
              );
            })}
          </div>
        )}

        {!isKycVerified && (
          <div style={{ margin: '0 16px 10px', padding: '8px 12px', background: '#fffbeb', borderRadius: 10, border: '1px solid #fde68a', display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertCircle size={14} color="#d97706" flexShrink={0} />
            <span style={{ fontSize: 11, color: '#92400e', lineHeight: 1.4 }}>
              חיבור רשתות חברתיות זמין רק לאחר אימות זהות (KYC)
            </span>
          </div>
        )}

        {isKycVerified && !isConnected && (
          <div style={{ margin: '0 16px 10px', padding: '12px 14px', background: 'linear-gradient(135deg, #fffbeb, #fef3c7)', borderRadius: 12, border: '1px solid #fde68a', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #fbbf24, #d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 2px 8px rgba(217,119,6,0.3)' }}>
              <ShieldCheck size={18} color="white" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#92400e', lineHeight: 1.3 }}>קבל ווי זהב 🥇 ובלוט מעל כולם</div>
              <div style={{ fontSize: 11, color: '#b45309', marginTop: 2, lineHeight: 1.4 }}>חבר רשת חברתית ← קבל ווי זהב, הגדל אמון, חשיפה וקבל יותר משימות</div>
            </div>
          </div>
        )}

        <div style={{ padding: '0 16px 14px' }}>
          {isConnected ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowConnect(true)} disabled={!isKycVerified || loading}
                style={{ flex: 1, height: 46, borderRadius: 12, cursor: loading ? 'wait' : 'pointer', background: 'var(--surface-3)', color: 'var(--text-1)', border: '1px solid var(--border-1)', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: !isKycVerified ? 0.5 : 1 }}>
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Link2 size={16} />}
                {loading ? 'מחכה...' : 'חבר עוד רשת'}
              </button>
              <button onClick={() => setShowManage(true)} style={{ height: 46, width: 46, borderRadius: 12, cursor: 'pointer', background: 'var(--surface-3)', border: '1px solid var(--border-1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-2)' }}>
                <Unlink size={16} />
              </button>
            </div>
          ) : (
            <button onClick={() => setShowConnect(true)} disabled={!isKycVerified || loading}
              style={{ width: '100%', height: 48, borderRadius: 12, cursor: loading ? 'wait' : 'pointer', background: !isKycVerified ? 'var(--surface-3)' : 'linear-gradient(135deg, #1a6fd4, #0a52b0)', color: !isKycVerified ? 'var(--text-3)' : 'white', border: 'none', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: !isKycVerified ? 0.6 : 1, boxShadow: !isKycVerified ? 'none' : '0 3px 12px rgba(26,111,212,0.2)' }}>
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
              {loading ? 'פותח...' : 'חבר רשתות חברתיות'}
            </button>
          )}
        </div>
      </div>

      {showConnect && createPortal(
        <ConnectSheet user={user} platforms={PLATFORMS} onClose={() => setShowConnect(false)} onConnect={handleConnectCode} onVerify={handleVerifyCode} loading={loading} />,
        document.body
      )}

      {showManage && createPortal(
        <ManageSheet user={user} platforms={PLATFORMS} onClose={() => setShowManage(false)} onDisconnect={handleDisconnect} loading={loading} isKycVerified={isKycVerified} />,
        document.body
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ConnectSheet — 3 simple steps: choose → enter username → add code → verify
// ═══════════════════════════════════════════════════════════════════
function ConnectSheet({ user, platforms, onClose, onConnect, onVerify, loading }) {
  const [step, setStep] = useState('choose'); // 'choose' | 'username' | 'code'
  const [selected, setSelected] = useState(null);
  const [usernameInput, setUsernameInput] = useState('');
  const [code, setCode] = useState('');
  const [verified, setVerified] = useState(false);

  const p = platforms.find(pl => pl.key === selected);
  const existingUsername = selected ? user?.[`${selected}_username`] : null;
  const existingCode = selected ? user?.[`${selected}_verify_code`] : null;
  const existingVerified = selected ? user?.[`${selected}_verified`] : false;

  // If user already has a pending code for this platform, jump to code step
  const handleSelectPlatform = (key) => {
    setSelected(key);
    const plat = platforms.find(pl => pl.key === key);
    const u = user?.[`${key}_username`];
    const c = user?.[`${key}_verify_code`];
    if (u && c && !user?.[`${key}_verified`]) {
      setUsernameInput(u);
      setCode(c);
      setStep('code');
    } else if (u && user?.[`${key}_verified`]) {
      // Already verified — go to code step showing verified state
      setUsernameInput(u);
      setVerified(true);
      setStep('code');
    } else {
      setStep('username');
    }
  };

  const handleGenerateCode = async () => {
    if (!usernameInput.trim()) return;
    const res = await onConnect(selected, usernameInput);
    if (res?.code) {
      setCode(res.code);
      setVerified(false);
      setStep('code');
    }
  };

  const handleVerify = async () => {
    const ok = await onVerify(selected);
    if (ok) setVerified(true);
  };

  const handleClose = () => {
    setStep('choose');
    setSelected(null);
    setUsernameInput('');
    setCode('');
    setVerified(false);
    onClose();
  };

  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
      style={{ position: 'fixed', inset: 0, zIndex: 999999, background: 'rgba(5,15,40,0.72)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
      <div dir="rtl" style={{
        background: 'var(--sheet-bg)', borderRadius: '24px 24px 0 0',
        width: '100%', maxWidth: 480, boxShadow: '0 -16px 60px rgba(0,0,0,0.25)',
        paddingBottom: 'max(24px, env(safe-area-inset-bottom))',
        maxHeight: '90dvh', overflowY: 'auto',
      }}>
        <div style={{ width: 40, height: 4, borderRadius: 99, background: 'var(--border-1)', margin: '14px auto 0' }} />
        <div style={{ display: 'flex', justifyContent: 'flex-start', padding: '12px 16px 0' }}>
          <button onClick={handleClose} style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--surface-3)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={16} color="var(--text-3)" />
          </button>
        </div>

        <div style={{ padding: '8px 20px 20px' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg, #fbbf24, #d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', boxShadow: '0 4px 16px rgba(217,119,6,0.3)' }}>
              <ShieldCheck size={26} color="white" />
            </div>
            <h3 style={{ fontSize: 17, fontWeight: 900, color: 'var(--text-1)', margin: 0 }}>חיבור רשת חברתית</h3>
            <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 4, lineHeight: 1.5 }}>
              חבר את הרשת שלך וקבל ווי זהב בפרופיל
            </p>
          </div>

          {/* ── Step 1: Choose platform ── */}
          {step === 'choose' && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', marginBottom: 8 }}>בחר רשת לחיבור</div>
              {platforms.map(pl => {
                const isConnected = user?.[`${pl.key}_username`];
                return (
                  <button key={pl.key} onClick={() => handleSelectPlatform(pl.key)}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '12px', background: 'var(--surface-3)', borderRadius: 12, border: '1px solid var(--border-1)', cursor: 'pointer', marginBottom: 6 }}>
                    <span style={{ width: 34, height: 34, borderRadius: 9, background: pl.brandColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <pl.icon size={18} color="white" />
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>{pl.label}</span>
                    {isConnected ? (
                      <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 600, color: '#d97706' }}>
                        {user?.[`${pl.key}_verified`] ? '✓ מאומת' : 'ממתין לאימות'}
                      </span>
                    ) : (
                      <ArrowRight size={16} color="var(--text-3)" style={{ marginLeft: 'auto', transform: 'scaleX(-1)' }} />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* ── Step 2: Enter username ── */}
          {step === 'username' && p && (
            <div>
              <button onClick={() => setStep('choose')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--text-2)', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: '0 0 12px' }}>
                <ArrowRight size={14} /> חזרה
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <span style={{ width: 40, height: 40, borderRadius: 10, background: p.brandColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <p.icon size={20} color="white" />
                </span>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-1)' }}>{p.label}</div>
                </div>
              </div>

              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>שם המשתמש שלך ב{p.label}</div>
                <input
                  type="text"
                  value={usernameInput}
                  onChange={e => setUsernameInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleGenerateCode(); }}
                  placeholder="לדוגמה: israel123"
                  dir="ltr"
                  autoFocus
                  style={{ width: '100%', height: 48, borderRadius: 12, border: '1.5px solid var(--border-1)', background: 'var(--surface-2)', color: 'var(--text-1)', padding: '0 14px', fontSize: 15, outline: 'none', boxSizing: 'border-box' }}
                />
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
                  כתוב רק את שם המשתמש — בלי @, בלי קישור
                </div>
              </div>

              <button onClick={handleGenerateCode} disabled={!usernameInput.trim() || loading}
                style={{ width: '100%', height: 48, borderRadius: 12, background: usernameInput.trim() ? p.brandSolid : 'var(--surface-3)', color: 'white', border: 'none', fontWeight: 700, fontSize: 14, cursor: usernameInput.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {loading ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} style={{ transform: 'scaleX(-1)' }} />}
                המשך
              </button>
            </div>
          )}

          {/* ── Step 3: Code instructions ── */}
          {step === 'code' && p && (
            <div>
              <button onClick={() => setStep('choose')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--text-2)', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: '0 0 12px' }}>
                <ArrowRight size={14} /> חזרה
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <span style={{ width: 40, height: 40, borderRadius: 10, background: p.brandColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <p.icon size={20} color="white" />
                </span>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-1)' }}>{p.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>@{existingUsername || usernameInput}</div>
                </div>
              </div>

              {/* Verified state */}
              {verified ? (
                <div style={{ textAlign: 'center', padding: '32px 16px' }}>
                  <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, #10b981, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 8px 24px rgba(16,185,129,0.3)' }}>
                    <CheckCircle size={36} color="white" />
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-1)', marginBottom: 6 }}>הרשת אומתה! 🎉</div>
                  <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>
                    החשבון שלך ב{p.label} אומת בהצלחה.<br />
                    ווי הזהב יופיע ליד שמך בכל המקומות.
                  </div>
                  <button onClick={handleClose} style={{ marginTop: 20, width: '100%', height: 48, borderRadius: 12, background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                    סיים
                  </button>
                </div>
              ) : (
                <>
                  {/* The code — big and copyable */}
                  <div style={{ background: 'linear-gradient(135deg, #eff6ff, #dbeafe)', borderRadius: 14, border: '1.5px solid #bfdbfe', padding: '16px', textAlign: 'center', marginBottom: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#1e40af', marginBottom: 6 }}>הקוד שלך</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                      <code style={{ fontSize: 28, fontWeight: 900, color: '#1a6fd4', letterSpacing: 4 }}>{code || existingCode}</code>
                      <button onClick={() => { navigator.clipboard.writeText(code || existingCode); toast.success('הקוד הועתק'); }}
                        style={{ width: 40, height: 40, borderRadius: 10, background: 'white', border: '1.5px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        <Copy size={16} color="#1a6fd4" />
                      </button>
                    </div>
                  </div>

                  {/* Step-by-step instructions */}
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', marginBottom: 8 }}>מה עושים עכשיו?</div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {/* Step 1 */}
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: 'var(--surface-3)', borderRadius: 10, padding: '10px 12px' }}>
                      <span style={{ width: 24, height: 24, borderRadius: '50%', background: '#1a6fd4', color: 'white', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>1</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>העתק את הקוד</div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>לחץ על כפתור ההעתקה ליד הקוד</div>
                      </div>
                    </div>

                    {/* Step 2 */}
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: 'var(--surface-3)', borderRadius: 10, padding: '10px 12px' }}>
                      <span style={{ width: 24, height: 24, borderRadius: '50%', background: '#1a6fd4', color: 'white', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>2</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>פתח את {p.label} שלך</div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{p.bioHint}</div>
                      </div>
                    </div>

                    {/* Step 3 */}
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: 'var(--surface-3)', borderRadius: 10, padding: '10px 12px' }}>
                      <span style={{ width: 24, height: 24, borderRadius: '50%', background: '#1a6fd4', color: 'white', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>3</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>הדבק את הקוד בביו</div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>ערוך את הביו (הטקסט מתחת לשם שלך) והדבק את הקוד</div>
                        <a href={p.editBioUrl} target="_blank" rel="noreferrer"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 6, fontSize: 12, fontWeight: 700, color: '#1a6fd4', textDecoration: 'none' }}>
                          פתח את עריכת הפרופיל <ExternalLink size={12} />
                        </a>
                      </div>
                    </div>

                    {/* Step 4 */}
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: 'var(--surface-3)', borderRadius: 10, padding: '10px 12px' }}>
                      <span style={{ width: 24, height: 24, borderRadius: '50%', background: '#1a6fd4', color: 'white', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>4</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>חזור לכאן ולחץ "אימתתי"</div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>אחרי ששמרת את הביו, חזור ולחץ על הכפתור</div>
                      </div>
                    </div>
                  </div>

                  {/* Verify button */}
                  <button onClick={handleVerify} disabled={loading}
                    style={{ marginTop: 16, width: '100%', height: 50, borderRadius: 12, background: loading ? '#93c5fd' : 'linear-gradient(135deg, #16a34a, #059669)', color: 'white', border: 'none', fontWeight: 800, fontSize: 15, cursor: loading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 3px 12px rgba(16,185,129,0.3)' }}>
                    {loading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                    {loading ? 'בודק...' : 'אימתתי — בדוק עכשיו'}
                  </button>

                  <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-3)', textAlign: 'center', lineHeight: 1.5 }}>
                    ודא שהפרופיל שלך ציבורי כדי שנוכל לראות את הקוד
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ManageSheet — disconnect / reconnect
// ═══════════════════════════════════════════════════════════════════
function ManageSheet({ user, platforms, onClose, onDisconnect, loading, isKycVerified }) {
  const connectedPlatforms = platforms.filter(p => user?.[`${p.key}_username`]);
  const [confirmDisconnect, setConfirmDisconnect] = useState(null);

  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, zIndex: 999999, background: 'rgba(5,15,40,0.72)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
      <div dir="rtl" style={{
        background: 'var(--sheet-bg)', borderRadius: '24px 24px 0 0',
        width: '100%', maxWidth: 480, boxShadow: '0 -16px 60px rgba(0,0,0,0.25)',
        paddingBottom: 'max(24px, env(safe-area-inset-bottom))',
        maxHeight: '90dvh', overflowY: 'auto',
      }}>
        <div style={{ width: 40, height: 4, borderRadius: 99, background: 'var(--border-1)', margin: '14px auto 0' }} />
        <div style={{ display: 'flex', justifyContent: 'flex-start', padding: '12px 16px 0' }}>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--surface-3)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={16} color="var(--text-3)" />
          </button>
        </div>
        <div style={{ padding: '8px 20px 20px' }}>
          <div style={{ textAlign: 'center', marginBottom: 14 }}>
            <h3 style={{ fontSize: 17, fontWeight: 900, color: 'var(--text-1)', margin: 0 }}>ניהול רשתות חברתיות</h3>
            <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 4 }}>{connectedPlatforms.length} רשתות מחוברות</p>
          </div>

          {connectedPlatforms.map(p => {
            const u = user[`${p.key}_username`];
            const v = user[`${p.key}_verified`];
            return (
              <div key={p.key} style={{ background: v && isKycVerified ? '#fffbeb' : 'var(--surface-3)', borderRadius: 12, border: `1px solid ${v && isKycVerified ? '#fde68a' : 'var(--border-1)'}`, padding: '10px 12px', marginBottom: 6 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ width: 30, height: 30, borderRadius: 8, background: p.brandColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <p.icon size={16} color="white" />
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>@{u}</div>
                    <div style={{ fontSize: 11, color: v && isKycVerified ? '#d97706' : 'var(--text-3)' }}>{p.label} {v ? '✓ מאומת' : 'ממתין לאימות'}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  {confirmDisconnect === p.key ? (
                    <>
                      <button onClick={() => { onDisconnect(p.key); setConfirmDisconnect(null); }} disabled={loading}
                        style={{ flex: 1, height: 34, borderRadius: 9, cursor: loading ? 'wait' : 'pointer', background: '#dc2626', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: 'white' }}>
                        {loading ? <Loader2 size={12} className="animate-spin" /> : 'אישור ניתוק'}
                      </button>
                      <button onClick={() => setConfirmDisconnect(null)} style={{ height: 34, width: 60, borderRadius: 9, cursor: 'pointer', background: 'var(--surface-2)', border: '1px solid var(--border-1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text-2)' }}>
                        ביטול
                      </button>
                    </>
                  ) : (
                    <button onClick={() => setConfirmDisconnect(p.key)} disabled={loading}
                      style={{ width: '100%', height: 34, borderRadius: 9, cursor: loading ? 'wait' : 'pointer', background: '#fef2f2', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: '#dc2626' }}>
                      <Unlink size={12} /> נתק רשת זו
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {connectedPlatforms.length === 0 && (
            <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-3)', fontSize: 13 }}>אין רשתות מחוברות</div>
          )}
        </div>
      </div>
    </div>
  );
}