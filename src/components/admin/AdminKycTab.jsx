import { useState } from 'react';
import { format } from 'date-fns';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Ban, CheckCircle2, RefreshCw, Shield, Instagram, Facebook, Music2 } from 'lucide-react';
import { toast } from 'sonner';
import GoldBadge from '@/components/GoldBadge';
import CopyableId from '@/components/CopyableId';
import { hasSocialVerified } from '@/lib/utils';

function KycButtons({ user, kycStatus }) {
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const handleAction = async (updates, successMsg) => {
    setLoading(true);
    try {
      // Route through the adminUpdateVerification function so a push notification
      // is sent to the user — their device updates instantly instead of waiting
      // for the 30s poll. The function also writes the User entity (WS fires too).
      const isVerified = updates.is_verified ?? false;
      const kycStatusValue = updates.kyc_status || 'approved';
      // UH-2: the KYC verdict is written ONLY by the admin function. The
      // "pending" path routes through it too — it sends no push for pending.
      await base44.functions.invoke('adminUpdateVerification', {
        userId: user.id,
        isVerified,
        kycStatus: kycStatusValue,
      });
      queryClient.setQueryData(['adminUsers'], (old = []) =>
        old.map(u => u.id === user.id ? { ...u, is_verified: isVerified, kyc_status: kycStatusValue } : u)
      );
      toast.success(successMsg);
    } catch (e) {
      toast.error('שגיאה: ' + (e.message || 'לא ניתן לעדכן'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8, marginTop: 4 }}>
      {loading ? (
        <div style={{ flex: 1, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Loader2 size={18} className="animate-spin" color="#1a6fd4" />
        </div>
      ) : (
        <>
          {kycStatus !== 'approved' && (
            <button
              onClick={(e) => { e.stopPropagation(); handleAction({ is_verified: true, kyc_status: 'approved' }, 'אימות אושר'); }}
              style={{ flex: 1, height: 40, borderRadius: 10, background: '#16a34a', color: 'white', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              <CheckCircle2 size={14} /> אשר אימות
            </button>
          )}
          {kycStatus === 'approved' && (
            <button
              onClick={(e) => { e.stopPropagation(); handleAction({ is_verified: false, kyc_status: 'rejected' }, 'אימות בוטל'); }}
              style={{ flex: 1, height: 40, borderRadius: 10, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              <Ban size={14} /> בטל אימות
            </button>
          )}
          {kycStatus === 'pending' && (
            <button
              onClick={(e) => { e.stopPropagation(); handleAction({ is_verified: false, kyc_status: 'rejected' }, 'אימות נדחה'); }}
              style={{ flex: 1, height: 40, borderRadius: 10, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              <Ban size={14} /> דחה אימות
            </button>
          )}
          {kycStatus === 'rejected' && (
            <button
              onClick={(e) => { e.stopPropagation(); handleAction({ is_verified: false, kyc_status: 'pending' }, 'סומן כממתין'); }}
              style={{ flex: 1, height: 40, borderRadius: 10, background: '#eff6ff', color: '#1a6fd4', border: '1px solid #bfdbfe', fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
            >
              סמן כממתין
            </button>
          )}
        </>
      )}
    </div>
  );
}

export default function AdminKycTab({ kycUsers, pendingKyc, onOpenLightbox, refetchUsers }) {
  return (
    <>
      <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>
        {kycUsers.length} משתמשים ב-KYC · {pendingKyc.length} ממתינים לאישור
      </div>
      {pendingKyc.length > 0 && (
        <div style={{ background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: 12, padding: '12px 14px', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Shield size={20} color="#d97706" />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#92400e' }}>{pendingKyc.length} משתמשים ממתינים לאישור KYC</div>
            <div style={{ fontSize: 11, color: '#b45309', marginTop: 2 }}>בדוק את הפרטים ואשר או דחה</div>
          </div>
        </div>
      )}
      <button
        onClick={async () => {
          if (!confirm('האם לאפס את כל האימותים? פעולה זו תוריד את הווי הירוק מכל המשתמשים.')) return;
          try {
            const res = await base44.functions.invoke('resetAllVerifications', {});
            if (res.data?.success) {
              toast.success(`${res.data.resetCount} משתמשים אופסו`);
              refetchUsers();
            } else {
              toast.error('שגיאה באיפוס');
            }
          } catch (e) {
            toast.error('שגיאה: ' + (e.message || ''));
          }
        }}
        style={{ marginBottom: 12, height: 38, borderRadius: 10, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%' }}
      >
        <RefreshCw size={13} /> אפס את כל האימותים (ווי ירוק)
      </button>
      {kycUsers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🛡️</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#0f2b6b' }}>אין נתוני KYC עדיין</div>
        </div>
      ) : kycUsers.map(user => {
        // Derive KYC status from kyc_status only — is_verified is the platform email flag.
        const kycStatus = user.kyc_status || (user.id_number || user.id_photo_url ? 'pending' : 'none');
        const statusConfig = {
          approved: { label: '✓ מאומת', color: '#166534', bg: '#dcfce7', border: '#bbf7d0' },
          pending: { label: '⏳ ממתין לאישור', color: '#854d0e', bg: '#fef9c3', border: '#fde68a' },
          rejected: { label: '✗ נדחה', color: '#991b1b', bg: '#fee2e2', border: '#fecaca' },
        };
        const sc = statusConfig[kycStatus] || statusConfig.pending;
        return (
          <div key={user.id} style={{ background: 'var(--surface-2)', borderRadius: 14, border: `1px solid ${sc.border}`, marginBottom: 10, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#1a6fd4,#3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 15, flexShrink: 0, overflow: 'hidden' }}>
                {user.profile_photo ? <img src={user.profile_photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : user.full_name?.[0] || '?'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, color: 'var(--text-1)', fontSize: 14, display: 'flex', alignItems: 'center', gap: 5 }}>
                  {user.full_name}
                  {hasSocialVerified(user) && <GoldBadge size="sm" />}
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>{user.email}</div>
                {(user.instagram_username || user.facebook_username || user.tiktok_username) && (
                  <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                    {user.instagram_username && (
                      <a href={`https://instagram.com/${user.instagram_username}`} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                        style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 700, color: 'var(--text-2)', background: 'var(--surface-3)', borderRadius: 6, padding: '2px 6px', textDecoration: 'none' }}>
                        <Instagram size={10} color="#dc2743" /> @{user.instagram_username}
                      </a>
                    )}
                    {user.facebook_username && (
                      <a href={`https://facebook.com/${user.facebook_username}`} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                        style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 700, color: 'var(--text-2)', background: 'var(--surface-3)', borderRadius: 6, padding: '2px 6px', textDecoration: 'none' }}>
                        <Facebook size={10} color="#1877F2" /> @{user.facebook_username}
                      </a>
                    )}
                    {user.tiktok_username && (
                      <a href={`https://tiktok.com/@${user.tiktok_username}`} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                        style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 700, color: 'var(--text-2)', background: 'var(--surface-3)', borderRadius: 6, padding: '2px 6px', textDecoration: 'none' }}>
                        <Music2 size={10} color="#000" /> @{user.tiktok_username}
                      </a>
                    )}
                  </div>
                )}
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: sc.bg, color: sc.color, flexShrink: 0 }}>
                {sc.label}
              </span>
            </div>
            <div style={{ padding: '0 16px 14px', borderTop: '1px solid var(--border-1)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
              {user.phone && (
                <div style={{ background: 'var(--surface-3)', borderRadius: 10, padding: '8px 10px' }}>
                  <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, marginBottom: 2 }}>📱 טלפון</div>
                  <div style={{ fontWeight: 700, color: 'var(--text-1)' }}>{user.phone}</div>
                </div>
              )}
              {user.id_number && (
                <div style={{ background: 'var(--surface-3)', borderRadius: 10, padding: '8px 10px' }}>
                  <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, marginBottom: 2 }}>🪪 ת.ז.</div>
                  <div style={{ fontWeight: 700, color: 'var(--text-1)', letterSpacing: 1 }}>{user.id_number}</div>
                </div>
              )}
              {user.id_photo_url && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                    📷 צילום תעודת זהות
                    <span style={{ fontSize: 9, color: '#1a6fd4', fontWeight: 700 }}>(לחץ להגדלה)</span>
                  </div>
                  <img
                    src={user.id_photo_url}
                    alt="ת.ז."
                    onClick={(e) => { e.stopPropagation(); onOpenLightbox({ url: user.id_photo_url, name: user.full_name }); }}
                    style={{ width: '100%', maxHeight: 140, objectFit: 'contain', borderRadius: 10, border: '1px solid var(--border-1)', background: '#f8faff', cursor: 'pointer' }}
                  />
                </div>
              )}
              <div style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <CopyableId id={user.id} label="מזהה משתמש" />
                <span style={{ fontSize: 10, color: '#cbd5e1' }}>{user.created_date ? format(new Date(user.created_date), 'dd/MM/yyyy HH:mm') : ''}</span>
              </div>
              <KycButtons user={user} kycStatus={kycStatus} />
            </div>
          </div>
        );
      })}
    </>
  );
}