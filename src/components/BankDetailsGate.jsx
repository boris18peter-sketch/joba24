/**
 * BankDetailsGate
 * One-time bank details collection before first task application.
 * Stores IBAN + full name for manual payouts.
 */
import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Loader2, CheckCircle2, Wallet } from 'lucide-react';

export default function BankDetailsGate({ onReady, onClose }) {
  const [status, setStatus] = useState('checking'); // checking | needed | done
  const [iban, setIban] = useState('');
  const [fullName, setFullName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    checkExisting();
  }, []);

  const checkExisting = async () => {
    setStatus('checking');
    const user = await base44.auth.me();
    if (user?.bank_iban) {
      setStatus('done');
      setTimeout(() => onReady?.(), 400);
    } else {
      setFullName(user?.full_name || '');
      setStatus('needed');
    }
  };

  const handleSave = async () => {
    setError('');
    const cleaned = iban.replace(/\s/g, '');
    if (cleaned.length < 10) {
      setError('אנא הזן מספר חשבון בנק תקין');
      return;
    }
    setSaving(true);
    await base44.auth.updateMe({ bank_iban: cleaned, bank_name: fullName });
    setStatus('done');
    setTimeout(() => onReady?.(), 600);
    setSaving(false);
  };

  return (
    <div className="mobile-sheet-overlay">
      <div dir="rtl" className="mobile-sheet" style={{ width: '100%', maxWidth: 480 }}>
        <div style={{ width: 40, height: 4, borderRadius: 99, background: '#dde4ef', margin: '12px auto 0' }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Wallet size={18} color="#1a6fd4" />
            <span style={{ fontWeight: 900, fontSize: 16, color: '#0f2b6b' }}>פרטי חשבון לתשלום</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, fontSize: 20, color: '#888' }}>✕</button>
        </div>

        <div style={{ padding: '12px 20px 32px' }}>

          {status === 'checking' && (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <Loader2 size={28} color="#1a6fd4" style={{ margin: '0 auto 12px' }} className="animate-spin" />
              <div style={{ fontSize: 14, color: '#888' }}>בודק פרטים...</div>
            </div>
          )}

          {status === 'needed' && (
            <>
              <div style={{ fontSize: 13, color: '#3b6aab', marginBottom: 18, lineHeight: 1.6 }}>
                כדי לקבל תשלום על הג'ובות שלך, נצטרך את מספר חשבון הבנק שלך. פעולה זו נדרשת <strong>פעם אחת בלבד</strong>.
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 13, fontWeight: 700, color: '#0f2b6b', display: 'block', marginBottom: 6 }}>שם מלא</label>
                <input
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="ישראל ישראלי"
                  style={{ width: '100%', height: 50, borderRadius: 12, border: '1.5px solid #dce8f5', padding: '0 14px', fontSize: 15, background: '#f8fbff', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 700, color: '#0f2b6b', display: 'block', marginBottom: 6 }}>מספר IBAN / חשבון בנק</label>
                <input
                  value={iban}
                  onChange={e => setIban(e.target.value)}
                  placeholder="IL00 0000 0000 0000 0000 000"
                  style={{ width: '100%', height: 50, borderRadius: 12, border: error ? '1.5px solid #ef4444' : '1.5px solid #dce8f5', padding: '0 14px', fontSize: 15, background: '#f8fbff', boxSizing: 'border-box', direction: 'ltr', textAlign: 'right' }}
                />
                {error && <div style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>{error}</div>}
              </div>

              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '8px 12px', marginBottom: 18, fontSize: 11.5, color: '#15803d', display: 'flex', gap: 6 }}>
                🔒 הפרטים שמורים בצורה מאובטחת ומשמשים רק להעברת תשלומים
              </div>

              <button
                onClick={handleSave}
                disabled={saving || !iban.trim() || !fullName.trim()}
                style={{ width: '100%', height: 54, borderRadius: 16, background: saving || !iban.trim() || !fullName.trim() ? '#93c5fd' : 'linear-gradient(135deg,#1a6fd4,#0a52b0)', border: 'none', color: 'white', fontWeight: 900, fontSize: 16, cursor: saving ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: '0 4px 16px rgba(26,111,212,0.3)' }}
              >
                {saving ? <Loader2 size={18} className="animate-spin" /> : 'שמור והמשך'}
              </button>
              <button onClick={onClose} style={{ width: '100%', marginTop: 10, height: 44, borderRadius: 14, background: 'transparent', border: '1px solid #dce8f5', color: '#666', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
                לא עכשיו
              </button>
            </>
          )}

          {status === 'done' && (
            <div style={{ textAlign: 'center', padding: '28px 0' }}>
              <CheckCircle2 size={52} color="#16a34a" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontSize: 20, fontWeight: 900, color: '#166534', marginBottom: 6 }}>הפרטים נשמרו! 🎉</div>
              <div style={{ fontSize: 14, color: '#15803d' }}>עכשיו אפשר להגיש בקשה</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}