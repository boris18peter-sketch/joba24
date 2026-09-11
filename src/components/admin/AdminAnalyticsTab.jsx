import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import {
  Download, Users, UserCheck, ShieldCheck, Award, Bell, TrendingUp,
  ChevronDown, ChevronUp, Smartphone, Globe, Loader2,
} from 'lucide-react';
import { isUserVerified, hasSocialVerified } from '@/lib/utils';
import { getCategoryLabel } from '@/lib/categories';

/**
 * Admin Analytics Tab — funnel analytics showing where users are in the
 * onboarding process: downloads → registration → profile → KYC → social.
 */
export default function AdminAnalyticsTab({ allUsers = [] }) {
  const { user: me } = useAuth();
  const [showRecent, setShowRecent] = useState(true);

  // Fetch all referral events (downloads) — service-role via admin
  const { data: referralEvents = [], isLoading: loadingEvents } = useQuery({
    queryKey: ['adminReferralEvents'],
    queryFn: () => base44.entities.ReferralEvent.list('-created_date', 500),
    enabled: me?.role === 'admin',
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  // ── Funnel computation ──
  const totalUsers = allUsers.length;
  const totalDownloads = referralEvents.length;
  const registeredFromDownloads = referralEvents.filter(e => e.registered).length;
  const pendingDownloads = totalDownloads - registeredFromDownloads;

  const profileCompleted = allUsers.filter(u =>
    u.phone && u.preferred_categories?.length > 0
  ).length;
  const kycSubmitted = allUsers.filter(u =>
    u.kyc_status || u.id_number || u.id_photo_url
  ).length;
  const kycApproved = allUsers.filter(u => isUserVerified(u)).length;
  const goldVerified = allUsers.filter(u => isUserVerified(u) && hasSocialVerified(u)).length;
  const socialConnected = allUsers.filter(u =>
    u.instagram_verified || u.facebook_verified || u.tiktok_verified
  ).length;
  const notificationsEnabled = allUsers.filter(u => u.fcm_tokens?.length > 0).length;

  // Agent vs organic
  const agentReferred = allUsers.filter(u => u.referred_by_agent_code).length;
  const organic = totalUsers - agentReferred;

  // Recent registrations (last 10)
  const recentUsers = [...allUsers]
    .sort((a, b) => (b.created_date || '').localeCompare(a.created_date || ''))
    .slice(0, 15);

  const funnelSteps = [
    { label: 'הורדות אפליקציה', value: totalDownloads, icon: Download, color: '#7c3aed', bg: '#f5f3ff', desc: `${pendingDownloads} לא נרשמו עדיין` },
    { label: 'נרשמו', value: totalUsers, icon: Users, color: '#1a6fd4', bg: '#eff6ff', desc: `${agentReferred} דרך סוכנים, ${organic} אורגני` },
    { label: 'מילאו פרופיל', value: profileCompleted, icon: UserCheck, color: '#059669', bg: '#f0fdf4', desc: 'טלפון + קטגוריות' },
    { label: 'הגישו KYC', value: kycSubmitted, icon: ShieldCheck, color: '#d97706', bg: '#fffbeb', desc: 'ת.ז. או תמונה' },
    { label: 'אומתו (וי ירוק)', value: kycApproved, icon: ShieldCheck, color: '#16a34a', bg: '#dcfce7', desc: `${goldVerified} עם וי זהב` },
    { label: 'חיברו רשת חברתית', value: socialConnected, icon: Award, color: '#92400e', bg: '#fef3c7', desc: 'אינסטגרם/פייסבוק/טיקטוק' },
    { label: 'הפעילו התראות', value: notificationsEnabled, icon: Bell, color: '#1d4ed8', bg: '#dbeafe', desc: 'FCM token רשום' },
  ];

  const conversionRate = (step, prev) => {
    if (!prev || prev === 0) return null;
    return Math.round((step / prev) * 100);
  };

  return (
    <div dir="rtl">
      {/* Funnel */}
      <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-1)', marginBottom: 10 }}>
        משפך ההמרה — מהורדה עד אימות
      </div>

      {loadingEvents ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <Loader2 size={24} className="animate-spin" color="#1a6fd4" />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {funnelSteps.map((step, i) => {
            const prevValue = i > 0 ? funnelSteps[i - 1].value : 0;
            const conv = conversionRate(step.value, prevValue);
            const pct = totalUsers > 0 ? Math.round((step.value / totalUsers) * 100) : 0;
            return (
              <div key={step.label} style={{
                background: 'var(--surface-2)', borderRadius: 14,
                border: '1px solid var(--border-1)', padding: '12px 14px',
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 12,
                  background: step.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <step.icon size={20} color={step.color} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-1)' }}>{step.label}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{step.desc}</div>
                  {/* Progress bar */}
                  <div style={{ marginTop: 6, height: 6, borderRadius: 3, background: 'var(--surface-3)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 3, background: step.color,
                      width: `${totalUsers > 0 ? Math.max(2, (step.value / totalUsers) * 100) : 0}%`,
                      transition: 'width 0.4s ease',
                    }} />
                  </div>
                </div>
                <div style={{ textAlign: 'center', flexShrink: 0, minWidth: 60 }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: step.color }}>{step.value}</div>
                  {conv !== null && i > 0 && (
                    <div style={{ fontSize: 10, fontWeight: 700, color: conv >= 50 ? '#16a34a' : '#d97706' }}>
                      {conv}% מהשלב הקודם
                    </div>
                  )}
                  {i === 0 && (
                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-3)' }}>
                      {pct}% מהרשומים
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Source breakdown */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 16,
      }}>
        <div style={{
          background: 'var(--surface-2)', borderRadius: 14, border: '1px solid var(--border-1)',
          padding: '14px', textAlign: 'center',
        }}>
          <Smartphone size={18} color="#7c3aed" style={{ marginBottom: 4 }} />
          <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-1)' }}>{agentReferred}</div>
          <div style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 700 }}>דרך סוכנים</div>
        </div>
        <div style={{
          background: 'var(--surface-2)', borderRadius: 14, border: '1px solid var(--border-1)',
          padding: '14px', textAlign: 'center',
        }}>
          <Globe size={18} color="#1a6fd4" style={{ marginBottom: 4 }} />
          <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-1)' }}>{organic}</div>
          <div style={{ fontSize: 10, color: 'var(--text-3)', fontWeight: 700 }}>אורגני</div>
        </div>
      </div>

      {/* Pending downloads (opened app but didn't register) */}
      {pendingDownloads > 0 && (
        <div style={{
          background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: 14,
          padding: '12px 14px', marginTop: 12, display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <Download size={18} color="#d97706" />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 800, color: '#92400e' }}>
              {pendingDownloads} הורידו אך לא נרשמו
            </div>
            <div style={{ fontSize: 11, color: '#b45309', marginTop: 2 }}>
              כדאי לשלוח תזכורת או לפנות אליהם
            </div>
          </div>
        </div>
      )}

      {/* Recent registrations */}
      <div style={{ marginTop: 16 }}>
        <button
          onClick={() => setShowRecent(!showRecent)}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, width: '100%',
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 800, color: 'var(--text-1)', marginBottom: 8,
          }}
        >
          <TrendingUp size={15} color="#1a6fd4" />
          הרשמות אחרונות
          {showRecent ? <ChevronUp size={14} color="var(--text-3)" /> : <ChevronDown size={14} color="var(--text-3)" />}
        </button>
        {showRecent && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {recentUsers.map(u => {
              const hasProfile = u.phone && u.preferred_categories?.length > 0;
              const hasKyc = isUserVerified(u);
              const hasSocial = u.instagram_verified || u.facebook_verified || u.tiktok_verified;
              return (
                <div key={u.id} style={{
                  background: 'var(--surface-2)', borderRadius: 10,
                  border: '1px solid var(--border-1)', padding: '8px 12px',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <div style={{
                    width: 30, height: 30, borderRadius: '50%',
                    background: 'linear-gradient(135deg,#1a6fd4,#3b82f6)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'white', fontWeight: 700, fontSize: 12, flexShrink: 0, overflow: 'hidden',
                  }}>
                    {u.profile_photo ? <img src={u.profile_photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (u.full_name?.[0] || '?')}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {u.full_name || u.email}
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-3)' }}>
                      {u.created_date ? format(new Date(u.created_date), 'dd/MM/yy HH:mm', { locale: he }) : ''}
                      {u.referred_by_agent_code ? ` · דרך ${u.referred_by_agent_code}` : ' · אורגני'}
                    </div>
                  </div>
                  {/* Mini funnel badges */}
                  <div style={{ display: 'flex', gap: 3, flexShrink: 0 }}>
                    <span style={miniBadge(hasProfile, '#16a34a', '#dcfce7')}>פרופיל</span>
                    <span style={miniBadge(hasKyc, '#16a34a', '#dcfce7')}>KYC</span>
                    <span style={miniBadge(hasSocial, '#d97706', '#fffbeb')}>רשת</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function miniBadge(active, activeColor, activeBg) {
  return {
    fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 8,
    background: active ? activeBg : 'var(--surface-3)',
    color: active ? activeColor : 'var(--text-3)',
    border: `1px solid ${active ? activeColor + '33' : 'var(--border-1)'}`,
  };
}