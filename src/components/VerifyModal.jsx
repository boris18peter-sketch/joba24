import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { base44 } from '@/api/base44Client';
import { useQueryClient } from '@tanstack/react-query';
import {
  Shield, X, CheckCircle, Loader2, Camera, Eye, EyeOff,
  Lock, Clock, ChevronDown, ChevronUp, UserCheck, Star
} from 'lucide-react';
import { toast } from 'sonner';

const FIELD_STYLE = (error, focused) => ({
  width: '100%',
  height: 48,
  borderRadius: 12,
  border: `1.5px solid ${error ? '#ef4444' : focused ? '#1a6fd4' : '#e5e7eb'}`,
  background: error ? '#fff5f5' : '#fff',
  padding: '0 14px',
  fontSize: 15,
  color: '#111',
  outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s',
  fontFamily: 'inherit',
  boxShadow: focused && !error ? '0 0 0 3px rgba(26,111,212,0.1)' : 'none',
});

const Label = ({ children }) => (
  <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 6, letterSpacing: 0.2 }}>
    {children}
  </div>
);

const ErrorMsg = ({ msg }) => (
  <div style={{ fontSize: 11, color: '#ef4444', marginTop: 4 }}>{msg}</div>
);

export default function VerifyModal({ onClose, onSuccess }) {
  const queryClient = useQueryClient();
  const idPhotoRef = useRef(null);

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploadingId, setUploadingId] = useState(false);
  const [idPhotoUrl, setIdPhotoUrl] = useState('');
  const [showId, setShowId] = useState(false);
  const [focused, setFocused] = useState('');
  const [whyOpen, setWhyOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const [form, setForm] = useState({ full_name: '', email: '', phone: '', id_number: '' });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.full_name.trim()) e.full_name = 'שם מלא נדרש';
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'כתובת מייל תקינה נדרשת';
    if (!form.phone.trim() || form.phone.replace(/\D/g, '').length < 9) e.phone = 'מספר טלפון תקין נדרש';
    if (!form.id_number.trim() || form.id_number.replace(/\D/g, '').length < 8) e.id_number = 'מספר תעודת זהות תקין נדרש';
    if (!idPhotoUrl) e.id_photo = 'יש להעלות צילום תעודת זהות';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const uploadFile = async (file) => {
    if (!file || !file.type.startsWith('image/')) {
      toast.error('יש להעלות קובץ תמונה בלבד');
      return;
    }
    setUploadingId(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setIdPhotoUrl(file_url);
    setUploadingId(false);
    setErrors(prev => ({ ...prev, id_photo: null }));
  };

  const handleIdPhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadFile(file);
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
      is_verified: false,
      kyc_status: 'pending',
    });
    queryClient.invalidateQueries({ queryKey: ['me'] });
    setLoading(false);
    setStep(2);
  };

  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 999999,
      background: 'rgba(5,15,40,0.65)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      backdropFilter: 'blur(8px)',
      touchAction: 'none',
    }} onClick={(e) => e.target === e.currentTarget && onClose()}>
    <div style={{
        background: '#fafbff',
        borderRadius: '28px 28px 0 0',
        width: '100%', maxWidth: 480,
        maxHeight: '94vh', overflowY: 'auto',
        boxShadow: '0 -16px 60px rgba(0,0,0,0.2)',
      }} dir="rtl">

        {step === 1 ? (
          <>
            {/* Header */}
            <div style={{ padding: '24px 20px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div style={{ flex: 1 }}>
                {/* Progress */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {[1, 2].map(s => (
                      <div key={s} style={{
                        height: 4, width: s === 1 ? 28 : 18, borderRadius: 99,
                        background: s === 1 ? '#1a6fd4' : '#dde3ee',
                        transition: 'all 0.3s',
                      }} />
                    ))}
                  </div>
                  <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500 }}>שלב 1 מתוך 2 · פחות מדקה</span>
                </div>

                {/* Icon + Title */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
                  <div style={{ width: 46, height: 46, borderRadius: 14, background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Shield size={22} color="white" strokeWidth={1.8} />
                  </div>
                  <div>
                    <div style={{ fontSize: 19, fontWeight: 800, color: '#0f1e40', letterSpacing: -0.3 }}>אימות זהות</div>
                    <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 400, marginTop: 1 }}>
                      אימות חד־פעמי לפתיחת ג'ובות ולקיחת משימות
                    </div>
                  </div>
                </div>

                {/* Trust row */}
                <div style={{ display: 'flex', gap: 16, marginTop: 14, paddingTop: 12, borderTop: '1px solid #edf0f7' }}>
                  {[
                    { icon: <UserCheck size={13} strokeWidth={1.8} />, text: 'אימות חד־פעמי' },
                    { icon: <Lock size={13} strokeWidth={1.8} />, text: 'מידע מוצפן' },
                    { icon: <Star size={13} strokeWidth={1.8} />, text: 'קהילה מדורגת' },
                  ].map(({ icon, text }) => (
                    <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#6b7280', fontWeight: 500 }}>
                      <span style={{ color: '#1a6fd4' }}>{icon}</span>
                      {text}
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={onClose} style={{ width: 34, height: 34, borderRadius: 11, background: '#f0f2f7', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                <X size={16} color="#9ca3af" />
              </button>
            </div>

            <div style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* Why verify — collapsible */}
              <div style={{ border: '1px solid #e5e7eb', borderRadius: 14, overflow: 'hidden' }}>
                <button
                  onClick={() => setWhyOpen(v => !v)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: 'white', border: 'none', cursor: 'pointer', textAlign: 'right' }}
                >
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>למה נדרש אימות?</span>
                  {whyOpen ? <ChevronUp size={16} color="#9ca3af" /> : <ChevronDown size={16} color="#9ca3af" />}
                </button>
                {whyOpen && (
                  <div style={{ background: '#f8faff', padding: '10px 14px 14px', borderTop: '1px solid #f0f2f7' }}>
                    {[
                      'מונע חשבונות פיקטיביים ושמירה על אמינות',
                      'מגדיל את הביטחון בין לקוחות לעובדים',
                      'כל המשתמשים ב־Joba24 עוברים אימות זהה',
                    ].map((item, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 8 }}>
                        <CheckCircle size={14} color="#1a6fd4" strokeWidth={2} style={{ flexShrink: 0, marginTop: 1 }} />
                        <span style={{ fontSize: 12, color: '#4b5563', lineHeight: 1.5 }}>{item}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Full name */}
              <div>
                <Label>שם מלא</Label>
                <input
                  placeholder="ישראל ישראלי"
                  value={form.full_name}
                  onFocus={() => setFocused('full_name')}
                  onBlur={() => setFocused('')}
                  onChange={e => { setForm(f => ({ ...f, full_name: e.target.value })); setErrors(p => ({ ...p, full_name: null })); }}
                  style={FIELD_STYLE(errors.full_name, focused === 'full_name')}
                />
                {errors.full_name && <ErrorMsg msg={errors.full_name} />}
              </div>

              {/* Email */}
              <div>
                <Label>כתובת מייל</Label>
                <input
                  placeholder="israel@example.com"
                  type="email"
                  value={form.email}
                  onFocus={() => setFocused('email')}
                  onBlur={() => setFocused('')}
                  onChange={e => { setForm(f => ({ ...f, email: e.target.value })); setErrors(p => ({ ...p, email: null })); }}
                  style={FIELD_STYLE(errors.email, focused === 'email')}
                />
                {errors.email && <ErrorMsg msg={errors.email} />}
              </div>

              {/* Phone */}
              <div>
                <Label>מספר טלפון</Label>
                <input
                  placeholder="05X-XXXXXXX"
                  type="tel"
                  value={form.phone}
                  onFocus={() => setFocused('phone')}
                  onBlur={() => setFocused('')}
                  onChange={e => { setForm(f => ({ ...f, phone: e.target.value })); setErrors(p => ({ ...p, phone: null })); }}
                  style={FIELD_STYLE(errors.phone, focused === 'phone')}
                />
                {errors.phone && <ErrorMsg msg={errors.phone} />}
              </div>

              {/* ID number */}
              <div>
                <Label>מספר תעודת זהות</Label>
                <div style={{ position: 'relative' }}>
                  <input
                    placeholder="XXXXXXXXX"
                    type={showId ? 'text' : 'password'}
                    value={form.id_number}
                    onFocus={() => setFocused('id_number')}
                    onBlur={() => setFocused('')}
                    onChange={e => { setForm(f => ({ ...f, id_number: e.target.value.replace(/\D/g, '') })); setErrors(p => ({ ...p, id_number: null })); }}
                    maxLength={9}
                    style={{ ...FIELD_STYLE(errors.id_number, focused === 'id_number'), paddingLeft: 42 }}
                  />
                  <button onClick={() => setShowId(v => !v)} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
                    {showId ? <EyeOff size={16} color="#9ca3af" /> : <Eye size={16} color="#9ca3af" />}
                  </button>
                </div>
                {errors.id_number && <ErrorMsg msg={errors.id_number} />}
              </div>

              {/* ID photo upload */}
              <div>
                <Label>צילום תעודת זהות</Label>
                <input ref={idPhotoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleIdPhotoUpload} />

                {idPhotoUrl ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#f0fdf9', border: '1.5px solid #6ee7b7', borderRadius: 14, padding: '12px 16px' }}>
                    <img src={idPhotoUrl} alt="ת.ז." style={{ width: 52, height: 36, objectFit: 'cover', borderRadius: 8 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#065f46', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <CheckCircle size={14} color="#059669" /> הצילום הועלה
                      </div>
                      <div style={{ fontSize: 11, color: '#6ee7b7', marginTop: 1 }}>לחץ להחלפה</div>
                    </div>
                    <button onClick={() => idPhotoRef.current?.click()} style={{ fontSize: 12, color: '#1a6fd4', background: 'none', border: '1px solid #bfdbfe', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontWeight: 600 }}>החלף</button>
                  </div>
                ) : (
                  <div
                    onClick={() => idPhotoRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={handleDrop}
                    style={{
                      border: `2px dashed ${errors.id_photo ? '#ef4444' : dragOver ? '#1a6fd4' : '#d1dde8'}`,
                      borderRadius: 14,
                      background: dragOver ? '#eff6ff' : errors.id_photo ? '#fff5f5' : '#f8faff',
                      padding: '24px 16px',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    {uploadingId ? (
                      <Loader2 size={24} color="#1a6fd4" className="animate-spin" />
                    ) : (
                      <>
                        <div style={{ width: 44, height: 44, borderRadius: 12, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Camera size={22} color="#1a6fd4" strokeWidth={1.8} />
                        </div>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#1a6fd4' }}>העלאת תעודת זהות</div>
                          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>לחץ לבחירת תמונה או גרור לכאן</div>
                        </div>
                      </>
                    )}
                  </div>
                )}
                {errors.id_photo && <ErrorMsg msg={errors.id_photo} />}
              </div>

              {/* Privacy */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 14px', background: '#f8faff', borderRadius: 12 }}>
                <Lock size={13} color="#9ca3af" strokeWidth={1.8} />
                <span style={{ fontSize: 11, color: '#9ca3af', lineHeight: 1.5 }}>
                  הפרטים מוצפנים ולא יוצגו לגורמים אחרים. תעודת הזהות משמשת לאימות בלבד.
                </span>
              </div>

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={loading}
                style={{
                  width: '100%', height: 52, borderRadius: 14,
                  background: loading ? '#93b4d8' : 'linear-gradient(135deg,#1a6fd4,#0a52b0)',
                  color: 'white', fontWeight: 700, fontSize: 15,
                  border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  letterSpacing: 0.2,
                  boxShadow: loading ? 'none' : '0 4px 20px rgba(26,111,212,0.3)',
                  marginBottom: 8,
                }}
              >
                {loading ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <><CheckCircle size={18} strokeWidth={2} /> השלם אימות והמשך</>
                )}
              </button>
            </div>
          </>
        ) : (
          /* Step 2: Success */
          <div style={{ padding: '48px 24px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, textAlign: 'center' }}>
            {/* Animated checkmark */}
            <div style={{
              width: 88, height: 88, borderRadius: '50%',
              background: 'linear-gradient(135deg,#10b981,#059669)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 8px 32px rgba(16,185,129,0.3)',
              marginBottom: 20,
            }}>
              <CheckCircle size={44} color="white" strokeWidth={2} />
            </div>

            <div style={{ fontSize: 22, fontWeight: 800, color: '#0f1e40', marginBottom: 8, letterSpacing: -0.3 }}>
              הפרטים נשלחו לאימות
            </div>
            <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.7, marginBottom: 24 }}>
              הגשת את פרטי האימות בהצלחה.<br />הווי הירוק יופיע ליד שמך לאחר אישור המנהל.
            </div>

            {/* Capabilities */}
            <div style={{ width: '100%', background: '#f8faff', border: '1px solid #e5e9f5', borderRadius: 16, padding: '16px', marginBottom: 24 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>עכשיו אפשר</div>
              {[
                { icon: <Shield size={15} strokeWidth={1.8} />, text: 'לפרסם ג\'ובות' },
                { icon: <UserCheck size={15} strokeWidth={1.8} />, text: 'לקחת ולבצע משימות' },
                { icon: <CheckCircle size={15} strokeWidth={1.8} />, text: 'להגיש בקשות לג\'ובות' },
              ].map(({ icon, text }) => (
                <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: text !== 'להגיש בקשות לג\'ובות' ? '1px solid #edf0f7' : 'none' }}>
                  <div style={{ color: '#10b981' }}>{icon}</div>
                  <span style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>{text}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => { onSuccess?.(); onClose(); }}
              style={{
                width: '100%', height: 52, borderRadius: 14,
                background: 'linear-gradient(135deg,#10b981,#059669)',
                color: 'white', fontWeight: 700, fontSize: 15,
                border: 'none', cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(16,185,129,0.3)',
              }}
            >
              בוא נתחיל
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}