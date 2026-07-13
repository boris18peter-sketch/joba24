import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Loader2, Check, X, ShieldCheck, Link2, Unlink, Sparkles } from 'lucide-react';
import { usePhylloConnect } from '@/hooks/usePhylloConnect';

export default function SocialLinksSection({ user }) {
  const queryClient = useQueryClient();
  const { connect, loading, error: phylloError, setError: setPhylloError } = usePhylloConnect();
  const [showManage, setShowManage] = useState(false);
  const [success, setSuccess] = useState('');

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['me'] });

  const connectedAccounts = user?.phyllo_accounts || [];
  const isConnected = connectedAccounts.length > 0;

  const handleConnect = async () => {
    setPhylloError('');
    await connect({
      onAccountConnected: async (accountId, workplatformId) => {
        const accounts = [...(user?.phyllo_accounts || [])];
        if (!accounts.find(a => a.account_id === accountId)) {
          accounts.push({
            account_id: accountId,
            workplatform_id: workplatformId,
            connected_at: new Date().toISOString(),
          });
        }
        await base44.auth.updateMe({ phyllo_accounts: accounts, phyllo_connected: true });
        await refresh();
        setSuccess('החשבון חובר בהצלחה! 🎉');
        setTimeout(() => setSuccess(''), 2000);
      },
      onAccountDisconnected: async (accountId) => {
        const accounts = (user?.phyllo_accounts || []).filter(a => a.account_id !== accountId);
        await base44.auth.updateMe({
          phyllo_accounts: accounts,
          phyllo_connected: accounts.length > 0,
        });
        await refresh();
      },
      onExit: () => {},
    });
  };

  const handleDisconnectAll = async () => {
    await base44.auth.updateMe({ phyllo_accounts: [], phyllo_connected: false });
    await refresh();
    setShowManage(false);
  };

  return (
    <>
      <div style={{
        background: 'var(--surface-2)',
        borderRadius: 18,
        border: '1px solid var(--border-1)',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '14px 16px 10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-3)', letterSpacing: 0.5, textTransform: 'uppercase' }}>
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
        </div>

        <div style={{ padding: '0 16px 16px' }}>
          {isConnected ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={handleConnect}
                disabled={loading}
                style={{
                  flex: 1, height: 52, borderRadius: 14, cursor: loading ? 'wait' : 'pointer',
                  background: loading ? 'var(--surface-3)' : 'linear-gradient(135deg, #1a6fd4, #0a52b0)',
                  color: loading ? 'var(--text-3)' : 'white',
                  border: 'none', fontWeight: 800, fontSize: 14,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  transition: 'opacity 0.15s',
                }}
              >
                {loading ? <Loader2 size={18} className="animate-spin" /> : <Link2 size={18} />}
                {loading ? 'מחכה...' : 'חבר עוד רשתות'}
              </button>
              <button
                onClick={() => setShowManage(true)}
                style={{
                  height: 52, width: 52, borderRadius: 14, cursor: 'pointer',
                  background: 'var(--surface-3)', border: '1px solid var(--border-1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--text-2)',
                }}
              >
                <Unlink size={18} />
              </button>
            </div>
          ) : (
            <button
              onClick={handleConnect}
              disabled={loading}
              style={{
                width: '100%', height: 56, borderRadius: 14, cursor: loading ? 'wait' : 'pointer',
                background: loading ? 'var(--surface-3)' : 'linear-gradient(135deg, #1a6fd4, #0a52b0)',
                color: loading ? 'var(--text-3)' : 'white',
                border: 'none', fontWeight: 800, fontSize: 15,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                boxShadow: loading ? 'none' : '0 4px 16px rgba(26,111,212,0.25)',
              }}
            >
              {loading ? <Loader2 size={20} className="animate-spin" /> : <Sparkles size={20} />}
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
            background: 'var(--sheet-bg)', borderRadius: '28px 28px 0 0',
            width: '100%', maxWidth: 480,
            boxShadow: '0 -24px 120px rgba(0,0,0,0.3)',
            paddingBottom: 'max(28px, env(safe-area-inset-bottom))',
            maxHeight: '90dvh', overflowY: 'auto',
          }}>
            <div style={{ width: 40, height: 4, borderRadius: 99, background: 'var(--border-1)', margin: '14px auto 0' }} />
            <div style={{ display: 'flex', justifyContent: 'flex-start', padding: '12px 16px 0' }}>
              <button onClick={() => setShowManage(false)} style={{
                width: 34, height: 34, borderRadius: 11, background: 'var(--surface-3)',
                border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              }}>
                <X size={16} color="var(--text-3)" />
              </button>
            </div>
            <div style={{ padding: '8px 20px 8px' }}>
              {success && (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '24px 0' }}>
                  <div style={{
                    width: 64, height: 64, borderRadius: '50%', background: '#f0fdf4',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '3px solid #bbf7d0',
                  }}>
                    <Check size={32} color="#059669" strokeWidth={3} />
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-1)' }}>{success}</div>
                </div>
              )}
              {!success && (
                <>
                  <div style={{ textAlign: 'center', marginBottom: 16 }}>
                    <div style={{
                      width: 56, height: 56, borderRadius: 16,
                      background: 'linear-gradient(135deg, #1a6fd4, #0a52b0)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      margin: '0 auto 12px',
                    }}>
                      <ShieldCheck size={28} color="white" />
                    </div>
                    <h3 style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-1)', margin: 0 }}>ניהול רשתות חברתיות</h3>
                    <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 6, lineHeight: 1.5 }}>
                      {connectedAccounts.length} רשתות מחוברות דרך Phyllo
                    </p>
                  </div>

                  <div style={{
                    background: '#f0fdf4', borderRadius: 14, border: '1px solid #bbf7d0',
                    padding: '14px', marginBottom: 14,
                    display: 'flex', alignItems: 'center', gap: 10,
                  }}>
                    <ShieldCheck size={20} color="#059669" />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#065f46' }}>החשבונות מאומתים</div>
                      <div style={{ fontSize: 12, color: '#059669' }}>הבעלות אומתה באופן מאובטח דרך Phyllo</div>
                    </div>
                  </div>

                  <button
                    onClick={handleDisconnectAll}
                    style={{
                      width: '100%', height: 48, borderRadius: 14,
                      background: '#fff1f2', border: '1px solid #fecaca',
                      color: '#dc2626', fontWeight: 700, fontSize: 15,
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