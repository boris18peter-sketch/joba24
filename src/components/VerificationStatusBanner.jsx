import { useState } from 'react';
import { Shield, ChevronLeft, Clock, XCircle } from 'lucide-react';
import VerifyModal from '@/components/VerifyModal';

/**
 * VerificationStatusBanner — shows KYC status for unverified users.
 * Uses `me` from useAuth() so it updates in real-time when the admin
 * approves or revokes verification.
 *
 * States:
 *   - not submitted (kyc_status null/undefined) → blue CTA
 *   - pending  → amber, "under review"
 *   - rejected → red, "rejected — resubmit"
 *   - approved (is_verified true) → hidden (green badge shows instead)
 */
export default function VerificationStatusBanner({ me }) {
  const [showVerify, setShowVerify] = useState(false);

  if (!me || me.is_verified) return null;

  const status = me.kyc_status; // 'pending' | 'rejected' | null/undefined

  const config = {
    pending: {
      icon: Clock,
      iconBg: '#fffbeb',
      iconColor: '#d97706',
      borderColor: '#fde68a',
      title: 'אימות בבדיקה',
      sub: 'הפרטים שלך נשלחו, ממתין לאישור הצוות',
    },
    rejected: {
      icon: XCircle,
      iconBg: '#fef2f2',
      iconColor: '#dc2626',
      borderColor: '#fecaca',
      title: 'אימות נדחה',
      sub: 'האימות נדחה — ניתן לעדכן את הפרטים ולשלוח שוב',
    },
    default: {
      icon: Shield,
      iconBg: '#eff6ff',
      iconColor: '#1a6fd4',
      borderColor: 'var(--border-1)',
      title: 'אימות זהות',
      sub: 'אימות חד־פעמי לפתיחת ג\'ובות ולקיחת משימות',
    },
  };

  const c = config[status] || config.default;
  const Icon = c.icon;

  return (
    <>
      <button
        onClick={() => setShowVerify(true)}
        style={{ all: 'unset', cursor: 'pointer', width: '100%', display: 'block' }}
        dir="rtl"
      >
        <div style={{
          background: 'var(--surface-2)',
          borderRadius: 14,
          border: `1px solid ${c.borderColor}`,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 14px',
          marginBottom: 10,
          transition: 'transform 0.15s',
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: 11,
            background: c.iconBg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Icon size={18} color={c.iconColor} strokeWidth={1.8} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-1)' }}>{c.title}</div>
            <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 1 }}>{c.sub}</div>
          </div>
          <ChevronLeft size={15} color="var(--text-3)" style={{ flexShrink: 0 }} />
        </div>
      </button>

      {showVerify && (
        <VerifyModal
          onClose={() => setShowVerify(false)}
          onSuccess={() => setShowVerify(false)}
        />
      )}
    </>
  );
}