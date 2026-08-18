import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Loader2, X, ShieldCheck, Link2, Unlink,
} from 'lucide-react';
import { toast } from 'sonner';
import GoldBadge from '@/components/GoldBadge';
import HomeCtaBanner from '@/components/HomeCtaBanner';
import SocialConnectSheet, { PLATFORMS } from '@/components/SocialConnectSheet';
import { isUserVerified } from '@/lib/utils';
import { useAuth } from '@/lib/AuthContext';
import { useLanguage } from '@/lib/LanguageContext';

function platformLabel(key) {
  const p = PLATFORMS.find(p => p.key === key);
  return p ? p.label : key;
}

export default function SocialLinksSection({ user }) {
  const queryClient = useQueryClient();
  const { refreshUser } = useAuth();
  const { t, isRTL } = useLanguage();
  const [showConnect, setShowConnect] = useState(false);
  const [showManage, setShowManage] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(null);

  const refresh = async () => {
    await refreshUser();
    queryClient.invalidateQueries({ queryKey: ['me'] });
  };

  const verifiedPlatforms = PLATFORMS.filter(p => user?.[`${p.key}_username`] && user?.[`${p.key}_verified`]);
  const isConnected = verifiedPlatforms.length > 0;
  const isKycVerified = isUserVerified(user);

  const handleDisconnect = async (platform) => {
    setLoading(true);
    try {
      await base44.functions.invoke('verifyInstagram', { action: 'disconnect', platform });
      await refresh();
      toast.success(t('sl_disconnected', { platform: platformLabel(platform) }));
      setConfirmDisconnect(null);
      setShowManage(false);
    } catch (e) {
      toast.error(t('sl_error_disconnect'));
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
            {t('sl_social_networks')}
          </div>
          {isConnected && isKycVerified && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <GoldBadge size="sm" />
              <span style={{ fontSize: 10, fontWeight: 700, color: '#d97706' }}>{t('sl_verified_gold')}</span>
            </span>
          )}
          {isConnected && !isKycVerified && (
            <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8' }}>{t('sl_connected_no_gold')}</span>
          )}
        </div>

        {isConnected && (
          <div style={{ padding: '0 16px 10px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {verifiedPlatforms.map(p => {
              const username = user[`${p.key}_username`];
              const isConfirming = confirmDisconnect === p.key;
              if (isConfirming) {
                return (
                  <div key={p.key} style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#fef2f2', borderRadius: 12, padding: '4px 6px 4px 10px', border: '1px solid #fecaca' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#dc2626' }}>{t('sl_disconnect_q')}</span>
                    <button onClick={() => handleDisconnect(p.key)} disabled={loading}
                      style={{ height: 26, padding: '0 10px', borderRadius: 8, background: '#dc2626', border: 'none', color: 'white', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 3 }}>
                      {loading ? <Loader2 size={11} className="animate-spin" /> : t('sl_yes')}
                    </button>
                    <button onClick={() => setConfirmDisconnect(null)} style={{ height: 26, width: 26, borderRadius: 8, background: 'white', border: '1px solid var(--border-1)', color: 'var(--text-2)', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>×</button>
                  </div>
                );
              }
              return (
                <div key={p.key} style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#fffbeb', borderRadius: 12, padding: '5px 5px 5px 12px', border: '1px solid #fde68a' }}>
                  <a href={p.url(username)} target="_blank" rel="noreferrer"
                     style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
                    <span style={{ width: 22, height: 22, borderRadius: 6, background: p.brandColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <p.icon size={13} color="white" />
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1)' }}>{username}</span>
                    <ShieldCheck size={12} color="#d97706" />
                  </a>
                  <button onClick={() => setConfirmDisconnect(p.key)} disabled={loading}
                    style={{ width: 20, height: 20, borderRadius: 6, background: 'rgba(220,38,38,0.08)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                    <X size={11} color="#dc2626" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {isConnected ? (
          <div style={{ padding: '0 16px 14px' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowConnect(true)} disabled={loading}
                style={{ flex: 1, height: 46, borderRadius: 12, cursor: loading ? 'wait' : 'pointer', background: 'var(--surface-3)', color: 'var(--text-1)', border: '1px solid var(--border-1)', fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Link2 size={16} />}
                {loading ? t('sl_waiting') : t('sl_connect_more')}
              </button>
              <button onClick={() => setShowManage(true)} style={{ height: 46, width: 46, borderRadius: 12, cursor: 'pointer', background: 'var(--surface-3)', border: '1px solid var(--border-1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-2)' }}>
                <Unlink size={16} />
              </button>
            </div>
          </div>
        ) : (
          <div style={{ padding: '0 16px 14px' }}>
            <HomeCtaBanner
              theme="gold"
              iconType="social"
              label={t('cta_social')}
              sublabel={!isKycVerified ? t('sl_gold_after_verify') : undefined}
              onClick={() => setShowConnect(true)}
            />
          </div>
        )}
      </div>

      {showConnect && createPortal(
        <SocialConnectSheet user={user} onClose={() => setShowConnect(false)} />,
        document.body
      )}

      {showManage && createPortal(
        <ManageSheet user={user} onClose={() => setShowManage(false)} onDisconnect={handleDisconnect} loading={loading} isKycVerified={isKycVerified} t={t} isRTL={isRTL} />,
        document.body
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════
// ManageSheet — disconnect / reconnect
// ═══════════════════════════════════════════════════════════════════
function ManageSheet({ user, onClose, onDisconnect, loading, isKycVerified, t, isRTL }) {
  const connectedPlatforms = PLATFORMS.filter(p => user?.[`${p.key}_username`]);
  const [confirmDisconnect, setConfirmDisconnect] = useState(null);

  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: 'fixed', inset: 0, zIndex: 999999, background: 'rgba(5,15,40,0.72)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', backdropFilter: 'blur(8px)' }}>
      <div dir={isRTL ? 'rtl' : 'ltr'} style={{
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
            <h3 style={{ fontSize: 17, fontWeight: 900, color: 'var(--text-1)', margin: 0 }}>{t('sl_manage_title')}</h3>
            <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 4 }}>{t('sl_networks_connected', { n: connectedPlatforms.length })}</p>
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
                    <div style={{ fontSize: 11, color: v && isKycVerified ? '#d97706' : 'var(--text-3)' }}>{p.label} {v ? t('sl_verified_check') : t('sl_pending_verify')}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                  {confirmDisconnect === p.key ? (
                    <>
                      <button onClick={() => { onDisconnect(p.key); setConfirmDisconnect(null); }} disabled={loading}
                        style={{ flex: 1, height: 34, borderRadius: 9, cursor: loading ? 'wait' : 'pointer', background: '#dc2626', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: 'white' }}>
                        {loading ? <Loader2 size={12} className="animate-spin" /> : t('sl_confirm_disconnect')}
                      </button>
                      <button onClick={() => setConfirmDisconnect(null)} style={{ height: 34, width: 60, borderRadius: 9, cursor: 'pointer', background: 'var(--surface-2)', border: '1px solid var(--border-1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--text-2)' }}>
                        {t('sl_cancel')}
                      </button>
                    </>
                  ) : (
                    <button onClick={() => setConfirmDisconnect(p.key)} disabled={loading}
                      style={{ width: '100%', height: 34, borderRadius: 9, cursor: loading ? 'wait' : 'pointer', background: '#fef2f2', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: '#dc2626' }}>
                      <Unlink size={12} /> {t('sl_disconnect_this')}
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {connectedPlatforms.length === 0 && (
            <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-3)', fontSize: 13 }}>{t('sl_no_networks')}</div>
          )}
        </div>
      </div>
    </div>
  );
}