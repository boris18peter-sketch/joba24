import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowRight, Plus, X, Save, Loader2, Award, Star, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { CATEGORIES } from '@/lib/categories';
import { toast } from 'sonner';
import TaskCard from '@/components/TaskCard';

const CITIES = ['תל אביב', 'ירושלים', 'חיפה', 'באר שבע', 'ראשון לציון', 'פתח תקווה', 'נתניה', 'הרצליה', 'רמת גן', 'אשדוד'];

export default function WorkerProfile() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: me } = useQuery({ queryKey: ['me'], queryFn: () => base44.auth.me() });

  const { data: workerTasks = [] } = useQuery({
    queryKey: ['workerTasks', me?.id],
    queryFn: () => base44.entities.Task.filter({ worker_id: me.id }, '-created_date', 20),
    enabled: !!me?.id,
  });

  const [form, setForm] = useState(null);
  const [newCert, setNewCert] = useState('');

  // Initialize form when me loads
  if (me && !form) {
    setForm({
      bio: me.bio || '',
      phone: me.phone || '',
      profession: me.profession || '',
      certificates: me.certificates || [],
      preferred_categories: me.preferred_categories || [],
      preferred_cities: me.preferred_cities || [],
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

  if (!form) return <div className="flex items-center justify-center h-screen"><div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" /></div>;

  const workerScore = me?.worker_score || 0;

  return (
    <div className="min-h-screen" dir="rtl">
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border px-4 pt-12 pb-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center">
          <ArrowRight className="w-4 h-4" />
        </button>
        <h1 className="text-lg font-bold">פרופיל עובד</h1>
      </div>

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

        {/* Basic Info */}
        <div className="space-y-3">
          <Label className="text-sm font-semibold">מי אני?</Label>
          <Input placeholder="שם המקצוע (לדוגמה: אינסטלטור מוסמך)"
            value={form.profession} onChange={e => setForm(f => ({ ...f, profession: e.target.value }))}
            className="bg-secondary border-0 rounded-xl h-12"
          />
          <Textarea placeholder="ספר קצת על עצמך, הניסיון שלך..."
            value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
            className="bg-secondary border-0 rounded-xl resize-none" rows={3}
          />
          <Input placeholder="טלפון ליצירת קשר"
            value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
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
                <button onClick={() => removeCert(cert)} className="text-green-600 hover:text-green-900"><X className="w-3 h-3" /></button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <Input placeholder="לדוגמה: מוסמך משרד הפנים"
              value={newCert} onChange={e => setNewCert(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addCert()}
              className="bg-secondary border-0 rounded-xl flex-1"
            />
            <Button onClick={addCert} variant="outline" className="rounded-xl shrink-0"><Plus className="w-4 h-4" /></Button>
          </div>
        </div>

        {/* Preferred Categories */}
        <div>
          <Label className="text-sm font-semibold mb-2 block">סוגי עבודות שאני מבצע</Label>
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map(c => (
              <button key={c.value} onClick={() => toggleCategory(c.value)}
                className={`px-3 py-2 rounded-xl text-sm font-medium transition-all border ${
                  form.preferred_categories.includes(c.value)
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-gray-600 border-gray-200'
                }`}
              >{c.label}</button>
            ))}
          </div>
        </div>

        {/* Preferred Cities */}
        <div>
          <Label className="text-sm font-semibold mb-2 block">ערים שאני מוכן לעבוד בהן</Label>
          <div className="flex gap-2 flex-wrap">
            {CITIES.map(c => (
              <button key={c} onClick={() => toggleCity(c)}
                className={`px-3 py-2 rounded-xl text-sm font-medium transition-all border ${
                  form.preferred_cities.includes(c)
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-gray-600 border-gray-200'
                }`}
              >{c}</button>
            ))}
          </div>
        </div>

        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}
          className="w-full h-14 rounded-2xl text-base font-bold bg-black hover:bg-gray-900"
        >
          {saveMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5 ml-2" />שמור פרופיל</>}
        </Button>

        {/* Work History */}
        {workerTasks.length > 0 && (
          <div>
            <Label className="text-sm font-semibold mb-3 flex items-center gap-2 block">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              היסטוריית עבודות ({workerTasks.filter(t => t.status === 'COMPLETED').length} הושלמו)
            </Label>
            <div className="space-y-3">
              {workerTasks.map(t => <TaskCard key={t.id} task={t} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}