import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import {
  Loader2, Check, X, ShieldCheck, Link2, Unlink, Sparkles,
  Instagram, Facebook, Youtube, Twitter, Linkedin, Twitch, Share2, Music2,
} from 'lucide-react';
import { usePhylloConnect } from '@/hooks/usePhylloConnect';

const PLATFORM_ICON_MAP = {
  instagram: Instagram,
  tiktok: Music2,
  youtube: Youtube,
  facebook: Facebook,
  twitter: Twitter,
  x: Twitter,
  twitch: Twitch,
  linkedin: Linkedin,
};

function getPlatformIcon(name) {
  if (!name) return Share2;
  const lower = name.toLowerCase();
  for (const key of Object.keys(PLATFORM_ICON_MAP)) {
    if (lower.includes(key)) return PLATFORM_ICON_MAP[key];
  }
  return Share2;
}

export default function SocialLinksSection({ user }) {
  const queryClient = useQueryClient();
  const { connect, loading, error: phylloError, setError: setPhylloError } = usePhylloConnect();
  const [showManage, setShowManage] = useState(false);
  const [success, setSuccess] = useState('');

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['me'] });
    queryClient.invalidateQueries({ queryKey: ['phylloAccounts'] });
  };

  // Fetch connected accounts from Phyllo API
  const { data: phylloData } = useQuery({
    queryKey: ['phylloAccounts'],
    queryFn: async () => {
      const res = await base44.functions.invoke('phylloGetAccounts', {});
      return res.data;
    },
    enabled: !!user?.phyllo_user_id,
    staleTime: 30000,
  });

  const connectedAccounts = phylloData?.accounts || [];
  const isConnected = connectedAccounts.length > 0;

  const handleConnect = async () => {
    setPhylloError('');
    await connect({
      onAccountConnected: async (accountId, workplatformId) => {
        await base44.auth.updateMe({ phyllo_connected: true });
        await refresh();
        setSuccess('החשבון חובר בהצלחה! 🎉');
        setTimeout(() => setSuccess(''), 2000);
      },
      onAccountDisconnected: async () => {
        await base44.auth.updateMe({ phyllo_connected: false });
        await refresh();
      },
      onExit: () => {
        // Refresh accounts when SDK closes (user may have connected/disconnected)
        refresh();
      },
    });
  };

  const handleDisconnectAll = async () => {
    await base44.auth.updateMe({ phyllo_connected: false });
    await refresh();
    setShowManage(false);
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
          {isConnected && (
            <span style={{
              fontSize: 10, fontWeight: 700, color: '#059669',
              background: '#f0fdf4', border: '1px solid #bbf7d0',
              borderRadius: 99, padding: '2px 8px',
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <ShieldCheck size={10} /> {connectedAccounts.length} מחוברות
            </span>
          )}
        </div>

        {/* Connected platform icons */}
        {isConnected && (
          <div style={{ padding: '0 16px 10px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {connectedAccounts.map((acc, i) => {
              const Icon = getPlatformIcon(acc.platform_name);
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'var(--surface-3)', borderRadius: 12,
                  padding: '6px 10px', border: '1px solid var(--border-1)',
                }}>
                  <Icon size={16} color="var(--text-2)" />
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1)' }}>
                    {acc.platform_name}
                  </span>
                  {acc.account_name && (
                    <span style={{ fontSize: 10, color: 'var(--text-3)' }}>@{acc.account_name}</span>
                  )}
                  <ShieldCheck size={11} color="#059669" />
                </div>
              );
            })}
          </div>
        )}

        <div style={{ padding: '0 16px 14px' }}>
          {isConnected ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleConnect}
                disabled={loading}
                style={{
                  flex: 1, height: 46, borderRadius: 12, cursor: loading ? 'wait' : 'pointer',
                  background: loading ? 'var(--surface-3)' : 'var(--surface-3)',
                  color: loading ? 'var(--text-3)' : 'var(--text-1)',
                  border: '1px solid var(--border-1)', fontWeight: 700, fontSize: 13,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  transition: 'opacity 0.15s',
                }}
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Link2 size={16} />}
                {loading ? 'מחכה...' : 'חבר עוד רשתות'}
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
              onClick={handleConnect}
              disabled={loading}
              style={{
                width: '100%', height: 48, borderRadius: 12, cursor: loading ? 'wait' : 'pointer',
                background: loading ? 'var(--surface-3)' : 'linear-gradient(135deg, #1a6fd4, #0a52b0)',
                color: loading ? 'var(--text-3)' : 'white',
                border: 'none', fontWeight: 700, fontSize: 14,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: loading ? 'none' : '0 3px 12px rgba(26,111,212,0.2)',
              }}
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
              {loading ? 'פותח...' : 'חבר רשתות חברתיות'}
            </button>
          )}

          {phylloError && (
            <div style={{
              marginTop: 8, fontSize: 12, color: '#dc2626', fontWeight: 600,
              background: '#fff1f2', border: '1px solid #fecaca',
              borderRadius: 10, padding: '8px 12px',
            }}>
              {phylloError}
            </div>
          )}
        </div>
      </div>

      {/* Manage / Disconnect sheet */}
      {showManage && createPortal(
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowManage(false); }}
          style={{
            position: 'fixed', inset: 0, zIndex: 999999,
            background: 'rgba(5,15,40,0.72)',
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            backdropFilter: 'blur(8px)',
          }}
        >
          <div dir="rtl" style={{
            background: 'var(--sheet-bg)', borderRadius: '24px 24px 0 0',
            width: '100%', maxWidth: 480,
            boxShadow: '0 -16px 60px rgba(0,0,0,0.25)',
            paddingBottom: 'max(24px, env(safe-area-inset-bottom))',
            maxHeight: '90dvh', overflowY: 'auto',
          }}>
            <div style={{ width: 40, height: 4, borderRadius: 99, background: 'var(--border-1)', margin: '14px auto 0' }} />
            <div style={{ display: 'flex', justifyContent: 'flex-start', padding: '12px 16px 0' }}>
              <button onClick={() => setShowManage(false)} style={{
                width: 32, height: 32, borderRadius: 10, background: 'var(--surface-3)',
                border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              }}>
                <X size={16} color="var(--text-3)" />
              </button>
            </div>
            <div style={{ padding: '8px 20px 8px' }}>
              {success && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '24px 0' }}>
                  <div style={{
                    width: 60, height: 60, borderRadius: '50%', background: '#f0fdf4',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '3px solid #bbf7d0',
                  }}>
                    <Check size={30} color="#059669" strokeWidth={3} />
                  </div>
                  <div style={{ fontSize: 17, fontWeight: 900, color: 'var(--text-1)' }}>{success}</div>
                </div>
              )}
              {!success && (
                <>
                  <div style={{ textAlign: 'center', marginBottom: 14 }}>
                    <div style={{
                      width: 52, height: 52, borderRadius: 14,
                      background: 'linear-gradient(135deg, #1a6fd4, #0a52b0)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      margin: '0 auto 10px',
                    }}>
                      <ShieldCheck size={26} color="white" />
                    </div>
                    <h3 style={{ fontSize: 17, fontWeight: 900, color: 'var(--text-1)', margin: 0 }}>ניהול רשתות חברתיות</h3>
                    <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 4, lineHeight: 1.5 }}>
                      {connectedAccounts.length} רשתות מחוברות דרך Phyllo
                    </p>
                  </div>

                  {/* Connected platforms list */}
                  {connectedAccounts.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
                      {connectedAccounts.map((acc, i) => {
                        const Icon = getPlatformIcon(acc.platform_name);
                        return (
                          <div key={i} style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            background: '#f0fdf4', borderRadius: 12, border: '1px solid #bbf7d0',
                            padding: '10px 12px',
                          }}>
                            <Icon size={18} color="#059669" />
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 13, fontWeight: 700, color: '#065f46' }}>{acc.platform_name}</div>
                              {acc.account_name && <div style={{ fontSize: 11, color: '#059669' }}>@{acc.account_name}</div>}
                            </div>
                            <ShieldCheck size={16} color="#059669" />
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <button
                    onClick={handleDisconnectAll}
                    style={{
                      width: '100%', height: 46, borderRadius: 12,
                      background: '#fff1f2', border: '1px solid #fecaca',
                      color: '#dc2626', fontWeight: 700, fontSize: 14,
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    }}
                  >
                    <Unlink size={16} /> נתק את כל הרשתות
                  </button>
                </>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}