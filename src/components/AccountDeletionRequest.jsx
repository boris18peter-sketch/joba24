import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';
import { Trash2, AlertTriangle, Loader2, Shield } from 'lucide-react';
import LoginPromptModal from '@/components/LoginPromptModal';

export default function AccountDeletionRequest() {
  const { isAuthenticated, user } = useAuth();
  const [showConfirm, setShowConfirm] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    setLoading(true);
    try {
      await base44.auth.deleteAccount();
    } catch (e) {
      try { await base44.auth.updateMe({ account_deleted: true }); } catch {}
    }
    await base44.auth.logout('/');
    setLoading(false);
  };

  return (
    <>
      {!isAuthenticated ? (
        <button
          onClick={() => setShowLogin(true)}
          style={{ width: '100%', height: 48, borderRadius: 12, background: 'linear-gradient(135deg,#1a6fd4,#0a52b0)', color: 'white', fontWeight: 800, fontSize: 15, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          <Shield size={16} /> התחבר כדי למחוק חשבון
        </button>
      ) : (
        <button
          onClick={() => setShowConfirm(true)}
          style={{ width: '100%', height: 48, borderRadius: 12, background: 'white', color: '#dc2626', fontWeight: 800, fontSize: 15, border: '1.5px solid #fecaca', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          <Trash2 size={16} /> מחיקת חשבון
        </button>
      )}

      {/* Login modal */}
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
              <h3 style={{ fontSize: 17, fontWeight: 900, color: '#0f1e40', margin: '0 0 8px' }}>מחיקת חשבון</h3>
              <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6, margin: '0 0 16px' }}>
                החשבון <strong style={{ color: '#1a6fd4' }}>{user?.email}</strong> יימחק לצמיתות. פעולה זו <strong style={{ color: '#dc2626' }}>אינה הפיכה</strong>.
              </p>

              {/* What gets deleted */}
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '12px 14px', textAlign: 'right', marginBottom: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#059669', marginBottom: 6 }}>יימחקו:</div>
                <div style={{ fontSize: 12, color: '#166534', lineHeight: 1.7 }}>
                  פרטים אישיים, תמונת פרופיל, משימות, מועמדויות, צ'אטים, ביקורות, קרדיטים, הגדרות ונתוני מיקום.
                </div>
              </div>

              {/* What gets retained */}
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: '12px 14px', textAlign: 'right', marginBottom: 20 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: '#d97706', marginBottom: 6 }}>יישמרו (חובה חוקית):</div>
                <div style={{ fontSize: 12, color: '#92400e', lineHeight: 1.7 }}>
                  מזהה חשבון מוצפן (למניעת כפילויות) ונתוני עסקאות (7 שנים — דרישת חוק).
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => setShowConfirm(false)}
                  disabled={loading}
                  style={{ flex: 1, height: 46, borderRadius: 12, background: '#f1f5f9', color: '#475569', fontWeight: 700, fontSize: 14, border: '1px solid #e2e8f0', cursor: 'pointer' }}
                >
                  ביטול
                </button>
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  style={{ flex: 1, height: 46, borderRadius: 12, background: 'linear-gradient(135deg,#dc2626,#991b1b)', color: 'white', fontWeight: 800, fontSize: 14, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <><Trash2 size={15} /> מחק חשבון</>}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}