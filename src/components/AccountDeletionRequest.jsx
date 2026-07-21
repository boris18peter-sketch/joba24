import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Trash2, Shield, AlertTriangle, CheckCircle2, Loader2, ChevronLeft, UserX, Lock } from 'lucide-react';
import { toast } from 'sonner';
import LoginPromptModal from '@/components/LoginPromptModal';

const STEPS = [
  { icon: '1', title: 'שליחת בקשה', desc: 'מאשרים את הבקשה בלחיצה על כפתור "בקשת מחיקת חשבון" בתחתית הדף.' },
  { icon: '2', title: 'טיפול תוך 30 ימים', desc: 'צוות Joba24 יטפל בבקשה וימחק את הנתונים תוך עד 30 ימים ממועד ההגשה.' },
  { icon: '3', title: 'אישור במייל', desc: 'תקבלו הודעת אישור לכתובת האימייל הרשומה בחשבון לאחר השלמת המחיקה.' },
];

const DELETED_DATA = [
  'שם מלא, כתובת מייל ומספר טלפון',
  'תמונת פרופיל ותיאור מקצוע',
  'צילום תעודת זהות (אם נשמר)',
  'היסטוריית צ\'אטים והודעות',
  'משימות פרסום ומועמדויות',
  'ביקורות ודירוגים',
  'יתרת קרדיטים והיסטוריית עסקאות',
  'הגדרות התראות וטוקני FCM',
  'נתוני מיקום שמורים (WorkerTracker)',
];

const RETAINED_DATA = [
  { label: 'מזהה חשבון מוצפן', period: 'לצמיתות', reason: 'למניעת יצירת חשבונות כפולים וחסימת משתמשים שהורחקו' },
  { label: 'נתוני עסקאות תשלום', period: '7 שנים', reason: 'בהתאם לדרישות חוק מס שבחון ורגולציה פיננסית' },
  { label: 'רישומי פעילות חשודה', period: '7 שנים', reason: 'למניעת הונאה ועמידה בחובות חוקיות' },
];

export default function AccountDeletionRequest() {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [showConfirm, setShowConfirm] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleLogin = () => {
    setShowLogin(true);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // Send a support message with the deletion request
      await base44.entities.SupportMessage.create({
        user_id: user?.id,
        user_name: user?.full_name || user?.email,
        sender_role: 'user',
        content: `בקשה למחיקת חשבון ונתונים — משתמש: ${user?.full_name || ''} (${user?.email || ''}). הבקשה הוגשה דרך עמוד מדיניות הפרטיות.`,
      });

      // Track analytics
      base44.analytics.track({ eventName: 'account_deletion_requested', properties: { user_id: user?.id } });

      // Try to send email notification
      try {
        await base44.integrations.Core.SendEmail({
          to: user?.email,
          subject: 'אישור קבלת בקשת מחיקת חשבון — Joba24',
          body: `שלום ${user?.full_name || ''},\n\nקיבלנו את בקשתך למחיקת החשבון והנתונים המשויכים אליו ב-Joba24.\n\nהבקשה תטופל תוך עד 30 ימים. לאחר השלמת המחיקה תישלח הודעת אישור נוספת.\n\nבפנייה נוספת ניתן לפנות ל: hello@joba24.com\n\nצוות Joba24`,
        });
      } catch {}

      setDone(true);
      setShowConfirm(false);
      toast.success('בקשת מחיקת החשבון נשלחה בהצלחה');
      queryClient.invalidateQueries({ queryKey: ['me'] });
    } catch (err) {
      toast.error('שגיאה בשליחת הבקשה. נסה שוב או פנה ל- hello@joba24.com');
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div style={{ background: 'white', borderRadius: 18, border: '1px solid #bbf7d0', overflow: 'hidden', maxWidth: 520, margin: '0 auto' }}>
        <div style={{ background: 'linear-gradient(135deg, #059669, #047857)', padding: '24px 20px', textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
            <CheckCircle2 size={28} color="white" />
          </div>
          <h3 style={{ color: 'white', fontSize: 18, fontWeight: 900, margin: 0 }}>הבקשה נשלחה בהצלחה</h3>
        </div>
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: '#475569', lineHeight: 1.7, margin: '0 0 16px' }}>
            קיבלנו את בקשתך למחיקת חשבון Joba24 והנתונים המשויכים אליו.
          </p>
          <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6, margin: '0 0 8px' }}>
            הבקשה תטופל תוך עד <strong style={{ color: '#059669' }}>30 ימים</strong>.
          </p>
          <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6, margin: '0 0 16px' }}>
            אישור נשלח לכתובת <strong style={{ color: '#1a6fd4' }}>{user?.email}</strong>
          </p>
          <button
            onClick={() => navigate('/')}
            style={{ padding: '10px 24px', borderRadius: 12, background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)', color: 'white', fontWeight: 800, fontSize: 14, border: 'none', cursor: 'pointer' }}
          >
            חזרה לדף הבית
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: 'white', borderRadius: 18, border: '1px solid #fecaca', overflow: 'hidden', maxWidth: 520, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #dc2626, #991b1b)', padding: '20px', textAlign: 'center' }}>
        <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
          <UserX size={26} color="white" />
        </div>
        <h3 style={{ color: 'white', fontSize: 17, fontWeight: 900, margin: 0, marginBottom: 4 }}>מחיקת חשבון ונתונים</h3>
        <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, margin: 0 }}>Joba24 — בקשת מחיקה מלאה</p>
      </div>

      <div style={{ padding: '20px' }}>
        {/* Intro */}
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '12px 14px', marginBottom: 16, display: 'flex', gap: 10 }}>
          <AlertTriangle size={18} color="#dc2626" style={{ flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 12, color: '#991b1b', lineHeight: 1.6, margin: 0 }}>
            פעולה זו <strong>אינה הפיכה</strong>. לאחר מחיקת החשבון, לא ניתן יהיה לשחזר את הנתונים או ההיסטוריה.
          </p>
        </div>

        {/* Steps */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#64748b', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10 }}>שלבי התהליך</div>
          {STEPS.map((step, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
              <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#fef2f2', border: '1px solid #fecaca', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#dc2626', flexShrink: 0 }}>
                {step.icon}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#1a2540' }}>{step.title}</div>
                <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5, marginTop: 2 }}>{step.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* What gets deleted */}
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '12px 14px', marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#059669', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <CheckCircle2 size={14} /> נתונים שיימחקו
          </div>
          {DELETED_DATA.map((item, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 4 }}>
              <span style={{ color: '#059669', fontSize: 12, marginTop: 1 }}>✓</span>
              <span style={{ fontSize: 12, color: '#166534', lineHeight: 1.5 }}>{item}</span>
            </div>
          ))}
        </div>

        {/* What gets retained */}
        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '12px 14px', marginBottom: 16 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#d97706', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Lock size={14} /> נתונים שיישמרו (חובה חוקית)
          </div>
          {RETAINED_DATA.map((item, i) => (
            <div key={i} style={{ marginBottom: 8, paddingBottom: 8, borderBottom: i < RETAINED_DATA.length - 1 ? '1px solid #fef3c7' : 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#92400e' }}>{item.label}</span>
                <span style={{ fontSize: 10, fontWeight: 700, color: '#d97706', background: '#fef3c7', padding: '2px 8px', borderRadius: 99 }}>{item.period}</span>
              </div>
              <div style={{ fontSize: 11, color: '#a16207', lineHeight: 1.4 }}>{item.reason}</div>
            </div>
          ))}
        </div>

        {/* Auth gate or submit button */}
        {!isAuthenticated ? (
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: '#475569', marginBottom: 12, lineHeight: 1.5 }}>
              לבקשת מחיקת חשבון, יש להתחבר תחילה לחשבון Joba24 שלך.
            </p>
            <button
              onClick={handleLogin}
              style={{ width: '100%', height: 48, borderRadius: 12, background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)', color: 'white', fontWeight: 800, fontSize: 15, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              <Shield size={16} /> התחבר כדי לבקש מחיקה
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowConfirm(true)}
            style={{ width: '100%', height: 48, borderRadius: 12, background: 'linear-gradient(135deg,#dc2626,#991b1b)', color: 'white', fontWeight: 800, fontSize: 15, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 14px rgba(220,38,38,0.3)' }}
          >
            <Trash2 size={16} /> בקשת מחיקת חשבון
          </button>
        )}
      </div>

      {/* Login modal for unauthenticated users */}
      {showLogin && createPortal(
        <LoginPromptModal
          onLogin={() => { setShowLogin(false); window.location.reload(); }}
          onClose={() => setShowLogin(false)}
          type="login"
        />,
        document.body
      )}

      {/* Confirm modal */}
      {showConfirm && createPortal(
        <div
          onClick={(e) => { if (e.target === e.currentTarget) setShowConfirm(false); }}
          style={{ position: 'fixed', inset: 0, zIndex: 999999, background: 'rgba(5,15,40,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
        >
          <div style={{ background: 'white', borderRadius: 22, width: '100%', maxWidth: 400, maxHeight: '85dvh', overflowY: 'auto' }} dir="rtl">
            <div style={{ padding: '24px 20px 20px', textAlign: 'center' }}>
              <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <AlertTriangle size={30} color="#dc2626" />
              </div>
              <h3 style={{ fontSize: 17, fontWeight: 900, color: '#0f1e40', margin: '0 0 8px' }}>האם אתה בטוח?</h3>
              <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6, margin: '0 0 20px' }}>
                אתה עומד לשלוח בקשה למחיקת חשבון <strong style={{ color: '#1a6fd4' }}>{user?.email}</strong> וכל הנתונים המשויכים אליו. פעולה זו <strong style={{ color: '#dc2626' }}>אינה הפיכה</strong>.
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setShowConfirm(false)}
                  disabled={submitting}
                  style={{ flex: 1, height: 46, borderRadius: 12, background: '#f1f5f9', color: '#475569', fontWeight: 700, fontSize: 14, border: '1px solid #e2e8f0', cursor: 'pointer' }}
                >
                  ביטול
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  style={{ flex: 1, height: 46, borderRadius: 12, background: 'linear-gradient(135deg,#dc2626,#991b1b)', color: 'white', fontWeight: 800, fontSize: 14, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <><Trash2 size={15} /> מחק</>}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}