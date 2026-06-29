import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { RefreshCw, X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import CreditIcon from '@/components/CreditIcon';

/**
 * SubscriptionManager — shows active subscriptions with cancel option.
 */
export default function SubscriptionManager() {
  const queryClient = useQueryClient();
  const [showCancel, setShowCancel] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelled, setCancelled] = useState(false);

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });

  const { data: subscriptions = [] } = useQuery({
    queryKey: ['mySubscriptions', me?.id],
    queryFn: () => base44.entities.TranzilaPayment.filter({
      user_id: me.id,
      type: 'subscription',
      status: 'completed',
      subscription_status: 'active',
    }, '-created_date', 10),
    enabled: !!me?.id,
  });

  const handleCancel = async () => {
    if (!showCancel) return;
    setCancelling(true);
    try {
      await base44.functions.invoke('cancelTranzilaSubscription', { payment_id: showCancel.id });
      await queryClient.invalidateQueries({ queryKey: ['mySubscriptions'] });
      setCancelled(true);
      setTimeout(() => {
        setShowCancel(null);
        setCancelled(false);
      }, 2000);
    } catch (err) {
      console.error('Cancel failed:', err);
    } finally {
      setCancelling(false);
    }
  };

  if (!subscriptions || subscriptions.length === 0) return null;

  return (
    <>
      <div style={{
        background: 'var(--surface-2)',
        borderRadius: 16,
        border: '1px solid var(--border-1)',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--border-1)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <RefreshCw size={15} color="var(--brand-primary)" />
          <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--text-1)' }}>
            המנויים שלי
          </span>
          <span style={{
            background: 'var(--color-success-bg)',
            color: 'var(--color-success)',
            fontSize: 10, fontWeight: 800,
            padding: '2px 8px', borderRadius: 99,
            border: '1px solid var(--color-success-border)',
          }}>
            פעיל
          </span>
        </div>

        {subscriptions.map((sub) => (
          <div key={sub.id} style={{
            padding: '14px 16px',
            borderBottom: '1px solid var(--border-1)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <CreditIcon size={22} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-1)' }}>
                  {sub.credits} קרדיטים לחודש
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>
                  ₪{sub.amount.toFixed(2)} / חודש · חידוש אוטומטי
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowCancel(sub)}
              style={{
                background: 'var(--color-danger-bg)',
                color: 'var(--color-danger)',
                border: '1px solid var(--color-danger-border)',
                borderRadius: 10,
                padding: '7px 14px',
                fontSize: 12, fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              בטל מנוי
            </button>
          </div>
        ))}
      </div>

      {/* Cancel confirmation modal */}
      {showCancel && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 999999,
            background: 'rgba(5,15,40,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(6px)', padding: 20,
          }}
          onClick={(e) => e.target === e.currentTarget && setShowCancel(null)}
        >
          <div
            dir="rtl"
            style={{
              background: 'var(--surface-2)',
              borderRadius: 24,
              maxWidth: 380, width: '100%',
              padding: 28, textAlign: 'center',
              boxShadow: 'var(--shadow-xl)',
            }}
          >
            {cancelled ? (
              <>
                <div style={{
                  width: 64, height: 64, borderRadius: '50%',
                  background: 'var(--color-success-bg)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 16px',
                }}>
                  <CheckCircle2 size={32} color="var(--color-success)" />
                </div>
                <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-1)', marginBottom: 6 }}>
                  המנוי בוטל
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-2)' }}>
                  החיוב האוטומטי הופסק. הקרדיטים שכבר נרכשו נשארים בארנק שלך.
                </div>
              </>
            ) : (
              <>
                <div style={{
                  width: 56, height: 56, borderRadius: '50%',
                  background: 'var(--color-danger-bg)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 16px',
                }}>
                  <AlertTriangle size={26} color="var(--color-danger)" />
                </div>
                <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-1)', marginBottom: 8 }}>
                  ביטול המנוי?
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 24 }}>
                  החיוב האוטומטי החודשי יופסק. תוכל להמשיך להשתמש בקרדיטים שכבר נרכשו.
                  ניתן לרכוש מנוי מחדש בכל עת.
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => setShowCancel(null)}
                    disabled={cancelling}
                    style={{
                      flex: 1, height: 48, borderRadius: 12,
                      background: 'var(--surface-3)', color: 'var(--text-2)',
                      border: '1px solid var(--border-1)',
                      fontSize: 14, fontWeight: 700, cursor: 'pointer',
                    }}
                  >
                    חזור
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={cancelling}
                    style={{
                      flex: 1, height: 48, borderRadius: 12,
                      background: 'var(--color-danger)', color: 'white',
                      border: 'none', fontSize: 14, fontWeight: 800, cursor: cancelling ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}
                  >
                    {cancelling ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : 'אשר ביטול'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}