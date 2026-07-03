import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Star, MapPin, FileText, ChevronLeft, Loader2, Clock, X, Phone, Instagram, Facebook, Music2, ShieldCheck, ExternalLink } from 'lucide-react';
import VerifiedBadge from '@/components/VerifiedBadge';
import TrustCard from '@/components/TrustCard';
import ProfileMediaGallery from '@/components/ProfileMediaGallery';
import { getCategoryLabel } from '@/lib/categories';
import { calculateTrustScore, getTrustLevel } from '@/lib/trustScore';

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

  const [showTaskHistory, setShowTaskHistory] = useState(false);
  const [showAllReviews, setShowAllReviews] = useState(false);

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
          {user.is_verified && <VerifiedBadge size="md" />}
        </div>
        {user.preferred_categories?.length > 0 && (
          <div className="profile-cat-scroll" style={{ display: 'flex', gap: 4, overflowX: 'auto', scrollbarWidth: 'none', maxWidth: '100%', padding: '0 4px' }}>
            <style>{`.profile-cat-scroll::-webkit-scrollbar{display:none}`}</style>
            {user.preferred_categories.map(cat => (
              <span key={cat} style={{ fontSize: 11, fontWeight: 700, color: '#1a6fd4', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 99, padding: '2px 8px', flexShrink: 0, whiteSpace: 'nowrap' }}>{getCategoryLabel(cat)}</span>
            ))}
          </div>
        )}



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

        {/* Bio + Intro Video */}
        {(user.bio || user.intro_video_url) && (
          <SectionCard title="אודות">
            {user.bio && <p style={{ fontSize: 14, color: 'var(--text-1)', lineHeight: 1.65, margin: 0, marginBottom: user.intro_video_url ? 12 : 0 }}>{user.bio}</p>}
            {user.intro_video_url && (
              <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid var(--border-1)' }}>
                <video src={user.intro_video_url} controls style={{ width: '100%', maxHeight: 280, display: 'block', background: '#000' }} />
              </div>
            )}
          </SectionCard>
        )}

        {/* Media Gallery */}
        {user.profile_media?.length > 0 && (
          <SectionCard title="גלריית מדיה">
            <ProfileMediaGallery media={user.profile_media} isEditing={false} />
          </SectionCard>
        )}

        {/* Social Links — shown if any username exists */}
        {(user.instagram_username || user.facebook_username || user.tiktok_username) && (
          <SectionCard title="רשתות חברתיות">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {user.instagram_username && (
                <a href={`https://instagram.com/${user.instagram_username}`} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
                  <div style={{ width: 38, height: 38, borderRadius: 11, background: 'linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Instagram size={18} color="white" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>@{user.instagram_username}</span>
                      {user.instagram_verified && <ShieldCheck size={13} color="#059669" />}
                    </div>
                    <div style={{ fontSize: 10, color: user.instagram_verified ? '#059669' : 'var(--text-3)', fontWeight: 600 }}>
                      {user.instagram_verified ? 'מאומת' : 'מחובר'}
                    </div>
                  </div>
                  <ExternalLink size={14} color="var(--text-3)" />
                </a>
              )}
              {user.facebook_username && (
                <a href={`https://facebook.com/${user.facebook_username}`} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
                  <div style={{ width: 38, height: 38, borderRadius: 11, background: '#1877F2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Facebook size={18} color="white" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>@{user.facebook_username}</span>
                      {user.facebook_verified && <ShieldCheck size={13} color="#059669" />}
                    </div>
                    <div style={{ fontSize: 10, color: user.facebook_verified ? '#059669' : 'var(--text-3)', fontWeight: 600 }}>
                      {user.facebook_verified ? 'מאומת' : 'מחובר'}
                    </div>
                  </div>
                  <ExternalLink size={14} color="var(--text-3)" />
                </a>
              )}
              {user.tiktok_username && (
                <a href={`https://tiktok.com/@${user.tiktok_username}`} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none' }}>
                  <div style={{ width: 38, height: 38, borderRadius: 11, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Music2 size={18} color="white" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)' }}>@{user.tiktok_username}</span>
                      {user.tiktok_verified && <ShieldCheck size={13} color="#059669" />}
                    </div>
                    <div style={{ fontSize: 10, color: user.tiktok_verified ? '#059669' : 'var(--text-3)', fontWeight: 600 }}>
                      {user.tiktok_verified ? 'מאומת' : 'מחובר'}
                    </div>
                  </div>
                  <ExternalLink size={14} color="var(--text-3)" />
                </a>
              )}
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

        {/* History & Reviews menu buttons */}
        {(completedTasks.length > 0 || allReviews.length > 0) && (
          <div style={{ background: 'var(--surface-2)', borderRadius: 18, border: '1px solid var(--border-1)', overflow: 'hidden' }}>
            {completedTasks.length > 0 && (
              <button onClick={() => setShowTaskHistory(true)}
                style={{ all: 'unset', width: '100%', boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', cursor: 'pointer' }}
                onPointerDown={e => { e.currentTarget.style.background = 'var(--surface-3)'; }}
                onPointerUp={e => { e.currentTarget.style.background = ''; }}
                onPointerLeave={e => { e.currentTarget.style.background = ''; }}
              >
                <div style={{ width: 42, height: 42, borderRadius: 13, background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Clock size={18} color="#7c3aed" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>היסטוריית משימות</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{completedTasks.length} משימות הושלמו</div>
                </div>
                <ChevronLeft size={16} color="var(--text-3)" />
              </button>
            )}
            {completedTasks.length > 0 && allReviews.length > 0 && <div style={{ height: 1, background: 'var(--border-1)', margin: '0 16px' }} />}
            {allReviews.length > 0 && (
              <button onClick={() => setShowAllReviews(true)}
                style={{ all: 'unset', width: '100%', boxSizing: 'border-box', display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', cursor: 'pointer' }}
                onPointerDown={e => { e.currentTarget.style.background = 'var(--surface-3)'; }}
                onPointerUp={e => { e.currentTarget.style.background = ''; }}
                onPointerLeave={e => { e.currentTarget.style.background = ''; }}
              >
                <div style={{ width: 42, height: 42, borderRadius: 13, background: '#fffbeb', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Star size={18} color="#f59e0b" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-1)' }}>ביקורות</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{allReviews.length} ביקורות · {avgRating !== '—' ? `${avgRating}★ ממוצע` : ''}</div>
                </div>
                <ChevronLeft size={16} color="var(--text-3)" />
              </button>
            )}
          </div>
        )}

        {/* Categories (moved to bottom) */}
        {user.preferred_categories?.length > 0 && (
          <SectionCard title="תחומי עיסוק">
            <div className="profile-cat-scroll" style={{ display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none', paddingBottom: 4 }}>
              <style>{`.profile-cat-scroll::-webkit-scrollbar{display:none}`}</style>
              {user.preferred_categories.map(c => (
                <span key={c} style={{ fontSize: 13, background: '#eff6ff', color: '#1a6fd4', border: '1px solid #bfdbfe', padding: '5px 14px', borderRadius: 20, fontWeight: 600, flexShrink: 0, whiteSpace: 'nowrap' }}>
                  {getCategoryLabel(c)}
                </span>
              ))}
            </div>
          </SectionCard>
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

      {/* ── Task History Sheet ── */}
      {showTaskHistory && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => setShowTaskHistory(false)}>
          <div style={{ background: 'var(--surface-2)', borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 480, maxHeight: '82vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 12px', borderBottom: '1px solid var(--border-1)' }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-1)' }}>היסטוריית משימות ({completedTasks.length})</span>
              <button onClick={() => setShowTaskHistory(false)} style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--surface-3)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={16} color="#64748b" />
              </button>
            </div>
            <div style={{ overflowY: 'auto', padding: '16px 20px 32px', display: 'flex', flexDirection: 'column', gap: 0 }} dir="rtl">
              {completedTasks.map((task, idx, arr) => {
                const date = new Date(task.completed_at || task.updated_date);
                const diffDays = Math.floor((Date.now() - date.getTime()) / 86400000);
                const dateLabel = diffDays === 0 ? 'היום' : diffDays === 1 ? 'אתמול' : diffDays < 7 ? `לפני ${diffDays} ימים` : date.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' });
                return (
                  <div key={task.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, paddingTop: idx > 0 ? 14 : 0, paddingBottom: idx < arr.length - 1 ? 14 : 0, borderTop: idx > 0 ? '1px solid var(--border-1)' : 'none' }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#dcfce7', border: '2px solid #16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 10, color: '#16a34a', fontWeight: 900 }}>✓</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-1)', lineHeight: 1.3 }}>{task.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 3 }}>{dateLabel}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── All Reviews Sheet ── */}
      {showAllReviews && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => setShowAllReviews(false)}>
          <div style={{ background: 'var(--surface-2)', borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 480, maxHeight: '82vh', display: 'flex', flexDirection: 'column' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 12px', borderBottom: '1px solid var(--border-1)' }}>
              <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-1)' }}>ביקורות ({allReviews.length})</span>
              <button onClick={() => setShowAllReviews(false)} style={{ width: 32, height: 32, borderRadius: 10, background: 'var(--surface-3)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={16} color="#64748b" />
              </button>
            </div>
            <div style={{ overflowY: 'auto', padding: '12px 20px 32px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {allReviews.map(review => (
                <div key={review.id} style={{ background: 'var(--surface-3)', borderRadius: 14, padding: '14px', border: '1px solid var(--border-1)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 6 }}>
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star key={s} size={12} className={s <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200 fill-gray-200'} />
                    ))}
                    <span style={{ fontSize: 10, color: 'var(--text-3)', marginRight: 'auto' }}>{review.role === 'worker' ? 'מלקוח' : 'ממבצע'}</span>
                  </div>
                  {review.comment && <p style={{ fontSize: 13, color: 'var(--text-1)', lineHeight: 1.6, margin: 0 }}>{review.comment}</p>}
                  <ReviewChips review={review} />
                </div>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}