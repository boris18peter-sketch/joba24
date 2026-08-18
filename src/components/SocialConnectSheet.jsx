import { useState } from 'react';
import { createPortal } from 'react-dom';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import {
  Loader2, X, ShieldCheck, ArrowRight, Edit3, Copy, CheckCircle, ExternalLink,
  Instagram, Facebook, Music2,
} from 'lucide-react';
import { toast } from 'sonner';
import { isUserVerified } from '@/lib/utils';
import { useAuth } from '@/lib/AuthContext';
import { useLanguage } from '@/lib/LanguageContext';

export const PLATFORMS = [
  {
    key: 'instagram', label: 'Instagram', icon: Instagram,
    brandColor: 'linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)',
    brandSolid: '#dc2743',
    url: (u) => `https://instagram.com/${u}`,
    editBioUrl: 'https://www.instagram.com/accounts/edit/',
    bioHintKey: 'sl_bio_hint_ig',
  },
  {
    key: 'facebook', label: 'Facebook', icon: Facebook,
    brandColor: '#1877F2',
    brandSolid: '#1877F2',
    url: (u) => `https://facebook.com/${u}`,
    editBioUrl: 'https://www.facebook.com/profile/',
    bioHintKey: 'sl_bio_hint_fb',
  },
  {
    key: 'tiktok', label: 'TikTok', icon: Music2,
    brandColor: 'linear-gradient(135deg, #25F4EE, #000000, #FE2C55)',
    brandSolid: '#000000',
    url: (u) => `https://tiktok.com/@${u}`,
    editBioUrl: 'https://www.tiktok.com/profile/edit',
    bioHintKey: 'sl_bio_hint_tt',
  },
];

function platformLabel(key) {
  const p = PLATFORMS.find(p => p.key === key);
  return p ? p.label : key;
}

/**
 * SocialConnectSheet — self-contained social bio-code connect/verify flow.
 * Used by both the Profile (SocialLinksSection) and the Home feed banner,
 * so the user can start connecting from anywhere without navigating.
 */
export default function SocialConnectSheet({ user, onClose }) {
  const queryClient = useQueryClient();
  const { refreshUser } = useAuth();
  const { t, isRTL } = useLanguage();

  const [step, setStep] = useState('choose'); // 'choose' | 'username' | 'code'
  const [selected, setSelected] = useState(null);
  const [usernameInput, setUsernameInput] = useState('');
  const [code, setCode] = useState('');
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifyAttempt, setVerifyAttempt] = useState(0);

  const p = PLATFORMS.find(pl => pl.key === selected);
  const existingUsername = selected ? user?.[`${selected}_username`] : null;
  const existingCode = selected ? user?.[`${selected}_verify_code`] : null;

  const refresh = async () => {
    await refreshUser();
    queryClient.invalidateQueries({ queryKey: ['me'] });
  };

  const handleConnect = async (platform, username) => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('verifyInstagram', {
        action: 'connect_code', platform, username,
      });
      if (res.data?.error) { toast.error(res.data.error); return null; }
      await refresh();
      return res.data;
    } catch (e) {
      toast.error(t('sl_error_connect'));
      return null;
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (platform) => {
    setLoading(true);
    const maxAttempts = 2;
    let success = false;
    for (let attempt = 1; attempt <= maxAttempts && !success; attempt++) {
      setVerifyAttempt(attempt);
      try {
        const res = await base44.functions.invoke('verifyInstagram', {
          action: 'verify_code', platform,
        });
        if (res.data?.error) { toast.error(res.data.error); break; }
        if (res.data?.verified) {
          toast.success(t('sl_verified_success', { platform: platformLabel(platform) }));
          await refresh();
          success = true;
        } else if (attempt < maxAttempts) {
          toast.message(t('sl_code_not_found_retry', { n: attempt + 1, total: maxAttempts }), { duration: 3500 });
          await new Promise(r => setTimeout(r, 2500));
        }
      } catch (e) {
        toast.error(t('sl_error_verify'));
        break;
      }
    }
    if (!success) toast.error(t('sl_code_not_found'));
    setVerifyAttempt(0);
    setLoading(false);
    return success;
  };

  const handleSelectPlatform = (key) => {
    setSelected(key);
    const u = user?.[`${key}_username`];
    const c = user?.[`${key}_verify_code`];
    if (u && c && !user?.[`${key}_verified`]) {
      setUsernameInput(u);
      setCode(c);
      setStep('code');
    } else if (u && user?.[`${key}_verified`]) {
      setUsernameInput(u);
      setVerified(true);
      setStep('code');
    } else {
      setStep('username');
    }
  };

  const handleGenerateCode = async () => {
    if (!usernameInput.trim()) return;
    const res = await handleConnect(selected, usernameInput);
    if (res?.code) {
      setCode(res.code);
      setVerified(false);
      setStep('code');
    }
  };

  const handleVerifyClick = async () => {
    const ok = await handleVerify(selected);
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

  const backIconStyle = isRTL ? { transform: 'scaleX(-1)' } : {};

  return createPortal(
    <div onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
      style={{ position: 'fixed', inset: 0, zIndex: 999999, background: 'rgba(5,15,40,0.72)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
      <div dir={isRTL ? 'rtl' : 'ltr'} style={{
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
            <h3 style={{ fontSize: 17, fontWeight: 900, color: 'var(--text-1)', margin: 0 }}>{t('sl_connect_title')}</h3>
            <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 4, lineHeight: 1.5 }}>
              {t('sl_connect_subtitle')}
            </p>
          </div>

          {/* ── Step 1: Choose platform ── */}
          {step === 'choose' && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', marginBottom: 8 }}>{t('sl_choose_network')}</div>
              {PLATFORMS.map(pl => {
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
                        {user?.[`${pl.key}_verified`] ? t('sl_verified_check') : t('sl_pending_verify')}
                      </span>
                    ) : (
                      <ArrowRight size={16} color="var(--text-3)" style={{ marginLeft: 'auto', ...backIconStyle }} />
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
                <ArrowRight size={14} style={backIconStyle} /> {t('sl_back')}
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
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>{t('sl_your_username', { platform: p.label })}</div>
                <input
                  type="text"
                  value={usernameInput}
                  onChange={e => setUsernameInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleGenerateCode(); }}
                  placeholder={t('sl_username_placeholder')}
                  dir="ltr"
                  autoFocus
                  style={{ width: '100%', height: 48, borderRadius: 12, border: '1.5px solid var(--border-1)', background: 'var(--surface-2)', color: 'var(--text-1)', padding: '0 14px', fontSize: 15, outline: 'none', boxSizing: 'border-box' }}
                />
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4 }}>
                  {t('sl_username_hint')}
                </div>
              </div>

              <button onClick={handleGenerateCode} disabled={!usernameInput.trim() || loading}
                style={{ width: '100%', height: 48, borderRadius: 12, background: usernameInput.trim() ? p.brandSolid : 'var(--surface-3)', color: 'white', border: 'none', fontWeight: 700, fontSize: 14, cursor: usernameInput.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {loading ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} style={backIconStyle} />}
                {t('sl_continue')}
              </button>
            </div>
          )}

          {/* ── Step 3: Code instructions ── */}
          {step === 'code' && p && (
            <div>
              <button onClick={() => setStep('choose')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: 'var(--text-2)', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: '0 0 12px' }}>
                <ArrowRight size={14} style={backIconStyle} /> {t('sl_back')}
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <span style={{ width: 40, height: 40, borderRadius: 10, background: p.brandColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <p.icon size={20} color="white" />
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-1)' }}>{p.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>@{existingUsername || usernameInput}</div>
                </div>
                <button onClick={() => { setStep('username'); setVerified(false); }}
                  style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4, background: 'var(--surface-3)', border: '1px solid var(--border-1)', borderRadius: 10, padding: '7px 12px', fontSize: 12, fontWeight: 700, color: 'var(--text-2)', cursor: 'pointer' }}>
                  <Edit3 size={13} /> {t('sl_edit')}
                </button>
              </div>

              {/* Verified state */}
              {verified ? (
                <div style={{ textAlign: 'center', padding: '32px 16px' }}>
                  <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, #fbbf24, #d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 8px 24px rgba(217,119,6,0.35)' }}>
                    <CheckCircle size={36} color="white" />
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-1)', marginBottom: 6 }}>{t('sl_verified_title')}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>
                    {t('sl_verified_body')}{!isUserVerified(user) ? t('sl_verified_after_kyc') : ''}.
                  </div>
                  <button onClick={handleClose} style={{ marginTop: 20, width: '100%', height: 48, borderRadius: 12, background: 'linear-gradient(135deg, #fbbf24, #d97706)', color: 'white', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer', boxShadow: '0 4px 16px rgba(217,119,6,0.3)' }}>
                    {t('sl_done')}
                  </button>
                </div>
              ) : (
                <>
                  {/* The code — big and copyable */}
                  <div style={{ background: 'linear-gradient(135deg, #eff6ff, #dbeafe)', borderRadius: 14, border: '1.5px solid #bfdbfe', padding: '16px', textAlign: 'center', marginBottom: 16 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#1e40af', marginBottom: 6 }}>{t('sl_your_code')}</div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                      <code style={{ fontSize: 28, fontWeight: 900, color: '#1a6fd4', letterSpacing: 4 }}>{code || existingCode}</code>
                      <button onClick={() => { navigator.clipboard.writeText(code || existingCode); toast.success(t('sl_code_copied')); }}
                        style={{ width: 40, height: 40, borderRadius: 10, background: 'white', border: '1.5px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                        <Copy size={16} color="#1a6fd4" />
                      </button>
                    </div>
                  </div>

                  {/* Step-by-step instructions */}
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', marginBottom: 8 }}>{t('sl_what_to_do')}</div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: 'var(--surface-3)', borderRadius: 10, padding: '10px 12px' }}>
                      <span style={{ width: 24, height: 24, borderRadius: '50%', background: '#1a6fd4', color: 'white', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>1</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{t('sl_copy_code')}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: 'var(--surface-3)', borderRadius: 10, padding: '10px 12px' }}>
                      <span style={{ width: 24, height: 24, borderRadius: '50%', background: '#1a6fd4', color: 'white', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>2</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{t('sl_open_platform', { platform: p.label })}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{t(p.bioHintKey)}</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: 'var(--surface-3)', borderRadius: 10, padding: '10px 12px' }}>
                      <span style={{ width: 24, height: 24, borderRadius: '50%', background: '#1a6fd4', color: 'white', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>3</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{t('sl_paste_bio')}</div>
                        <a href={p.editBioUrl} target="_blank" rel="noreferrer"
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 6, fontSize: 12, fontWeight: 700, color: '#1a6fd4', textDecoration: 'none' }}>
                          {t('sl_edit_profile')} <ExternalLink size={12} />
                        </a>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: 'var(--surface-3)', borderRadius: 10, padding: '10px 12px' }}>
                      <span style={{ width: 24, height: 24, borderRadius: '50%', background: '#1a6fd4', color: 'white', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>4</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>{t('sl_back_and_verify')}</div>
                      </div>
                    </div>
                  </div>

                  {/* Verify button */}
                  <button onClick={handleVerifyClick} disabled={loading}
                    style={{ marginTop: 16, width: '100%', height: 50, borderRadius: 12, background: loading ? '#93c5fd' : 'linear-gradient(135deg, #16a34a, #059669)', color: 'white', border: 'none', fontWeight: 800, fontSize: 15, cursor: loading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 3px 12px rgba(16,185,129,0.3)' }}>
                    {loading ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
                    {loading ? (verifyAttempt > 1 ? t('sl_retrying', { n: verifyAttempt }) : t('sl_scanning')) : t('sl_i_verified')}
                  </button>

                  {loading && (
                    <div style={{ marginTop: 10, padding: '10px 14px', background: '#eff6ff', borderRadius: 10, border: '1px solid #bfdbfe', textAlign: 'center' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#1e40af' }}>{t('sl_scanning_profile')}</div>
                      <div style={{ fontSize: 11, color: '#3b82f6', marginTop: 2 }}>{verifyAttempt > 1 ? t('sl_attempt_n', { n: verifyAttempt }) : t('sl_takes_seconds')}</div>
                    </div>
                  )}

                  {!loading && (
                    <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-3)', textAlign: 'center', lineHeight: 1.5 }}>
                      {t('sl_ensure_public')}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}