import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, X, Save, Loader2, Star, Upload, FileText, Trash2, ChevronLeft, Phone, Video, Play } from 'lucide-react';
import VerifiedBadge from '@/components/VerifiedBadge';
import GoldBadge from '@/components/GoldBadge';
import ProfileMediaGallery from '@/components/ProfileMediaGallery';
import ProfileAvatar from '@/components/profile/ProfileAvatar';
import ProfilePhotosEditor from '@/components/profile/ProfilePhotosEditor';
import TaskReviewHistory from '@/components/TaskReviewHistory';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getCategoryLabel } from '@/lib/categories';
import { useProfessionalScope } from '@/lib/brand/professionalScope';
import ProfessionalCategoryPicker from '@/components/ProfessionalCategoryPicker';
import { ISRAELI_CITIES } from '@/lib/israeliCities';
import { getCityLabel } from '@/lib/cityLabels';
import { toast } from 'sonner';
import { useLanguage } from '@/lib/LanguageContext';
import { useAuth } from '@/lib/AuthContext';
import InlineNameField from '@/components/profile/InlineNameField';
import { getDisplayName, validateDisplayName } from '@/lib/displayName';

const INITIAL_CITIES_COUNT = 12;
const MAX_PROFILE_PHOTOS = 6;

function SectionCard({ title, children, style }) {
  return (
    <div style={{ background: 'var(--brand-card-bg, var(--surface-2))', borderRadius: 18, border: '1px solid var(--border-1)', overflow: 'hidden', ...style }}>
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
  const { t } = useLanguage();
  // One neutral treatment for every attribute. Five different colours turned a
  // list of facts about the review into a rainbow — the colour carried no
  // meaning, it only decorated. A single quiet tag keeps the row readable and
  // leaves the star rating as the one thing on the card that is coloured.
  const chips = [
    review.arrived_on_time && t('arrived_on_time'),
    review.professional && t('professional'),
    review.good_communication && t('rc_communication'),
    review.fair_pricing && t('fair_pricing'),
    review.would_hire_again && t('recommended'),
  ].filter(Boolean);
  if (!chips.length) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
      {chips.map(label => (
        <span key={label} style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-2)', background: 'var(--surface-3)', borderRadius: 99, padding: '2px 8px' }}>{label}</span>
      ))}
    </div>
  );
}

export default function WorkerProfile() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t, isRTL, lang } = useLanguage();
  // The Brand's professional scope. Editing a profile offers only the services
  // this Brand provides; viewing someone shows only the in-scope ones.
  const scope = useProfessionalScope();
  const { refreshUser } = useAuth();
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
    // Deliberately NOT ['workerTasks', id]: the private profile page uses that
    // key for its own completed-only list, and two different queryFns under one
    // key means one screen silently overwrites the other's data.
    queryKey: ['userWorkerTasks', currentUser?.id],
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
  const [showAllCities, setShowAllCities] = useState(false);
  const [nameError, setNameError] = useState(null);
  const [addingPhoto, setAddingPhoto] = useState(false);
  const certDocRef = useRef(null);
  const videoInputRef = useRef(null);
  const addPhotoRef = useRef(null);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.auth.updateMe({ profile_photo: file_url });
    queryClient.invalidateQueries({ queryKey: ['me'] });
    setUploadingPhoto(false);
  };

  // The small "+" beside the profile picture — the quick way to add a photo to
  // the profile gallery without scrolling down to its own section.
  const handleAddProfilePhoto = async (e) => {
    const files = Array.from(e.target.files || []);
    if (addPhotoRef.current) addPhotoRef.current.value = '';
    if (!files.length) return;
    const room = MAX_PROFILE_PHOTOS - (form?.profile_photos?.length || 0);
    if (room <= 0) { toast.error(t('pph_too_many', { n: MAX_PROFILE_PHOTOS })); return; }
    setAddingPhoto(true);
    try {
      const added = [];
      for (const file of files.slice(0, room)) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        added.push(file_url);
      }
      if (added.length) setForm(f => ({ ...f, profile_photos: [...(f.profile_photos || []), ...added] }));
    } catch {
      toast.error(t('pph_upload_error'));
    }
    setAddingPhoto(false);
  };

  const handleVideoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      toast.error(t('wp_video_too_large'));
      return;
    }
    setUploadingVideo(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm(f => ({ ...f, intro_video_url: file_url }));
    } catch {
      toast.error(t('wp_video_upload_error'));
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

  // Viewing someone else: their own professions, read-only. Editing uses the
  // shared picker below — the same one the first-run worker flow offers, so the
  // two screens can never offer different categories.
  const viewedCategories = isViewingOther
    ? scope.filter(currentUser?.preferred_categories || []).map(k => ({ value: k, label: scope.label(k, t) }))
    : [];

  if (currentUser && !form) {
    setForm({
      bio: currentUser.bio || '',
      phone: currentUser.phone || '',
      intro_video_url: currentUser.intro_video_url || '',
      profile_photos: currentUser.profile_photos || [],
      certificate_files: currentUser.certificate_files || [],
      profile_media: [
        ...(currentUser.intro_video_url ? [{ type: 'video', url: currentUser.intro_video_url }] : []),
        ...(currentUser.profile_media || [])
      ],
      preferred_categories: currentUser.preferred_categories || [],
      preferred_cities: currentUser.preferred_cities || [],
      display_name: getDisplayName(currentUser),
    });
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const name = validateDisplayName(form.display_name).name;
      await base44.auth.updateMe({ ...form, display_name: name });
      // Keep the name snapshotted on this user's still-open tasks in sync, so the
      // feed and active chats show it immediately. Tasks that already ended keep
      // the name they were published under (invoices and history must not change
      // retroactively).
      if (name !== getDisplayName(currentUser)) {
        try {
          await base44.entities.Task.updateMany(
            { client_id: currentUser.id, status: 'OPEN' },
            { $set: { client_name: name } }
          );
          await base44.entities.Task.updateMany(
            { worker_id: currentUser.id, status: 'OPEN' },
            { $set: { worker_name: name } }
          );
        } catch (backfillErr) {
          console.error('[WorkerProfile] task name refresh failed:', backfillErr?.message);
        }
      }
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      // Refresh AuthContext's user so Profile.jsx (which reads authUser) shows
      // newly-saved certificate_files / media immediately, without waiting for
      // the 120s polling cycle.
      await refreshUser();
      toast.success(t('wp_profile_updated'));
      navigate('/profile');
    },
  });

  const handleSave = () => {
    const check = validateDisplayName(form.display_name);
    if (!check.ok) {
      setNameError(check.error);
      return;
    }
    setNameError(null);
    saveMutation.mutate();
  };

  if (isViewingOther && !currentUser) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh' }}>
      <Loader2 size={28} className="animate-spin" color="var(--brand-primary)" />
    </div>
  );

  if (!form) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh' }}>
      <Loader2 size={28} className="animate-spin" color="var(--brand-primary)" />
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
  const initials = (form.display_name || currentUser?.full_name || '').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';

  const hasCerts = (form.certificate_files || []).length > 0 || (currentUser?.certificates || []).length > 0;

  return (
    <div style={{ background: 'var(--surface-1)', paddingBottom: 40 }} dir={isRTL ? 'rtl' : 'ltr'}>

      {/* ── Header — sticky along the whole page ── */}
      <div style={{ position: 'sticky', top: 0, zIndex: 50, background: 'var(--brand-header-bg, var(--surface-2))', borderBottom: '1px solid var(--border-1)', padding: '14px 20px 12px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate(-1)} style={{ width: 36, height: 36, borderRadius: 11, background: 'var(--surface-3)', border: '1px solid var(--border-1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
          <ChevronLeft size={18} color="var(--text-2)" style={{ transform: 'rotate(180deg)' }} />
        </button>
        <span style={{ fontSize: 17, fontWeight: 800, color: 'var(--brand-header-text, var(--text-1))', flex: 1 }}>
          {isViewingOther ? (currentUser?.full_name || t('wp_worker_profile')) : t('wp_edit_profile')}
        </span>
        {!isViewingOther && (
          <button
            onClick={handleSave}
            disabled={saveMutation.isPending}
            style={{ height: 36, paddingInline: 18, borderRadius: 20, background: 'linear-gradient(135deg,var(--brand-btn-primary-bg, var(--brand-primary)),var(--brand-btn-primary-bg, var(--brand-primary-dark)))', border: 'none', color: 'white', fontWeight: 800, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            {saveMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <><Save size={14} /> {t('wp_save')}</>}
          </button>
        )}
      </div>

      {/* ── Avatar block (both view modes) ── */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '28px 20px 22px', background: 'var(--brand-card-bg, var(--surface-2))', borderBottom: '1px solid var(--border-1)' }}>
        <div style={{ position: 'relative', marginBottom: 14 }}>
          <ProfileAvatar
            user={currentUser}
            size={64}
            textSize={22}
            editable={!isViewingOther}
            onUpload={handlePhotoUpload}
            uploading={uploadingPhoto}
            background="linear-gradient(135deg,var(--brand-btn-primary-bg, var(--brand-primary)),var(--brand-btn-primary-bg, var(--brand-primary-dark)))"
            borderColor="transparent"
          />

          {/* One small "+" on the other side of the picture: the shortcut for
              adding a photo, right where the picture is. */}
          {!isViewingOther && (
            <>
              <button
                className="j-icon-btn"
                onClick={() => addPhotoRef.current?.click()}
                disabled={addingPhoto}
                aria-label={t('pph_add')}
                style={{
                  position: 'absolute', top: '50%', transform: 'translateY(-50%)',
                  ...(isRTL ? { right: 'calc(100% + 8px)' } : { left: 'calc(100% + 8px)' }),
                  width: 30, height: 30, borderRadius: '50%',
                  background: 'var(--surface-3)', border: '1px solid var(--border-2)',
                  color: 'var(--brand-primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: addingPhoto ? 'not-allowed' : 'pointer', padding: 0,
                }}
              >
                {addingPhoto ? <Loader2 size={15} className="animate-spin" /> : <Plus size={17} />}
              </button>
              <input ref={addPhotoRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleAddProfilePhoto} />
            </>
          )}
        </div>

        {isViewingOther ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 18, fontWeight: 900, color: 'var(--text-1)' }}>{getDisplayName(currentUser)}</span>
            {currentUser?.is_verified && (currentUser?.instagram_verified || currentUser?.facebook_verified || currentUser?.tiktok_verified)
              ? <GoldBadge size="md" />
              : currentUser?.is_verified && <VerifiedBadge size="md" />}
          </div>
        ) : (
          <>
            <InlineNameField
              value={form.display_name}
              onChange={(v) => { setForm(f => ({ ...f, display_name: v })); setNameError(null); }}
              error={nameError}
              placeholder={t('wp_full_name')}
            />
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 8, textAlign: 'center', lineHeight: 1.5, maxWidth: 320 }}>{t('wp_full_name_hint')}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}>
              {currentUser?.is_verified && (currentUser?.instagram_verified || currentUser?.facebook_verified || currentUser?.tiktok_verified)
                ? <GoldBadge size="md" />
                : currentUser?.is_verified && <VerifiedBadge size="md" />}
            </div>
          </>
        )}
        {/* Mini stats */}
        {isViewingOther && (
          <div style={{ display: 'flex', gap: 0, marginTop: 16, background: 'var(--surface-3)', borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border-1)', width: '100%', maxWidth: 300 }}>
            {[
              { value: completedCount, label: t('credits') },
              { value: avgRating ? `${avgRating}★` : '—', label: t('rating') },
              { value: workerReviews.length, label: t('pp_reviews') },
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

        {/* ── Profile photos — what the avatar lightbox swipes through ── */}
        {!isViewingOther && (
          <SectionCard title={t('pph_title')}>
            <ProfilePhotosEditor
              photos={form.profile_photos}
              onChange={(next) => setForm(f => ({ ...f, profile_photos: next }))}
            />
          </SectionCard>
        )}

        {/* ── About: bio + intro video + phone (edit mode) ── */}
        {!isViewingOther && (
          <SectionCard title={t('pr_about')}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Textarea
                placeholder={t('wp_about_ph')}
                value={form.bio}
                onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                className="bg-secondary border-0 rounded-xl resize-none"
                rows={3}
              />
              <Input
                placeholder={t('wp_phone_ph')}
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
          <SectionCard title={t('pr_about')}>
            <p style={{ fontSize: 14, color: 'var(--text-1)', lineHeight: 1.65, margin: 0 }}>{form.bio}</p>
          </SectionCard>
        )}

        {/* ── Media Gallery (unified with intro video) ── */}
        {(!isViewingOther || (form.profile_media || []).length > 0) && (
          <SectionCard title={t('pr_media_gallery')}>
            <ProfileMediaGallery
              media={form.profile_media}
              isEditing={!isViewingOther}
              onChange={(newMedia) => setForm(f => ({ ...f, profile_media: newMedia }))}
              subtitle=""
            />
          </SectionCard>
        )}

        {/* Phone — revealed only for approved worker on caller's task */}
        {isViewingOther && currentUser?.phone && (
          <SectionCard title={t('wp_contact')}>
            <a href={`tel:${currentUser.phone}`} dir="ltr" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
              <div style={{ width: 38, height: 38, borderRadius: 11, background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Phone size={18} color="var(--text-2)" />
              </div>
              {/* The number is the action here, so it is the only coloured thing. */}
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--brand-primary)' }}>{currentUser.phone}</span>
            </a>
          </SectionCard>
        )}

        {/* ── Categories ── */}
        <SectionCard title={t('wp_task_types')}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {/* Only the professions this Brand offers, translated, and only at
                the top level — the deep services belong to the task form.
                Editing here never removes a global category the user already
                has outside this scope. */}
            {isViewingOther ? (
              viewedCategories.map(c => (
                <span key={c.value} style={{
                  padding: '7px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600,
                  background: 'var(--brand-status-bg, var(--surface-3))',
                  color: 'var(--brand-status-text, var(--text-2))',
                  border: '1px solid var(--border-1)',
                }}>{c.label}</span>
              ))
            ) : (
              <ProfessionalCategoryPicker
                selected={form.preferred_categories}
                onToggle={toggleCategory}
              />
            )}
          </div>
        </SectionCard>

        {/* ── Unified Certificates section ── */}
        {(!isViewingOther || hasCerts) && (
          <SectionCard title={t('pr_certs')}>
            <input ref={certDocRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={handleCertDocUpload} />
            {/* Certificate files (unified) */}
            {(form.certificate_files || []).length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: !isViewingOther ? 10 : 0 }}>
                {form.certificate_files.map(doc => (
                  <div key={doc.url} style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface-3)', border: '1px solid var(--border-1)', borderRadius: 12, padding: '8px 10px' }}>
                    <FileText size={16} color="var(--text-2)" style={{ flexShrink: 0 }} />
                    {!isViewingOther ? (
                      <input
                        value={doc.name}
                        onChange={e => updateCertDocName(doc.url, e.target.value)}
                        placeholder={t('wp_cert_name_ph')}
                        style={{ flex: 1, border: 'none', background: 'transparent', fontSize: 13, fontWeight: 700, color: 'var(--text-1)', outline: 'none', fontFamily: 'inherit' }}
                      />
                    ) : (
                      <a href={doc.url} target="_blank" rel="noreferrer" style={{ flex: 1, fontSize: 13, fontWeight: 700, color: 'var(--text-1)', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</a>
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
                  <span key={cert} style={{ fontSize: 13, background: 'var(--surface-3)', color: 'var(--text-1)', border: '1px solid var(--border-1)', padding: '5px 12px', borderRadius: 20, fontWeight: 600 }}>
                    {cert}
                  </span>
                ))}
              </div>
            )}
            {/* Empty state hint (edit mode) */}
            {!isViewingOther && (form.certificate_files || []).length === 0 && (
              <div style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'center', marginBottom: 8 }}>{t('wp_upload_certs_hint')}</div>
            )}
            {/* Upload button (edit mode) */}
            {!isViewingOther && (
              <button onClick={() => certDocRef.current?.click()} disabled={uploadingDoc}
                style={{ width: '100%', height: 46, borderRadius: 12, border: '2px dashed var(--border-2)', background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', color: 'var(--brand-primary)', fontWeight: 700, fontSize: 13 }}>
                {uploadingDoc ? <Loader2 size={16} className="animate-spin" /> : <><Upload size={16} /> {t('wp_upload_cert')}</>}
              </button>
            )}
          </SectionCard>
        )}

        {/* ── Cities ── */}
        <SectionCard title={t('wp_cities_for_tasks')}>
          {(() => {
            const priorityCities = ISRAELI_CITIES.slice(0, INITIAL_CITIES_COUNT);
            const restCities = ISRAELI_CITIES.slice(INITIAL_CITIES_COUNT);
            const customCities = (form.preferred_cities || []).filter(c => !ISRAELI_CITIES.includes(c));
            const visibleCities = showAllCities
              ? [...ISRAELI_CITIES, ...customCities]
              : [...priorityCities, ...customCities.filter(c => !priorityCities.includes(c))];
            const hasMore = !showAllCities && (restCities.length > 0 || customCities.length > 0);
            return (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {visibleCities.map(c => {
                  const sel = form.preferred_cities.includes(c);
                  return (
                    <button key={c}
                      onClick={() => !isViewingOther && toggleCity(c)}
                      disabled={isViewingOther}
                      style={{
                        padding: '7px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, border: '1px solid', cursor: isViewingOther ? 'default' : 'pointer', transition: 'all 0.15s',
                        background: sel ? 'var(--brand-primary)' : 'var(--surface-3)',
                        color: sel ? 'var(--brand-btn-primary-text, white)' : 'var(--text-2)',
                        borderColor: sel ? 'var(--brand-primary)' : 'var(--border-1)',
                      }}
                    >{getCityLabel(c, lang)}</button>
                  );
                })}
                {hasMore && !isViewingOther && (
                  <button
                    onClick={() => setShowAllCities(true)}
                    style={{
                      padding: '7px 14px', borderRadius: 20, fontSize: 13, fontWeight: 700, border: '1px dashed var(--border-2)', cursor: 'pointer', transition: 'all 0.15s',
                      background: 'var(--brand-card-bg, var(--surface-2))', color: 'var(--brand-primary)',
                    }}
                  >{t('wp_more_cities')}</button>
                )}
                {showAllCities && !isViewingOther && (
                  <button
                    onClick={() => setShowAllCities(false)}
                    style={{
                      padding: '7px 14px', borderRadius: 20, fontSize: 13, fontWeight: 700, border: '1px dashed var(--border-2)', cursor: 'pointer', transition: 'all 0.15s',
                      background: 'var(--brand-card-bg, var(--surface-2))', color: 'var(--text-3)',
                    }}
                  >{t('wp_show_less')}</button>
                )}
              </div>
            );
          })()}
        </SectionCard>

        {/* ── Unified History & Reviews (viewing other) ── */}
        {isViewingOther && (completedCount > 0 || workerReviews.length > 0) && (
          <SectionCard title={t('pr_history_count').replace('{n}', completedCount).replace('{m}', workerReviews.length)}>
            <TaskReviewHistory tasks={workerTasks.filter(t => t.status === 'COMPLETED')} reviews={workerReviews} />
          </SectionCard>
        )}

        <div style={{ height: 16 }} />
      </div>
    </div>
  );
}