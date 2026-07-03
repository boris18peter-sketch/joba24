import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, X, Save, Loader2, Star, Upload, FileText, Trash2, Camera, ChevronLeft, Phone, Video, Play } from 'lucide-react';
import VerifiedBadge from '@/components/VerifiedBadge';
import ProfileMediaGallery from '@/components/ProfileMediaGallery';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CATEGORIES, getCategoryLabel } from '@/lib/categories';
import { toast } from 'sonner';

const CITIES = ['תל אביב', 'ירושלים', 'חיפה', 'באר שבע', 'ראשון לציון', 'פתח תקווה', 'נתניה', 'הרצליה', 'רמת גן', 'אשדוד'];

function SectionCard({ title, children, style }) {
  return (
    <div style={{ background: 'var(--surface-2)', borderRadius: 18, border: '1px solid var(--border-1)', overflow: 'hidden', ...style }}>
      {title && (
        <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid var(--border-1)' }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-3)', letterSpacing: 0.5, textTransform: 'uppercase' }}>{title}</div>
        </div>
      )}
      <div style={{ padding: '14px 16px' }}>{children}</div>
    </div>
  );
}

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
        <span key={c.label} style={{ fontSize: 10, fontWeight: 700, color: c.color, background: c.bg, border: `1px solid ${c.border}`, borderRadius: 99, padding: '2px 8px' }}>{c.label}</span>
      ))}
    </div>
  );
}

export default function WorkerProfile() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const viewUserId = searchParams.get('id');
  const taskId = searchParams.get('taskId');

  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const { data: viewUser } = useQuery({
    queryKey: ['publicUser', viewUserId, taskId],
    queryFn: async () => {
      if (!viewUserId) return null;
      const res = await base44.functions.invoke('getPublicUserProfile', { userId: viewUserId, taskId });
      return res.data?.user || null;
    },
    enabled: !!viewUserId,
  });

  const isViewingOther = !!viewUserId && viewUserId !== me?.id;
  const currentUser = isViewingOther ? viewUser : me;

  const { data: workerTasks = [] } = useQuery({
    queryKey: ['workerTasks', currentUser?.id],
    queryFn: () => base44.entities.Task.filter({ worker_id: currentUser.id }, '-created_date', 20),
    enabled: !!currentUser?.id,
  });

  const { data: workerReviews = [] } = useQuery({
    queryKey: ['workerReviews', currentUser?.id],
    queryFn: () => base44.entities.Review.filter({ reviewee_id: currentUser.id }, '-created_date', 50),
    enabled: !!currentUser?.id,
  });

  const [form, setForm] = useState(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const certDocRef = useRef(null);
  const photoInputRef = useRef(null);
  const videoInputRef = useRef(null);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.auth.updateMe({ profile_photo: file_url });
    queryClient.invalidateQueries({ queryKey: ['me'] });
    setUploadingPhoto(false);
  };

  const handleVideoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      toast.error('הסרטון גדול מדי (מקסימום 50MB)');
      return;
    }
    setUploadingVideo(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm(f => ({ ...f, intro_video_url: file_url }));
    } catch {
      toast.error('שגיאה בהעלאת הסרטון');
    }
    setUploadingVideo(false);
  };

  const handleCertDocUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingDoc(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(f => ({ ...f, certificate_files: [...(f.certificate_files || []), { name: file.name.replace(/\.[^/.]+$/, ''), url: file_url }] }));
    setUploadingDoc(false);
  };

  const removeCertDoc = (url) => setForm(f => ({ ...f, certificate_files: (f.certificate_files || []).filter(c => c.url !== url) }));
  const updateCertDocName = (url, name) => setForm(f => ({ ...f, certificate_files: (f.certificate_files || []).map(c => c.url === url ? { ...c, name } : c) }));

  if (currentUser && !form) {
    setForm({
      bio: currentUser.bio || '',
      phone: currentUser.phone || '',
      intro_video_url: currentUser.intro_video_url || '',
      certificate_files: currentUser.certificate_files || [],
      profile_media: [
        ...(currentUser.intro_video_url ? [{ type: 'video', url: currentUser.intro_video_url }] : []),
        ...(currentUser.profile_media || [])
      ],
      preferred_categories: currentUser.preferred_categories || [],
      preferred_cities: currentUser.preferred_cities || [],
    });
  }

  const saveMutation = useMutation({
    mutationFn: () => base44.auth.updateMe(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      toast.success('הפרופיל עודכן!');
      navigate('/profile');
    },
  });

  if (isViewingOther && !currentUser) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh' }}>
      <Loader2 size={28} className="animate-spin" color="#1a6fd4" />
    </div>
  );

  if (!form) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh' }}>
      <Loader2 size={28} className="animate-spin" color="#1a6fd4" />
    </div>
  );

  const toggleCategory = (val) => {
    setForm(f => ({ ...f, preferred_categories: f.preferred_categories.includes(val) ? f.preferred_categories.filter(c => c !== val) : [...f.preferred_categories, val] }));
  };
  const toggleCity = (c) => {
    setForm(f => ({ ...f, preferred_cities: f.preferred_cities.includes(c) ? f.preferred_cities.filter(x => x !== c) : [...f.preferred_cities, c] }));
  };

  const completedCount = workerTasks.filter(t => t.status === 'COMPLETED').length;
  const avgRating = workerReviews.length > 0
    ? (workerReviews.reduce((sum, r) => sum + r.rating, 0) / workerReviews.length).toFixed(1)
    : null;
  const initials = currentUser?.full_name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';

  const hasCerts = (form.certificate_files || []).length > 0 || (currentUser?.certificates || []).length > 0;

  return (
    <div style={{ background: 'var(--surface-1)', minHeight: '100dvh', paddingBottom: 40 }} dir="rtl">

      {/* ── Header ── */}
      <div style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border-1)', padding: '14px 20px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate(-1)} style={{ width: 36, height: 36, borderRadius: 11, background: 'var(--surface-3)', border: '1px solid var(--border-1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <ChevronLeft size={18} color="var(--text-2)" style={{ transform: 'rotate(180deg)' }} />
        </button>
        <span style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-1)', flex: 1 }}>
          {isViewingOther ? (currentUser?.full_name || 'פרופיל עובד') : 'עריכת פרופיל'}
        </span>
        {!isViewingOther && (
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            style={{ height: 36, paddingInline: 18, borderRadius: 20, background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)', border: 'none', color: 'white', fontWeight: 800, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {saveMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <><Save size={14} /> שמור</>}
          </button>
        )}
      </div>

      {/* ── Avatar block (both view modes) ── */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '28px 20px 22px', background: 'var(--surface-2)', borderBottom: '1px solid var(--border-1)' }}>
        <div style={{ position: 'relative', marginBottom: 14 }}>
          <div
            onClick={() => !isViewingOther && photoInputRef.current?.click()}
            style={{
              width: 88, height: 88, borderRadius: '50%',
              background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 30, fontWeight: 900, color: 'white',
              overflow: 'hidden', cursor: isViewingOther ? 'default' : 'pointer',
              boxShadow: '0 4px 20px rgba(26,111,212,0.3)',
            }}
          >
            {currentUser?.profile_photo
              ? <img src={currentUser.profile_photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : initials}
          </div>
          {!isViewingOther && (
            <button onClick={() => photoInputRef.current?.click()} style={{ position: 'absolute', bottom: 2, right: 2, width: 26, height: 26, borderRadius: '50%', background: 'white', border: '2px solid #1a6fd4', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 6px rgba(0,0,0,0.15)' }}>
              {uploadingPhoto ? <Loader2 size={12} color="#1a6fd4" className="animate-spin" /> : <Camera size={12} color="#1a6fd4" />}
            </button>
          )}
          <input ref={photoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoUpload} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-1)' }}>{currentUser?.full_name}</span>
          {currentUser?.is_verified && <VerifiedBadge size="md" />}
        </div>
        {/* Mini stats */}
        {isViewingOther && (
          <div style={{ display: 'flex', gap: 0, marginTop: 16, background: 'var(--surface-3)', borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border-1)', width: '100%', maxWidth: 300 }}>
            {[
              { value: completedCount, label: 'ג\'ובות' },
              { value: avgRating ? `${avgRating}★` : '—', label: 'דירוג' },
              { value: workerReviews.length, label: 'ביקורות' },
            ].map((s, i, arr) => (
              <div key={i} style={{ flex: 1, padding: '10px 6px', textAlign: 'center', borderLeft: i < arr.length - 1 ? '1px solid var(--border-1)' : 'none' }}>
                <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--text-1)' }}>{s.value}</div>
                <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ padding: '16px 16px 0', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* ── About: bio + intro video + phone (edit mode) ── */}
        {!isViewingOther && (
          <SectionCard title="אודות">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Textarea
                placeholder="ספר קצת על עצמך, הניסיון שלך..."
                value={form.bio}
                onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                className="bg-secondary border-0 rounded-xl resize-none"
                rows={3}
              />
              <Input
                placeholder="טלפון ליצירת קשר"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                className="bg-secondary border-0 rounded-xl h-12"
                type="tel"
              />
            </div>
          </SectionCard>
        )}

        {/* ── About: view mode (bio only) ── */}
        {isViewingOther && form.bio && (
          <SectionCard title="אודות">
            <p style={{ fontSize: 14, color: 'var(--text-1)', lineHeight: 1.65, margin: 0 }}>{form.bio}</p>
          </SectionCard>
        )}

        {/* ── Media Gallery (unified with intro video) ── */}
        {(!isViewingOther || (form.profile_media || []).length > 0) && (
          <SectionCard title="גלריית מדיה">
            <ProfileMediaGallery
              media={form.profile_media}
              isEditing={!isViewingOther}
              onChange={(newMedia) => setForm(f => ({ ...f, profile_media: newMedia }))}
              subtitle="סרטונים ומדיה שמסבירים עלייך - מגדילים אמון פי 3"
            />
          </SectionCard>
        )}

        {/* Phone — revealed only for approved worker on caller's task */}
        {isViewingOther && currentUser?.phone && (
          <SectionCard title="יצירת קשר">
            <a href={`tel:${currentUser.phone}`} dir="ltr" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
              <div style={{ width: 38, height: 38, borderRadius: 11, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Phone size={18} color="#16a34a" />
              </div>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#16a34a' }}>{currentUser.phone}</span>
            </a>
          </SectionCard>
        )}

        {/* ── Categories ── */}
        <SectionCard title="סוגי משימות">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {CATEGORIES.map(c => {
              const sel = form.preferred_categories.includes(c.value);
              return (
                <button key={c.value}
                  onClick={() => !isViewingOther && toggleCategory(c.value)}
                  disabled={isViewingOther}
                  style={{
                    padding: '7px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, border: '1px solid', cursor: isViewingOther ? 'default' : 'pointer', transition: 'all 0.15s',
                    background: sel ? '#1a6fd4' : 'var(--surface-3)',
                    color: sel ? 'white' : 'var(--text-2)',
                    borderColor: sel ? '#1a6fd4' : 'var(--border-1)',
                  }}
                >{c.label}</button>
              );
            })}
          </div>
        </SectionCard>

        {/* ── Unified Certificates section ── */}
        {(!isViewingOther || hasCerts) && (
          <SectionCard title="תעודות מקצוע">
            <input ref={certDocRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={handleCertDocUpload} />
            {/* Certificate files (unified) */}
            {(form.certificate_files || []).length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: !isViewingOther ? 10 : 0 }}>
                {form.certificate_files.map(doc => (
                  <div key={doc.url} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '8px 10px' }}>
                    <FileText size={16} color="#16a34a" style={{ flexShrink: 0 }} />
                    {!isViewingOther ? (
                      <input
                        value={doc.name}
                        onChange={e => updateCertDocName(doc.url, e.target.value)}
                        placeholder="שם התעודה"
                        style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 13, fontWeight: 700, color: '#166534', outline: 'none', fontFamily: 'inherit' }}
                      />
                    ) : (
                      <a href={doc.url} target="_blank" rel="noreferrer" style={{ flex: 1, fontSize: 13, fontWeight: 700, color: '#166534', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</a>
                    )}
                    {!isViewingOther && (
                      <button onClick={() => removeCertDoc(doc.url)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, flexShrink: 0 }}>
                        <Trash2 size={14} color="#dc2626" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
            {/* Legacy text certificates (view only) */}
            {isViewingOther && (currentUser?.certificates || []).length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {currentUser.certificates.map(cert => (
                  <span key={cert} style={{ fontSize: 13, background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', padding: '5px 12px', borderRadius: 20, fontWeight: 600 }}>
                    ✅ {cert}
                  </span>
                ))}
              </div>
            )}
            {/* Empty state hint (edit mode) */}
            {!isViewingOther && (form.certificate_files || []).length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'center', marginBottom: 8 }}>העלה תעודות מקצוע כדי לבנות אמון</div>
            )}
            {/* Upload button (edit mode) */}
            {!isViewingOther && (
              <button onClick={() => certDocRef.current?.click()} disabled={uploadingDoc}
                style={{ width: '100%', height: 46, borderRadius: 12, border: '2px dashed var(--border-2)', background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', color: '#1a6fd4', fontWeight: 700, fontSize: 13 }}>
                {uploadingDoc ? <Loader2 size={16} className="animate-spin" /> : <><Upload size={16} /> העלה תעודה</>}
              </button>
            )}
          </SectionCard>
        )}

        {/* ── Cities ── */}
        <SectionCard title="ערים לביצוע משימות">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {CITIES.map(c => {
              const sel = form.preferred_cities.includes(c);
              return (
                <button key={c}
                  onClick={() => !isViewingOther && toggleCity(c)}
                  disabled={isViewingOther}
                  style={{
                    padding: '7px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, border: '1px solid', cursor: isViewingOther ? 'default' : 'pointer', transition: 'all 0.15s',
                    background: sel ? '#1a6fd4' : 'var(--surface-3)',
                    color: sel ? 'white' : 'var(--text-2)',
                    borderColor: sel ? '#1a6fd4' : 'var(--border-1)',
                  }}
                >{c}</button>
              );
            })}
          </div>
        </SectionCard>

        {/* ── Task history (viewing other) ── */}
        {isViewingOther && completedCount > 0 && (
          <SectionCard title={`היסטוריית משימות · ${completedCount} הושלמו`}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {workerTasks.filter(t => t.status === 'COMPLETED').slice(0, 6).map((task, idx, arr) => {
                const date = new Date(task.completed_at || task.updated_date);
                const diffDays = Math.floor((Date.now() - date.getTime()) / 86400000);
                const dateLabel = diffDays === 0 ? 'היום' : diffDays === 1 ? 'אתמול' : diffDays < 7 ? `לפני ${diffDays} ימים` : date.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' });
                return (
                  <div key={task.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, paddingTop: idx > 0 ? 12 : 0, paddingBottom: idx < arr.length - 1 ? 12 : 0, borderTop: idx > 0 ? '1px solid var(--border-1)' : 'none' }}>
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#dcfce7', border: '2px solid #16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 10, color: '#16a34a', fontWeight: 900 }}>✓</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', lineHeight: 1.3 }}>{task.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{dateLabel} · ₪{task.price}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        )}

        {/* ── Reviews (viewing other) ── */}
        {isViewingOther && workerReviews.length > 0 && (
          <SectionCard title={`ביקורות · ${workerReviews.length}`}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {workerReviews.slice(0, 5).map((review, i) => (
                <div key={review.id}>
                  {i > 0 && <div style={{ height: 1, background: 'var(--border-1)', marginBottom: 14 }} />}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                    {[1, 2, 3, 4, 5].map(s => (
                      <Star key={s} size={12} className={s <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200 fill-gray-200'} />
                    ))}
                    <span style={{ fontSize: 10, color: 'var(--text-3)', marginRight: 'auto' }}>
                      {new Date(review.created_date).toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: '2-digit' })}
                    </span>
                  </div>
                  {review.comment && <p style={{ fontSize: 13, color: 'var(--text-1)', lineHeight: 1.6, margin: 0 }}>"{review.comment}"</p>}
                  <ReviewChips review={review} />
                </div>
              ))}
            </div>
          </SectionCard>
        )}

        {/* ── Save button (bottom, edit mode) ── */}
        {!isViewingOther && (
          <button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            style={{ width: '100%', height: 56, borderRadius: 18, background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)', border: 'none', color: 'white', fontWeight: 900, fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, boxShadow: '0 6px 20px rgba(26,111,212,0.35)', marginTop: 4 }}
          >
            {saveMutation.isPending ? <Loader2 size={20} className="animate-spin" /> : <><Save size={18} /> שמור פרופיל</>}
          </button>
        )}

        <div style={{ height: 16 }} />
      </div>
    </div>
  );
}