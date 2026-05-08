import { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import { Shield, X, CheckCircle2, Loader2, Camera, Upload, Eye, EyeOff } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

/**
 * VerifyModal — פופ-אפ לאימות זהות משתמש
 * Props:
 *   onClose: () => void
 *   onSuccess: () => void  — called after successful verification
 */
export default function VerifyModal({ onClose, onSuccess }) {
  const queryClient = useQueryClient();
  const idPhotoRef = useRef(null);

  const [step, setStep] = useState(1); // 1 = form, 2 = success
  const [loading, setLoading] = useState(false);
  const [uploadingId, setUploadingId] = useState(false);
  const [idPhotoUrl, setIdPhotoUrl] = useState('');
  const [showId, setShowId] = useState(false);

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    id_number: '',
  });

  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.full_name.trim()) e.full_name = true;
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = true;
    if (!form.phone.trim() || form.phone.replace(/\D/g, '').length < 9) e.phone = true;
    if (!form.id_number.trim() || form.id_number.replace(/\D/g, '').length < 8) e.id_number = true;
    if (!idPhotoUrl) e.id_photo = true;
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleIdPhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingId(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setIdPhotoUrl(file_url);
    setUploadingId(false);
    setErrors(prev => ({ ...prev, id_photo: false }));
  };

  const handleSubmit = async () => {
    if (!validate()) {
      toast.error('יש למלא את כל השדות הנדרשים');
      return;
    }
    setLoading(true);
    await base44.auth.updateMe({
      full_name: form.full_name,
      phone: form.phone,
      id_number: form.id_number,
      id_photo_url: idPhotoUrl,
      is_verified: true,
    });
    queryClient.invalidateQueries({ queryKey: ['me'] });
    setLoading(false);
    setStep(2);
  };

  const handleSuccess = () => {
    onSuccess?.();
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(10,20,50,0.72)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      backdropFilter: 'blur(4px)',
    }} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: 'white', borderRadius: '24px 24px 0 0',
        width: '100%', maxWidth: 480,
        padding: '0 0 32px',
        maxHeight: '92vh', overflowY: 'auto',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.18)',
      }} dir="rtl">

        {step === 1 ? (
          <>
            {/* Header */}
            <div style={{ padding: '20px 20px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 14, background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Shield size={22} color="white" />
                  </div>
                  <div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: '#0f2b6b' }}>אימות זהות</div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>נדרש לפרסום ולקיחת ג'ובות</div>
                  </div>
                </div>
                {/* Trust badges */}
                <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                  {['🔒 מוצפן ומאובטח', '✅ חד פעמי', '🛡️ לא נשמר ציבורית'].map(b => (
                    <span key={b} style={{ fontSize: 10, fontWeight: 700, background: '#eff6ff', color: '#1d4ed8', padding: '3px 8px', borderRadius: 20, border: '1px solid #bfdbfe' }}>{b}</span>
                  ))}
                </div>
              </div>
              <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 10, background: '#f3f4f6', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                <X size={16} color="#6b7280" />
              </button>
            </div>

            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Why verify */}
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 14, padding: '12px 14px', display: 'flex', gap: 10 }}>
                <div style={{ fontSize: 20 }}>🛡️</div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 800, color: '#166534', marginBottom: 3 }}>למה נדרש אימות?</div>
                  <div style={{ fontSize: 11, color: '#15803d', lineHeight: 1.5 }}>רק משתמשים מאומתים יכולים לפרסם, לקחת ולהגיש בקשות לג'ובות — כך אנחנו מבטיחים בטיחות וסביבה מהימנה לכולם.</div>
                </div>
              </div>

              {/* Full name */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 4, display: 'block' }}>שם מלא *</label>
                <Input
                  placeholder="ישראל ישראלי"
                  value={form.full_name}
                  onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                  style={{ borderColor: errors.full_name ? '#ef4444' : undefined, background: errors.full_name ? '#fff5f5' : undefined }}
                />
                {errors.full_name && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 3 }}>שם מלא נדרש</div>}
              </div>

              {/* Email */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 4, display: 'block' }}>כתובת מייל *</label>
                <Input
                  placeholder="israel@example.com"
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  style={{ borderColor: errors.email ? '#ef4444' : undefined, background: errors.email ? '#fff5f5' : undefined }}
                />
                {errors.email && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 3 }}>מייל תקין נדרש</div>}
              </div>

              {/* Phone */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 4, display: 'block' }}>מספר טלפון *</label>
                <Input
                  placeholder="05X-XXXXXXX"
                  type="tel"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  style={{ borderColor: errors.phone ? '#ef4444' : undefined, background: errors.phone ? '#fff5f5' : undefined }}
                />
                {errors.phone && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 3 }}>מספר טלפון תקין נדרש</div>}
              </div>

              {/* ID number */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 4, display: 'block' }}>מספר תעודת זהות *</label>
                <div style={{ position: 'relative' }}>
                  <Input
                    placeholder="XXXXXXXXX"
                    type={showId ? 'text' : 'password'}
                    value={form.id_number}
                    onChange={e => setForm(f => ({ ...f, id_number: e.target.value.replace(/\D/g, '') }))}
                    maxLength={9}
                    style={{ borderColor: errors.id_number ? '#ef4444' : undefined, background: errors.id_number ? '#fff5f5' : undefined, paddingLeft: 36 }}
                  />
                  <button onClick={() => setShowId(v => !v)} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    {showId ? <EyeOff size={16} color="#9ca3af" /> : <Eye size={16} color="#9ca3af" />}
                  </button>
                </div>
                {errors.id_number && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 3 }}>תעודת זהות תקינה נדרשת</div>}
              </div>

              {/* ID photo upload */}
              <div>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 4, display: 'block' }}>צילום תעודת זהות *</label>
                <input ref={idPhotoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleIdPhotoUpload} />
                {idPhotoUrl ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '10px 14px' }}>
                    <img src={idPhotoUrl} alt="ת.ז." style={{ width: 48, height: 32, objectFit: 'cover', borderRadius: 6, border: '1px solid #d1fae5' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#166534' }}>✅ הצילום הועלה בהצלחה</div>
                    </div>
                    <button onClick={() => idPhotoRef.current?.click()} style={{ fontSize: 11, color: '#1a6fd4', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>החלף</button>
                  </div>
                ) : (
                  <button
                    onClick={() => idPhotoRef.current?.click()}
                    disabled={uploadingId}
                    style={{ width: '100%', height: 56, borderRadius: 14, border: `2px dashed ${errors.id_photo ? '#ef4444' : '#dbeafe'}`, background: errors.id_photo ? '#fff5f5' : '#f8faff', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, cursor: 'pointer', color: errors.id_photo ? '#ef4444' : '#1a6fd4', fontWeight: 700, fontSize: 13 }}
                  >
                    {uploadingId ? <Loader2 size={18} className="animate-spin" /> : <><Camera size={18} /> העלה צילום ת.ז.</>}
                  </button>
                )}
                {errors.id_photo && <div style={{ fontSize: 11, color: '#ef4444', marginTop: 3 }}>יש להעלות צילום תעודת זהות</div>}
              </div>

              {/* Privacy note */}
              <div style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center', lineHeight: 1.5 }}>
                🔒 הפרטים שלך מוצפנים ולא יוצגו לאחרים. תעודת הזהות משמשת לאימות בלבד.
              </div>

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={loading}
                style={{ width: '100%', height: 54, borderRadius: 16, background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)', color: 'white', fontWeight: 900, fontSize: 16, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 18px rgba(26,111,212,0.3)' }}
              >
                {loading ? <Loader2 size={20} className="animate-spin" /> : <><Shield size={18} /> אמת את זהותי</>}
              </button>
            </div>
          </>
        ) : (
          /* Step 2: Success */
          <div style={{ padding: '40px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, textAlign: 'center' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg,#22c55e,#16a34a)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 24px rgba(34,197,94,0.35)', marginBottom: 8 }}>
              <CheckCircle2 size={40} color="white" />
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#0f2b6b' }}>האימות הושלם! 🎉</div>
            <div style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6 }}>
              הפרופיל שלך מאומת. תראה ✅ ליד שמך בכל מקום באפליקציה.
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
              {['פרסום ג\'ובות', 'לקיחת ג\'ובות', 'הגשת בקשות'].map(b => (
                <span key={b} style={{ fontSize: 12, fontWeight: 700, background: '#f0fdf4', color: '#166534', padding: '5px 12px', borderRadius: 20, border: '1px solid #bbf7d0' }}>✅ {b}</span>
              ))}
            </div>
            <button
              onClick={handleSuccess}
              style={{ marginTop: 8, width: '100%', height: 52, borderRadius: 16, background: 'linear-gradient(135deg,#22c55e,#16a34a)', color: 'white', fontWeight: 900, fontSize: 15, border: 'none', cursor: 'pointer', boxShadow: '0 4px 18px rgba(34,197,94,0.3)' }}
            >
              מעולה, בוא נתחיל! 🚀
            </button>
          </div>
        )}
      </div>
    </div>
  );
}