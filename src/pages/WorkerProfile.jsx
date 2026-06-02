import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Plus, X, Save, Loader2, Award, Star, CheckCircle2, Upload, FileText, Trash2, Camera, User } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import TrustBadges from '@/components/TrustBadges';
import TrustCard from '@/components/TrustCard';
import VerifiedBadge from '@/components/VerifiedBadge';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CATEGORIES } from '@/lib/categories';
import { toast } from 'sonner';
import TaskCard from '@/components/TaskCard';

const CITIES = ['תל אביב', 'ירושלים', 'חיפה', 'באר שבע', 'ראשון לציון', 'פתח תקווה', 'נתניה', 'הרצליה', 'רמת גן', 'אשדוד'];

export default function WorkerProfile() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const viewUserId = searchParams.get('id');
  
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });
  const { data: viewUser } = useQuery({
    queryKey: ['user', viewUserId],
    queryFn: async () => {
      if (!viewUserId) return null;
      const users = await base44.entities.User.list();
      return users.find(u => u.id === viewUserId);
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
  const [newCert, setNewCert] = useState('');
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const certDocRef = useRef(null);
  const photoInputRef = useRef(null);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await base44.auth.updateMe({ profile_photo: file_url });
    queryClient.invalidateQueries({ queryKey: ['me'] });
    setUploadingPhoto(false);
  };

  const handleCertDocUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingDoc(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setForm(f => ({ ...f, certificate_files: [...(f.certificate_files || []), { name: file.name, url: file_url }] }));
    setUploadingDoc(false);
  };

  const removeCertDoc = (url) => setForm(f => ({ ...f, certificate_files: (f.certificate_files || []).filter(c => c.url !== url) }));

  // Initialize form when currentUser loads
  if (currentUser && !form) {
    setForm({
      bio: currentUser.bio || '',
      phone: currentUser.phone || '',
      profession: currentUser.profession || '',
      certificates: currentUser.certificates || [],
      certificate_files: currentUser.certificate_files || [],
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

  if (isViewingOther && !currentUser) {
    return <div className="flex items-center justify-center h-screen"><Loader2 className="w-8 h-8 animate-spin" /></div>;
  }

  const toggleCategory = (val) => {
    setForm(f => ({
      ...f,
      preferred_categories: f.preferred_categories.includes(val)
        ? f.preferred_categories.filter(c => c !== val)
        : [...f.preferred_categories, val]
    }));
  };

  const toggleCity = (c) => {
    setForm(f => ({
      ...f,
      preferred_cities: f.preferred_cities.includes(c)
        ? f.preferred_cities.filter(x => x !== c)
        : [...f.preferred_cities, c]
    }));
  };

  const addCert = () => {
    if (!newCert.trim()) return;
    setForm(f => ({ ...f, certificates: [...f.certificates, newCert.trim()] }));
    setNewCert('');
  };

  const removeCert = (cert) => setForm(f => ({ ...f, certificates: f.certificates.filter(c => c !== cert) }));

  if (!form) return <div className="flex items-center justify-center h-screen"><Loader2 className="w-8 h-8 animate-spin" /></div>;

  const workerScore = currentUser?.worker_score || 0;

  return (
    <div className="min-h-screen" dir="rtl">
      <PageHeader title={isViewingOther ? (currentUser?.full_name || 'פרופיל עובד') : 'פרופיל שלי'} />

      <div className="px-4 py-5 space-y-6 pb-12">
        {/* Worker Score */}
        {workerScore > 0 && (
          <div className="bg-gradient-to-l from-purple-600 to-purple-800 rounded-2xl p-4 text-white">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Award className="w-6 h-6" />
              </div>
              <div>
                <div className="text-sm opacity-80">ניקוד עובד</div>
                <div className="text-2xl font-black">{workerScore.toFixed(0)} נק'</div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3">
              <div className="bg-white/10 rounded-xl p-2 text-center">
                <div className="text-sm font-bold">{me?.score_tasks || 0}</div>
                <div className="text-[10px] opacity-75">משימות</div>
              </div>
              <div className="bg-white/10 rounded-xl p-2 text-center">
                <div className="text-sm font-bold">{me?.score_speed || 0}</div>
                <div className="text-[10px] opacity-75">מהירות</div>
              </div>
              <div className="bg-white/10 rounded-xl p-2 text-center">
                <div className="text-sm font-bold">{me?.score_quality || 0}</div>
                <div className="text-[10px] opacity-75">ביצוע</div>
              </div>
            </div>
          </div>
        )}

        {/* Trust Badges */}
        {currentUser && (
          <div style={{ padding: '0 2px' }}>
            <TrustBadges user={currentUser} />
          </div>
        )}

        {/* Trust Card — visible when viewing another profile */}
        {isViewingOther && (
          <TrustCard user={currentUser} reviews={workerReviews} tasks={workerTasks} />
        )}

        {/* Profile Photo */}
        {!isViewingOther && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px', background: 'var(--surface-2)', borderRadius: 18, border: '1px solid var(--border-1)' }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div
                onClick={() => photoInputRef.current?.click()}
                style={{ width: 72, height: 72, borderRadius: 20, background: '#e8edf5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 900, color: 'var(--text-2)', overflow: 'hidden', cursor: 'pointer', border: '2px solid var(--border-1)' }}
              >
                {me?.profile_photo ? <img src={me.profile_photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <User size={28} />}
              </div>
              <button onClick={() => photoInputRef.current?.click()} style={{ position: 'absolute', bottom: -4, right: -4, width: 24, height: 24, borderRadius: '50%', background: 'white', border: '2px solid #1a6fd4', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                {uploadingPhoto ? <Loader2 size={12} color="#1a6fd4" className="animate-spin" /> : <Camera size={12} color="#1a6fd4" />}
              </button>
              <input ref={photoInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handlePhotoUpload} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-1)' }}>{me?.full_name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>{me?.email}</div>
              <button onClick={() => photoInputRef.current?.click()} style={{ marginTop: 6, fontSize: 12, color: '#1a6fd4', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>שנה תמונת פרופיל</button>
            </div>
          </div>
        )}

        {/* Basic Info */}
         <div className="space-y-3">
           <Label className="text-sm font-semibold">{isViewingOther ? 'פרופיל' : 'מי אני?'}</Label>
           <Input placeholder="שם המקצוע (לדוגמה: אינסטלטור מוסמך)"
             value={form.profession} onChange={e => !isViewingOther && setForm(f => ({ ...f, profession: e.target.value }))}
             disabled={isViewingOther}
             className="bg-secondary border-0 rounded-xl h-12"
           />
           <Textarea placeholder="ספר קצת על עצמך, הניסיון שלך..."
             value={form.bio} onChange={e => !isViewingOther && setForm(f => ({ ...f, bio: e.target.value }))}
             disabled={isViewingOther}
             className="bg-secondary border-0 rounded-xl resize-none" rows={3}
           />
           <Input placeholder="טלפון ליצירת קשר"
             value={form.phone} onChange={e => !isViewingOther && setForm(f => ({ ...f, phone: e.target.value }))}
             disabled={isViewingOther}
             className="bg-secondary border-0 rounded-xl h-12"
             type="tel"
           />
         </div>

        {/* Certificates */}
         <div>
           <Label className="text-sm font-semibold mb-2 block">תעודות מקצוע</Label>
           <div className="flex gap-2 flex-wrap mb-2">
             {form.certificates.map(cert => (
               <span key={cert} className="flex items-center gap-1.5 bg-green-100 text-green-800 px-3 py-1.5 rounded-xl text-sm font-medium">
                 ✅ {cert}
                 {!isViewingOther && <button onClick={() => removeCert(cert)} className="text-green-600 hover:text-green-900"><X className="w-3 h-3" /></button>}
               </span>
             ))}
           </div>
           {!isViewingOther && (
             <div className="flex gap-2">
               <Input placeholder="לדוגמה: מוסמך משרד הפנים"
                 value={newCert} onChange={e => setNewCert(e.target.value)}
                 onKeyDown={e => e.key === 'Enter' && addCert()}
                 className="bg-secondary border-0 rounded-xl flex-1"
               />
               <Button onClick={addCert} variant="outline" className="rounded-xl shrink-0"><Plus className="w-4 h-4" /></Button>
             </div>
           )}
         </div>

         {/* Certificate Document Uploads */}
         <div>
           <Label className="text-sm font-semibold mb-2 block">העלאת מסמכי תעודה</Label>
           <input ref={certDocRef} type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={handleCertDocUpload} />

           {/* Uploaded docs list */}
           {(form.certificate_files || []).length > 0 && (
             <div className="space-y-2 mb-3">
               {form.certificate_files.map(doc => (
                 <div key={doc.url} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '10px 12px' }}>
                   <FileText size={18} color="#16a34a" style={{ flexShrink: 0 }} />
                   <a href={doc.url} target="_blank" rel="noreferrer" style={{ flex: 1, fontSize: 12, fontWeight: 700, color: '#166534', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                     {doc.name}
                   </a>
                   {!isViewingOther && (
                     <button onClick={() => removeCertDoc(doc.url)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                       <Trash2 size={14} color="#dc2626" />
                     </button>
                   )}
                 </div>
               ))}
             </div>
           )}

           {!isViewingOther && (
             <button
               onClick={() => certDocRef.current?.click()}
               disabled={uploadingDoc}
               style={{ width: '100%', height: 48, borderRadius: 14, border: '2px dashed #dbeafe', background: '#f8faff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', color: '#1a6fd4', fontWeight: 700, fontSize: 13 }}
             >
               {uploadingDoc ? <Loader2 size={16} className="animate-spin" /> : <><Upload size={16} /> העלה מסמך תעודה (תמונה / PDF)</>}
             </button>
           )}
         </div>

        {/* Preferred Categories */}
         <div>
           <Label className="text-sm font-semibold mb-2 block">סוגי משימות שאני מבצע</Label>
           <div className="flex gap-2 flex-wrap">
             {CATEGORIES.map(c => (
               <button key={c.value} onClick={() => !isViewingOther && toggleCategory(c.value)}
                 disabled={isViewingOther}
                 className={`px-3 py-2 rounded-xl text-sm font-medium transition-all border ${
                   form.preferred_categories.includes(c.value)
                     ? 'bg-black text-white border-black'
                     : 'bg-white text-gray-600 border-gray-200'
                 } ${isViewingOther ? 'opacity-60 cursor-not-allowed' : ''}`}
               >{c.label}</button>
             ))}
           </div>
         </div>

        {/* Preferred Cities */}
         <div>
           <Label className="text-sm font-semibold mb-2 block">ערים שאני מוכן לבצע משימות</Label>
           <div className="flex gap-2 flex-wrap">
             {CITIES.map(c => (
               <button key={c} onClick={() => !isViewingOther && toggleCity(c)}
                 disabled={isViewingOther}
                 className={`px-3 py-2 rounded-xl text-sm font-medium transition-all border ${
                   form.preferred_cities.includes(c)
                     ? 'bg-black text-white border-black'
                     : 'bg-white text-gray-600 border-gray-200'
                 } ${isViewingOther ? 'opacity-60 cursor-not-allowed' : ''}`}
               >{c}</button>
             ))}
           </div>
         </div>

         {!isViewingOther && (
           <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}
             className="w-full h-14 rounded-2xl text-base font-bold bg-black hover:bg-gray-900"
           >
             {saveMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5 ml-2" />שמור פרופיל</>}
           </Button>
         )}

        {/* Work History */}
        {workerTasks.length > 0 && (
          <div>
            <Label className="text-sm font-semibold mb-3 flex items-center gap-2 block">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              היסטוריית משימות ({workerTasks.filter(t => t.status === 'COMPLETED').length} הושלמו)
            </Label>
            {isViewingOther ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                {workerTasks.filter(t => t.status === 'COMPLETED').slice(0, 8).map((task, idx, arr) => {
                  const date = new Date(task.completed_at || task.updated_date);
                  const diffDays = Math.floor((Date.now() - date.getTime()) / 86400000);
                  const dateLabel = diffDays === 0 ? 'היום' : diffDays === 1 ? 'אתמול' : diffDays < 7 ? `לפני ${diffDays} ימים` : date.toLocaleDateString('he-IL', { day: 'numeric', month: 'short' });
                  return (
                    <div key={task.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, paddingBottom: idx < arr.length - 1 ? 14 : 0, position: 'relative' }}>
                      {idx < arr.length - 1 && (
                        <div style={{ position: 'absolute', right: 10, top: 22, width: 1, bottom: 0, background: '#e2e8f0' }} />
                      )}
                      <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#dcfce7', border: '2px solid #16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, zIndex: 1, fontSize: 10, color: '#16a34a', fontWeight: 900 }}>✓</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#0f1e40', lineHeight: 1.3 }}>{task.title}</div>
                        <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{dateLabel} · ₪{task.price}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-3">
                {workerTasks.map(t => <TaskCard key={t.id} task={t} viewOnly />)}
            </div>
            )}
          </div>
        )}

        {/* Structured Reviews — visible when viewing other */}
        {isViewingOther && workerReviews.length > 0 && (
          <div>
            <Label className="text-sm font-semibold mb-3 flex items-center gap-2 block">
              <Star className="w-4 h-4 text-yellow-500" fill="#fbbf24" />
              ביקורות ({workerReviews.length})
            </Label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {workerReviews.slice(0, 5).map(review => (
                <div key={review.id} style={{ background: 'var(--surface-2)', borderRadius: 14, border: '1px solid var(--border-1)', padding: '12px 14px' }} dir="rtl">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    {'⭐'.repeat(review.rating)}
                    <span style={{ fontSize: 11, color: '#94a3b8', marginRight: 'auto' }}>
                      {new Date(review.created_date).toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: '2-digit' })}
                    </span>
                  </div>
                  {review.comment && (
                    <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, marginBottom: 6 }}>"{review.comment}"</div>
                  )}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                    {review.arrived_on_time === true && <span style={{ fontSize: 10, fontWeight: 700, color: '#0891b2', background: '#ecfeff', border: '1px solid #a5f3fc', borderRadius: 99, padding: '2px 8px' }}>⏱️ הגיע בזמן</span>}
                    {review.professional === true && <span style={{ fontSize: 10, fontWeight: 700, color: '#7c3aed', background: '#f5f3ff', border: '1px solid #ddd6fe', borderRadius: 99, padding: '2px 8px' }}>💼 מקצועי</span>}
                    {review.good_communication === true && <span style={{ fontSize: 10, fontWeight: 700, color: '#1a6fd4', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 99, padding: '2px 8px' }}>💬 תקשורת טובה</span>}
                    {review.fair_pricing === true && <span style={{ fontSize: 10, fontWeight: 700, color: '#059669', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 99, padding: '2px 8px' }}>💰 מחיר הוגן</span>}
                    {review.would_hire_again === true && <span style={{ fontSize: 10, fontWeight: 700, color: '#db2777', background: '#fdf2f8', border: '1px solid #fbcfe8', borderRadius: 99, padding: '2px 8px' }}>🔁 ממליץ</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}