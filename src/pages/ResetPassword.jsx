import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Check, Loader2, Lock, Eye, EyeOff } from 'lucide-react';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const resetToken = searchParams.get('token') || searchParams.get('resetToken') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const validate = () => password.length >= 6 && password === confirm;

  const handleSubmit = async () => {
    if (!validate()) {
      setError(password.length < 6 ? 'הסיסמה חייבת להכיל לפחות 6 תווים.' : 'הסיסמאות אינן תואמות.');
      return;
    }
    if (!resetToken) {
      setError('קישור איפוס הסיסמה אינו תקין או פג תוקף. בקש איפוס סיסמה חדש.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await base44.auth.resetPassword({ resetToken, newPassword: password });
      setSuccess(true);
    } catch (err) {
      const msg = String(err?.response?.data?.detail || err?.message || '');
      setError(msg || 'שגיאה באיפוס הסיסמה. הקישור עשוי להיות פג תוקף — בקש איפוס חדש.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div dir="rtl" style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', background: 'var(--surface-1)', textAlign: 'center' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg, #16a34a, #15803d)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, boxShadow: '0 8px 32px rgba(22,163,74,0.3)' }}>
          <Check size={36} color="white" strokeWidth={3} />
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: 'var(--text-1)', margin: 0, marginBottom: 8 }}>הסיסמה אופסה! ✅</h1>
        <p style={{ fontSize: 14, color: 'var(--text-2)', margin: 0, marginBottom: 24, lineHeight: 1.6 }}>
          כעת תוכל להתחבר עם הסיסמה החדשה.
        </p>
        <button
          onClick={() => navigate('/')}
          style={{ width: '100%', maxWidth: 320, padding: '15px 0', borderRadius: 16, background: 'linear-gradient(135deg, #1a6fd4, #0a52b0)', color: 'white', fontSize: 16, fontWeight: 900, border: 'none', cursor: 'pointer', boxShadow: '0 8px 24px rgba(26,111,212,0.3)' }}
        >
          המשך לכניסה
        </button>
      </div>
    );
  }

  return (
    <div dir="rtl" style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', background: 'var(--surface-1)' }}>
      <div style={{ width: '100%', maxWidth: 360 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ width: 56, height: 56, borderRadius: 18, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, border: '1px solid #bfdbfe' }}>
            <Lock size={26} color="#1a6fd4" />
          </div>
          <h1 style={{ fontSize: 20, fontWeight: 900, color: 'var(--text-1)', margin: 0, marginBottom: 6 }}>איפוס סיסמה</h1>
          <p style={{ fontSize: 13, color: 'var(--text-3)', margin: 0, textAlign: 'center', lineHeight: 1.5 }}>
            בחר סיסמה חדשה לחשבון שלך
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ position: 'relative' }}>
            <input
              type={showPwd ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
              placeholder="סיסמה חדשה (6 תווים לפחות)"
              dir="ltr"
              autoFocus
              style={{ width: '100%', height: 52, borderRadius: 14, border: '1.5px solid var(--border-1)', padding: '0 48px 0 16px', fontSize: 15, background: 'var(--surface-2)', color: 'var(--text-1)', outline: 'none', boxSizing: 'border-box' }}
            />
            <button onClick={() => setShowPwd(v => !v)} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, display: 'flex' }}>
              {showPwd ? <EyeOff size={18} color="#94a3b8" /> : <Eye size={18} color="#94a3b8" />}
            </button>
          </div>
          <input
            type={showPwd ? 'text' : 'password'}
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); }}
            placeholder="אימות סיסמה חדשה"
            dir="ltr"
            style={{ width: '100%', height: 52, borderRadius: 14, border: '1.5px solid var(--border-1)', padding: '0 16px', fontSize: 15, background: 'var(--surface-2)', color: 'var(--text-1)', outline: 'none', boxSizing: 'border-box' }}
          />
          {error && <div style={{ fontSize: 12, color: '#dc2626', fontWeight: 600 }}>{error}</div>}
          <button
            onClick={handleSubmit}
            disabled={loading || !validate()}
            style={{
              width: '100%', height: 52, borderRadius: 16,
              background: validate() ? 'linear-gradient(135deg,#1a6fd4,#0a52b0)' : '#e2e8f0',
              color: validate() ? 'white' : '#94a3b8',
              fontWeight: 800, fontSize: 15, border: 'none',
              cursor: validate() && !loading ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : 'אפס סיסמה'}
          </button>
          <button
            onClick={() => navigate('/')}
            style={{ background: 'none', border: 'none', color: '#1a6fd4', fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 0, textAlign: 'center', width: '100%' }}
          >
            חזרה לדף הבית
          </button>
        </div>
      </div>
    </div>
  );
}