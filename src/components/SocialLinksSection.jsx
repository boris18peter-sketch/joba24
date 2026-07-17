import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Loader2, X, ShieldCheck, Link2, Unlink, Sparkles,
  Instagram, Facebook, Music2, Copy, AlertCircle, ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import GoldBadge from '@/components/GoldBadge';
import { isUserVerified } from '@/lib/utils';

const INSTAGRAM_CONNECTOR_ID = '6a461cba44174744ca6f4c1c';
const TIKTOK_CONNECTOR_ID = '6a461cbcb8f2b9b391f70d9e';

// Platforms that use OAuth (automatic, no bio code needed)
const OAUTH_PLATFORMS = new Set(['instagram', 'tiktok']);

const PLATFORMS = [
  {
    key: 'instagram', label: 'Instagram', icon: Instagram,
    brandColor: 'linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)',
    brandSolid: '#dc2743',
    url: (u) => `https://instagram.com/${u}`,
  },
  {
    key: 'facebook', label: 'Facebook', icon: Facebook,
    brandColor: '#1877F2',
    brandSolid: '#1877F2',
    url: (u) => `https://facebook.com/${u}`,
  },
  {
    key: 'tiktok', label: 'TikTok', icon: Music2,
    brandColor: 'linear-gradient(135deg, #25F4EE, #000000, #FE2C55)',
    brandSolid: '#000000',
    url: (u) => `https://tiktok.com/@${u}`,
  },
];

function getConnectorId(platform) {
  if (platform === 'instagram') return INSTAGRAM_CONNECTOR_ID;
  if (platform === 'tiktok') return TIKTOK_CONNECTOR_ID;
  return null;
}

export default function SocialLinksSection({ user }) {
  const queryClient = useQueryClient();
  const [showConnect, setShowConnect] = useState(false);
  const [showManage, setShowManage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(null); // platform key being loaded

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['me'] });
  };

  const verifiedPlatforms = PLATFORMS.filter(p => user?.[`${p.key}_username`] && user?.[`${p.key}_verified`]);
  const isConnected = verifiedPlatforms.length > 0;
  const isKycVerified = isUserVerified(user);

  // OAuth connect handler — opens popup, polls for close, then fetches profile
  const handleOAuthConnect = async (platform) => {
    const connectorId = getConnectorId(platform);
    if (!connectorId) return;
    setOauthLoading(platform);
    try {
      const url = await base44.connectors.connectAppUser(connectorId);
      const popup = window.open(url, '_blank');
      if (!popup) {
        toast.error('אנא אפשר חלונות קופצים כדי לחבר את הרשת');
        setOauthLoading(null);
        return;
      }
      // Poll for popup close
      const timer = setInterval(async () => {
        if (!popup || popup.closed) {
          clearInterval(timer);
          // Popup closed — fetch profile
          try {
            setLoading(true);
            const res = await base44.functions.invoke('verifyInstagram', {
              action: 'fetch_profile',
              platform,
            });
            if (res.data?.error) {
              toast.error(res.data.error);
            } else if (res.data?.verified) {
              toast.success(`${platform === 'instagram' ? 'Instagram' : 'TikTok'} אומת בהצלחה! 🎉`);
              await refresh();
            } else {
              toast.error('לא הצלחנו לאמת את החשבון. נסה שוב.');
            }
          } catch (e) {
            toast.error('החיבור נכשל. ודא שאישרת את ההרשאות בחלון שנפתח.');
          } finally {
            setLoading(false);
            setOauthLoading(null);
          }
        }
      }, 500);
    } catch (e) {
      toast.error('שגיאה בפתיחת חלון ההתחברות');
      setOauthLoading(null);
    }
  };

  const handleConnectCode = async (platform, username) => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('verifyInstagram', {
        action: 'connect_code',
        platform,
        username,
      });
      if (res.data?.error) {
        toast.error(res.data.error);
        return;
      }
      await refresh();
      toast.success(`קוד אימות נוצר עבור ${platform}`);
    } catch (e) {
      toast.error('שגיאה בחיבור הרשת');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (platform) => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke('verifyInstagram', {
        action: 'verify_code',
        platform,
      });
      if (res.data?.error) {
        toast.error(res.data.error);
        return;
      }
      if (res.data?.verified) {
        toast.success(`${platform} אומת בהצלחה! 🎉`);
        await refresh();
      } else {
        toast.error(res.data?.note || 'הקוד לא נמצא בפרופיל. ודא שהוספת את הקוד לביו ונסה שוב.');
      }
    } catch (e) {
      toast.error('שגיאה באימות');
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async (platform) => {
    setLoading(true);
    try {
      await base44.functions.invoke('verifyInstagram', {
        action: 'disconnect',
        platform,
      });
      await refresh();
      toast.success(`${platform} הוסר`);
    } catch (e) {
      toast.error('שגיאה בניתוק');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div style={{
        background: 'var(--surface-2)',
        borderRadius: 16,
        border: '1px solid var(--border-1)',
        overflow: 'hidden',
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

        {/* Verified platform icons */}
        {isConnected && (
          <div style={{ padding: '0 16px 10px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {verifiedPlatforms.map(p => {
              const username = user[`${p.key}_username`];
              return (
                <a key={p.key} href={p.url(username)} target="_blank" rel="noreferrer"
                   style={{
                     display: 'flex', alignItems: 'center', gap: 6,
                     background: '#fffbeb',
                     borderRadius: 12, padding: '6px 12px',
                     border: '1px solid #fde68a',
                     textDecoration: 'none', transition: 'background 0.15s',
                   }}>
                  <span style={{
                    width: 22, height: 22, borderRadius: 6,
                    background: p.brandColor,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
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

        {/* Gold badge benefit banner */}
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
              <button
                onClick={() => setShowConnect(true)}
                disabled={!isKycVerified || loading}
                style={{
                  flex: 1, height: 46, borderRadius: 12, cursor: loading ? 'wait' : 'pointer',
                  background: 'var(--surface-3)', color: 'var(--text-1)',
                  border: '1px solid var(--border-1)', fontWeight: 700, fontSize: 13,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  opacity: !isKycVerified ? 0.5 : 1,
                }}
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Link2 size={16} />}
                {loading ? 'מחכה...' : 'חבר עוד רשת'}
              </button>
              <button
                onClick={() => setShowManage(true)}
                style={{
                  height: 46, width: 46, borderRadius: 12, cursor: 'pointer',
                  background: 'var(--surface-3)', border: '1px solid var(--border-1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--text-2)',
                }}
              >
                <Unlink size={16} />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowConnect(true)}
              disabled={!isKycVerified || loading}
              style={{
                width: '100%', height: 48, borderRadius: 12, cursor: loading ? 'wait' : 'pointer',
                background: !isKycVerified ? 'var(--surface-3)' : 'linear-gradient(135deg, #1a6fd4, #0a52b0)',
                color: !isKycVerified ? 'var(--text-3)' : 'white',
                border: 'none', fontWeight: 700, fontSize: 14,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                opacity: !isKycVerified ? 0.6 : 1,
                boxShadow: !isKycVerified ? 'none' : '0 3px 12px rgba(26,111,212,0.2)',
              }}
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
              {loading ? 'פותח...' : 'חבר רשתות חברתיות'}
            </button>
          )}
        </div>
      </div>

      {/* Connect sheet */}
      {showConnect && createPortal(
        <ConnectSheet
          user={user}
          platforms={PLATFORMS}
          onClose={() => setShowConnect(false)}
          onOAuthConnect={handleOAuthConnect}
          onConnectCode={handleConnectCode}
          onVerifyCode={handleVerifyCode}
          loading={loading}
          oauthLoading={oauthLoading}
        />,
        document.body
      )}

      {/* Manage / Disconnect sheet */}
      {showManage && createPortal(
        <ManageSheet
          user={user}
          platforms={PLATFORMS}
          onClose={() => setShowManage(false)}
          onDisconnect={handleDisconnect}
          loading={loading}
          isKycVerified={isKycVerified}
        />,
        document.body
      )}
    </>
  );
}

function ConnectSheet({ user, platforms, onClose, onOAuthConnect, onConnectCode, onVerifyCode, loading, oauthLoading }) {
  const [selectedPlatform, setSelectedPlatform] = useState(null);
  const [username, setUsername] = useState('');

  const connectedPlatforms = platforms.filter(p => user?.[`${p.key}_username`]);
  const availablePlatforms = platforms.filter(p => !user?.[`${p.key}_username`]);

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
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg, #fbbf24, #d97706)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', boxShadow: '0 4px 16px rgba(217,119,6,0.3)' }}>
              <ShieldCheck size={26} color="white" />
            </div>
            <h3 style={{ fontSize: 17, fontWeight: 900, color: 'var(--text-1)', margin: 0 }}>חיבור רשתות חברתיות</h3>
            <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 4, lineHeight: 1.5 }}>
              חבר את הרשתות שלך וקבל ווי זהב בפרופיל
            </p>
          </div>

          {/* Already connected */}
          {connectedPlatforms.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', marginBottom: 8 }}>מחוברות</div>
              {connectedPlatforms.map(p => {
                const u = user[`${p.key}_username`];
                const v = user[`${p.key}_verified`];
                const code = user[`${p.key}_verify_code`];
                const isOAuth = OAUTH_PLATFORMS.has(p.key);
                return (
                  <div key={p.key} style={{ background: v ? '#fffbeb' : 'var(--surface-3)', borderRadius: 12, border: `1px solid ${v ? '#fde68a' : 'var(--border-1)'}`, padding: '10px 12px', marginBottom: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ width: 30, height: 30, borderRadius: 8, background: p.brandColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <p.icon size={16} color="white" />
                      </span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>@{u}</div>
                        <div style={{ fontSize: 11, color: v ? '#d97706' : 'var(--text-3)' }}>{v ? '✓ מאומת' : 'ממתין לאימות'}</div>
                      </div>
                      {/* Facebook bio code verification */}
                      {!v && !isOAuth && code && (
                        <button onClick={() => onVerifyCode(p.key)} disabled={loading}
                          style={{ padding: '6px 12px', borderRadius: 10, background: '#1a6fd4', color: 'white', border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                          {loading ? <Loader2 size={12} className="animate-spin" /> : 'בדוק אימות'}
                        </button>
                      )}
                    </div>
                    {/* Facebook bio code instructions */}
                    {!v && !isOAuth && code && (
                      <div style={{ marginTop: 8, padding: '8px 10px', background: '#eff6ff', borderRadius: 8, border: '1px solid #bfdbfe' }}>
                        <div style={{ fontSize: 11, color: '#1e40af', fontWeight: 600, marginBottom: 4 }}>הוסף את הקוד הזה לביו שלך:</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <code style={{ fontSize: 16, fontWeight: 900, color: '#1a6fd4', letterSpacing: 2 }}>{code}</code>
                          <button onClick={() => { navigator.clipboard.writeText(code); toast.success('הקוד הועתק'); }}
                            style={{ width: 28, height: 28, borderRadius: 8, background: 'white', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                            <Copy size={12} color="#1a6fd4" />
                          </button>
                        </div>
                      </div>
                    )}
                    {/* Instagram/TikTok — reconnect via OAuth if not verified */}
                    {!v && isOAuth && (
                      <button onClick={() => onOAuthConnect(p.key)} disabled={loading || oauthLoading === p.key}
                        style={{ marginTop: 8, width: '100%', padding: '8px', borderRadius: 10, background: p.brandSolid, color: 'white', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        {oauthLoading === p.key ? <Loader2 size={14} className="animate-spin" /> : <ExternalLink size={14} />}
                        {oauthLoading === p.key ? 'מחכה לאישור...' : `חבר מחדש עם ${p.label}`}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Available platforms */}
          {availablePlatforms.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', marginBottom: 8 }}>זמינות לחיבור</div>
              {availablePlatforms.map(p => {
                const isOAuth = OAUTH_PLATFORMS.has(p.key);
                return (
                  <div key={p.key} style={{ marginBottom: 8 }}>
                    {isOAuth ? (
                      // OAuth platform — single button, no username input
                      <button
                        onClick={() => onOAuthConnect(p.key)}
                        disabled={loading || oauthLoading === p.key}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                          padding: '12px', background: 'var(--surface-3)', borderRadius: 12,
                          border: '1px solid var(--border-1)', cursor: 'pointer',
                          opacity: oauthLoading === p.key ? 0.7 : 1,
                        }}
                      >
                        <span style={{ width: 30, height: 30, borderRadius: 8, background: p.brandColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {oauthLoading === p.key ? <Loader2 size={16} className="animate-spin" color="white" /> : <p.icon size={16} color="white" />}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>
                          {oauthLoading === p.key ? 'פותח חלון התחברות...' : `חבר ${p.label}`}
                        </span>
                        <ExternalLink size={14} color="var(--text-3)" style={{ marginLeft: 'auto' }} />
                      </button>
                    ) : selectedPlatform === p.key ? (
                      // Facebook — username input form (bio code method)
                      <div style={{ background: 'var(--surface-3)', borderRadius: 12, border: '1px solid var(--border-1)', padding: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                          <span style={{ width: 30, height: 30, borderRadius: 8, background: p.brandColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <p.icon size={16} color="white" />
                          </span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>{p.label}</span>
                          <button onClick={() => { setSelectedPlatform(null); setUsername(''); }}
                            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)' }}>
                            <X size={14} />
                          </button>
                        </div>
                        <input
                          type="text"
                          value={username}
                          onChange={e => setUsername(e.target.value)}
                          placeholder={`שם משתמש ב${p.label} (ללא @)`}
                          dir="ltr"
                          style={{ width: '100%', height: 40, borderRadius: 10, border: '1.5px solid var(--border-1)', background: 'var(--surface-2)', color: 'var(--text-1)', padding: '0 12px', fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 8 }}
                        />
                        <button onClick={() => { onConnectCode(p.key, username); setSelectedPlatform(null); setUsername(''); }}
                          disabled={!username.trim() || loading}
                          style={{ width: '100%', height: 40, borderRadius: 10, background: username.trim() ? p.brandSolid : 'var(--surface-3)', color: 'white', border: 'none', fontWeight: 700, fontSize: 13, cursor: username.trim() ? 'pointer' : 'not-allowed' }}>
                          {loading ? <Loader2 size={14} className="animate-spin" /> : `חבר ${p.label}`}
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => setSelectedPlatform(p.key)}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'var(--surface-3)', borderRadius: 12, border: '1px solid var(--border-1)', cursor: 'pointer' }}>
                        <span style={{ width: 30, height: 30, borderRadius: 8, background: p.brandColor, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <p.icon size={16} color="white" />
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>חבר {p.label}</span>
                        <Link2 size={14} color="var(--text-3)" style={{ marginLeft: 'auto' }} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ManageSheet({ user, platforms, onClose, onDisconnect, loading, isKycVerified }) {
  const connectedPlatforms = platforms.filter(p => user?.[`${p.key}_username`]);

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
              <div key={p.key} style={{ background: v && isKycVerified ? '#fffbeb' : 'var(--surface-3)', borderRadius: 12, border: `1px solid ${v && isKycVerified ? '#fde68a' : 'var(--border-1)'}`, padding: '10px 12px', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 30, height: 30, borderRadius: 8, background: p.brandColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <p.icon size={16} color="white" />
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>@{u}</div>
                  <div style={{ fontSize: 11, color: v && isKycVerified ? '#d97706' : 'var(--text-3)' }}>{p.label} {v ? '✓ מאומת' : ''}</div>
                </div>
                <button onClick={() => onDisconnect(p.key)} disabled={loading}
                  style={{ width: 32, height: 32, borderRadius: 10, background: '#fef2f2', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  {loading ? <Loader2 size={14} className="animate-spin" color="#dc2626" /> : <Unlink size={14} color="#dc2626" />}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}