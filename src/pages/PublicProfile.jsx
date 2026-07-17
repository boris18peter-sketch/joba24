import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Star, MapPin, FileText, ChevronLeft, Loader2, Clock, X, Phone, Instagram, Facebook, Music2, ShieldCheck, ExternalLink } from 'lucide-react';
import VerifiedBadge from '@/components/VerifiedBadge';
import GoldBadge from '@/components/GoldBadge';
import TrustCard from '@/components/TrustCard';
import ProfileMediaGallery from '@/components/ProfileMediaGallery';
import TaskReviewHistory from '@/components/TaskReviewHistory';
import { getCategoryLabel } from '@/lib/categories';
import { calculateTrustScore, getTrustLevel } from '@/lib/trustScore';
import { isUserVerified } from '@/lib/utils';

function ReviewChips({ review }) {
  const chips = [
    review.arrived_on_time && { label: '⏱️ הגיע בזמן', color: '#0891b2', bg: '#ecfeff', border: '#a5f3fc' },
    review.professional && { label: '💼 מקצועי', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe' },
    review.good_communication && { label: '💬 תקשורת', color: '#1a6fd4', bg: '#eff6ff', border: '#bfdbfe' },
    review.fair_pricing && { label: '💰 מחיר הוגן', color: '#059669', bg: '#f0fdf4', border: '#bbf7d0' },
    review.would_hire_again && { label: '🔁 ממליץ', color: '#db2777', bg: '#fdf2f8', border: '#fbcfe8' },
  ].filter(Boolean);
  if (!chips.length) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
      {chips.map(c => (
        <span key={c.label} style={{ fontSize: 10, fontWeight: 700, color: c.color, background: c.bg, border: `1px solid ${c.border}`, borderRadius: 99, padding: '2px 8px' }}>
          {c.label}
        </span>
      ))}
    </div>
  );
}

function SectionCard({ title, children }) {
  return (
    <div style={{ background: 'var(--surface-2)', borderRadius: 18, border: '1px solid var(--border-1)', overflow: 'hidden' }}>
      {title && (
        <div style={{ padding: '14px 16px 10px' }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-3)', letterSpacing: 0.5, textTransform: 'uppercase' }}>{title}</div>
        </div>
      )}
      <div style={{ padding: title ? '0 16px 16px' : '16px' }}>{children}</div>
    </div>
  );
}

export default function PublicProfile() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const userId = searchParams.get('id');
  const taskId = searchParams.get('taskId');

  const { data: user, isLoading } = useQuery({
    queryKey: ['publicProfileUser', userId, taskId],
    queryFn: async () => {
      if (!userId) return null;
      const res = await base44.functions.invoke('getPublicUserProfile', { userId, taskId });
      return res.data?.user || null;
    },
    enabled: !!userId,
    staleTime: 60000,
    refetchOnWindowFocus: false,
  });

  const { data: completedTasks = [] } = useQuery({
    queryKey: ['publicTasks', userId],
    queryFn: () => base44.entities.Task.filter({ worker_id: userId, status: 'COMPLETED' }, '-created_date', 20),
    enabled: !!userId,
  });

  const { data: postedTasks = [] } = useQuery({
    queryKey: ['publicPostedTasks', userId],
    queryFn: () => base44.entities.Task.filter({ client_id: userId, status: 'COMPLETED' }, '-created_date', 20),
    enabled: !!userId,
  });

  const { data: allReviews = [] } = useQuery({
    queryKey: ['publicAllReviews', userId],
    queryFn: () => base44.entities.Review.filter({ reviewee_id: userId }, '-created_date', 20),
    enabled: !!userId,
  });

  const [showUnifiedHistory, setShowUnifiedHistory] = useState(false);

  if (isLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh' }}>
      <Loader2 size={28} className="animate-spin" color="#1a6fd4" />
    </div>
  );

  if (!user) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100dvh', gap: 12 }} dir="rtl">
      <div style={{ fontSize: 36 }}>🔍</div>
      <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-2)' }}>המשתמש לא נמצא</p>
      <button onClick={() => navigate(-1)} style={{ fontSize: 14, fontWeight: 700, color: '#1a6fd4', background: 'none', border: 'none', cursor: 'pointer' }}>חזרה</button>
    </div>
  );

  const avgRating = allReviews.length > 0
    ? (allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length).toFixed(1)
    : '—';
  const initials = user.full_name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';
  const trustScore = calculateTrustScore(user, { tasks: completedTasks, reviews: allReviews });
  const trustLevel = getTrustLevel(trustScore);

  return (
    <div style={{ background: 'var(--surface-1)', minHeight: '100dvh', paddingBottom: 32 }} dir="rtl">
      {/* ── Header ── */}
      <div style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border-1)', padding: '14px 20px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate(-1)} style={{ width: 36, height: 36, borderRadius: 11, background: 'var(--surface-3)', border: '1px solid var(--border-1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <ChevronLeft size={18} color="var(--text-2)" style={{ transform: 'rotate(180deg)' }} />
        </button>
        <span style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-1)' }}>פרופיל משתמש</span>
      </div>

      {/* ── Avatar + Name ── */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 20px 24px', background: 'var(--surface-2)', borderBottom: '1px solid var(--border-1)' }}>
        <div style={{
          width: 88, height: 88, borderRadius: '50%',
          background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 30, fontWeight: 900, color: 'white',
          overflow: 'hidden', marginBottom: 16,
          boxShadow: '0 4px 20px rgba(26,111,212,0.3)',
        }}>
          {user.profile_photo
            ? <img src={user.profile_photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : initials}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 20, fontWeight: 900, color: 'var(--text-1)' }}>{user.full_name}</span>
          {isUserVerified(user) && (user.instagram_verified || user.facebook_verified || user.tiktok_verified)
            ? <GoldBadge size="md" />
            : isUserVerified(user) && <VerifiedBadge size="md" />}
        </div>
        {/* Stats */}
        <div style={{ display: 'flex', gap: 0, marginTop: 20, background: 'var(--surface-3)', borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border-1)', width: '100%', maxWidth: 340 }}>
          {[
            { value: completedTasks.length, label: "ג'ובות בוצעו" },
            { value: postedTasks.length, label: "ג'ובות פורסמו" },
            { value: avgRating + (avgRating !== '—' ? '★' : ''), label: 'דירוג', sub: allReviews.length > 0 ? `${allReviews.length} ביקורות` : null },
          ].map((s, i, arr) => (
            <div key={i} style={{ flex: 1, padding: '12px 6px', textAlign: 'center', borderLeft: i < arr.length - 1 ? '1px solid var(--border-1)' : 'none' }}>
              <div style={{ fontSize: 17, fontWeight: 900, color: 'var(--text-1)' }}>{s.value}</div>
              <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2, lineHeight: 1.3 }}>{s.label}</div>
              {s.sub && <div style={{ fontSize: 9, color: 'var(--text-3)' }}>{s.sub}</div>}
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Phone — revealed only for approved worker on caller's task */}
        {user.phone && (
          <a href={`tel:${user.phone}`} dir="ltr"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 50, borderRadius: 14, background: 'linear-gradient(135deg,#059669,#047857)', color: 'white', fontWeight: 800, fontSize: 15, textDecoration: 'none', boxShadow: '0 4px 14px rgba(5,150,105,0.3)' }}>
            <Phone size={18} color="white" /> {user.phone}
          </a>
        )}

        {/* Trust bar */}
        <TrustCard user={user} reviews={allReviews} tasks={completedTasks} />

        {/* Bio */}
        {user.bio && (
          <SectionCard title="אודות">
            <p style={{ fontSize: 14, color: 'var(--text-1)', lineHeight: 1.65, margin: 0 }}>{user.bio}</p>
          </SectionCard>
        )}

        {/* Media Gallery (unified with intro video) */}
        {(user.profile_media?.length > 0 || user.intro_video_url) && (
          <SectionCard title="גלריית מדיה">
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 10, lineHeight: 1.5 }}>סרטונים ומדיה שמסבירים עלייך - מגדילים אמון פי 3</div>
            <ProfileMediaGallery
              media={[
                ...(user.intro_video_url ? [{ type: 'video', url: user.intro_video_url }] : []),
                ...(user.profile_media || [])
              ]}
              isEditing={false}
            />
          </SectionCard>
        )}

        {/* Social Links — only VERIFIED platforms are shown as links */}
        {(user.instagram_verified || user.facebook_verified || user.tiktok_verified) && (
          <SectionCard title="רשתות חברתיות">
            <div style={{ display: 'flex', gap: 8 }}>
              {[
                { key: 'instagram', username: user.instagram_username, verified: user.instagram_verified, url: `https://instagram.com/${user.instagram_username}`, icon: Instagram, color: 'linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)' },
                { key: 'facebook', username: user.facebook_username, verified: user.facebook_verified, url: `https://facebook.com/${user.facebook_username}`, icon: Facebook, color: '#1877F2' },
                { key: 'tiktok', username: user.tiktok_username, verified: user.tiktok_verified, url: `https://tiktok.com/@${user.tiktok_username}`, icon: Music2, color: 'linear-gradient(135deg, #25F4EE, #000000, #FE2C55)' },
              ].filter(p => p.username && p.verified).map(p => (
                <a key={p.key} href={p.url} target="_blank" rel="noopener noreferrer"
                  style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: '10px 4px', borderRadius: 14, textDecoration: 'none', border: '1px solid #fde68a', background: '#fffbeb' }}>
                  <div style={{ position: 'relative', width: 36, height: 36, borderRadius: 10, background: p.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <p.icon size={18} color="white" />
                    <span style={{ position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: '50%', background: '#d97706', border: '2px solid var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ShieldCheck size={9} color="white" /></span>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#d97706' }}>מאומת</span>
                </a>
              ))}
            </div>
          </SectionCard>
        )}

        {/* Cities */}
        {user.preferred_cities?.length > 0 && (
          <SectionCard title="אזורי פעילות">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {user.preferred_cities.map(c => (
                <span key={c} style={{ fontSize: 13, background: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd', padding: '5px 14px', borderRadius: 20, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <MapPin size={11} /> {c}
                </span>
              ))}
            </div>
          </SectionCard>
        )}

        {/* Categories */}
        {user.preferred_categories?.length > 0 && (
          <SectionCard title="תחומי עיסוק">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {user.preferred_categories.map(c => (
                <span key={c} style={{ fontSize: 13, background: '#eff6ff', color: '#1a6fd4', border: '1px solid #bfdbfe', padding: '5px 14px', borderRadius: 20, fontWeight: 600 }}>
                  {getCategoryLabel(c)}
                </span>
              ))}
            </div>
          </SectionCard>
        )}

        {/* Certificates (unified) */}
        {(user.certificates?.length > 0 || user.certificate_files?.length > 0) && (
          <SectionCard title="תעודות מקצוע">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {(user.certificate_files || []).map(doc => (
                <a key={doc.url} href={doc.url} target="_blank" rel="noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '10px 12px', textDecoration: 'none' }}>
                  <FileText size={16} color="#16a34a" />
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: '#166534', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</span>
                  <span style={{ fontSize: 11, color: '#86efac' }}>לצפייה ›</span>
                </a>
              ))}
              {user.certificates?.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {user.certificates.map(cert => (
                    <span key={cert} style={{ fontSize: 13, background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', padding: '5px 14px', borderRadius: 20, fontWeight: 600 }}>
                      ✅ {cert}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </SectionCard>
        )}

        {/* Unified History & Reviews button */}
        {(completedTasks.length > 0 || allReviews.length > 0) && (
          <div style={{ background: 'var(--surface-2)', borderRadius: 18, border: '1px solid var(--border-1)', overflow: 'hidden' }}>
            <button onClick={() => setShowUnifiedHistory(true)}
              style={{ all: 'unset', width: '100%', boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', cursor: 'pointer' }}
              onPointerDown={e => { e.currentTarget.style.background = 'var(--surface-3)'; }}
              onPointerUp={e => { e.currentTarget.style.background = ''; }}
              onPointerLeave={e => { e.currentTarget.style.background = ''; }}
            >
              <div style={{ width: 42, height: 42, borderRadius: 13, background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Clock size={18} color="#7c3aed" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>היסטוריה וביקורות</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{completedTasks.length} משימות · {allReviews.length} ביקורות · {avgRating !== '—' ? `${avgRating}★ ממוצע` : ''}</div>
              </div>
              <ChevronLeft size={16} color="var(--text-3)" />
            </button>
          </div>
        )}

        {/* Empty */}
        {!user.bio && !user.preferred_categories?.length && completedTasks.length === 0 && allReviews.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-3)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
            <div style={{ fontSize: 15, fontWeight: 700 }}>המשתמש טרם מילא פרטי פרופיל</div>
          </div>
        )}

        <div style={{ height: 16 }} />
      </div>

      {/* ── Unified History & Reviews Sheet ── */}
      {showUnifiedHistory && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => setShowUnifiedHistory(false)}>
          <div style={{ background: 'var(--surface-2)', borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 480, maxHeight: '82vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 12px', borderBottom: '1px solid var(--border-1)' }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-1)' }}>היסטוריה וביקורות</span>
              <button onClick={() => setShowUnifiedHistory(false)} style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--surface-3)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={16} color="#64748b" />
              </button>
            </div>
            <div style={{ overflowY: 'auto', padding: '16px 20px 32px' }} dir="rtl">
              <TaskReviewHistory tasks={completedTasks} reviews={allReviews} />
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}