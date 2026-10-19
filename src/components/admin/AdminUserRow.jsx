import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import {
  Loader2, UserCheck, CheckCircle2, Ban, Users, Star, ExternalLink,
  Instagram, Facebook, Music2, Award, ShieldCheck, Coins, Copy, Check,
  ChevronDown, ChevronUp,
} from 'lucide-react';
import GoldBadge from '@/components/GoldBadge';
import CopyableId from '@/components/CopyableId';
import { getCategoryLabel } from '@/lib/categories';
import { isUserVerified, hasSocialVerified } from '@/lib/utils';
import { resolveUserAccess } from '@/lib/userAccess';

export function SetAgentModal({ user, onClose, onSave }) {
  const [rate, setRate] = useState(user.commission_rate || 10);
  const [loading, setLoading] = useState(false);
  const isAgent = user.role === 'agent';

  const handleSave = async () => {
    setLoading(true);
    try {
      const agentCode = user.agent_code || `AGENT_${user.id.slice(-6).toUpperCase()}`;
      await onSave(user, { role: 'agent', commission_rate: Number(rate), agent_code: agentCode });
      setLoading(false);
      onClose();
    } catch {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    setLoading(true);
    try {
      await onSave(user, { role: 'user', commission_rate: 0, agent_code: null });
      setLoading(false);
      onClose();
    } catch {
      setLoading(false);
    }
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(5,15,40,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface-2)', borderRadius: 20, padding: 24, width: '100%', maxWidth: 360 }} dir="rtl">
        <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--text-1)', marginBottom: 4 }}>הגדרת סוכן</div>
        <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 20 }}>{user.full_name} · {user.email}</div>
        <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>אחוז עמלה (%)</label>
        <input type="number" value={rate} onChange={e => setRate(e.target.value)} min={0} max={100}
          style={{ width: '100%', height: 42, borderRadius: 10, border: '1px solid var(--border-1)', paddingRight: 12, paddingLeft: 12, fontSize: 16, outline: 'none', boxSizing: 'border-box', background: 'var(--surface-3)', color: 'var(--text-1)', marginBottom: 16 }} />
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleSave} disabled={loading} style={{ flex: 1, height: 42, borderRadius: 12, background: '#1a6fd4', color: 'white', border: 'none', fontWeight: 800, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            {loading ? <Loader2 size={14} className="animate-spin" /> : <><UserCheck size={14} /> {isAgent ? 'עדכן סוכן' : 'הגדר כסוכן'}</>}
          </button>
          {isAgent && (
            <button onClick={handleRemove} disabled={loading} style={{ height: 42, padding: '0 14px', borderRadius: 12, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              הסר סוכן
            </button>
          )}
          <button onClick={onClose} style={{ height: 42, padding: '0 14px', borderRadius: 12, background: 'var(--surface-3)', color: 'var(--text-2)', border: '1px solid var(--border-1)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
}

export function SendCreditsModal({ user, onClose, onSave }) {
  const [amount, setAmount] = useState(10);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    setLoading(true);
    try {
      await onSave(user, Number(amount), note.trim());
      onClose();
    } catch (e) {
      setLoading(false);
    }
  };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(5,15,40,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface-2)', borderRadius: 20, padding: 24, width: '100%', maxWidth: 360 }} dir="rtl">
        <div style={{ fontSize: 16, fontWeight: 900, color: 'var(--text-1)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Coins size={18} color="#d97706" /> שליחת ג'ובות
        </div>
        <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 12 }}>{user.full_name} · {user.email}</div>
        <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 16, padding: '8px 10px', background: '#fffbeb', borderRadius: 10, border: '1px solid #fde68a' }}>
          יתרה נוכחית: <strong style={{ color: '#d97706' }}>{user.worker_credits ?? 0}</strong> ג'ובות
        </div>
        <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>כמות ג'ובות (חיובי להוספה, שלילי להפחתה)</label>
        <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
          style={{ width: '100%', height: 42, borderRadius: 10, border: '1px solid var(--border-1)', paddingRight: 12, paddingLeft: 12, fontSize: 16, outline: 'none', boxSizing: 'border-box', background: 'var(--surface-3)', color: 'var(--text-1)', marginBottom: 12 }} />
        <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)', display: 'block', marginBottom: 6 }}>הערה (אופציונלי)</label>
        <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="פיצוי, בונוס, תיקון..."
          style={{ width: '100%', height: 42, borderRadius: 10, border: '1px solid var(--border-1)', paddingRight: 12, paddingLeft: 12, fontSize: 14, outline: 'none', boxSizing: 'border-box', background: 'var(--surface-3)', color: 'var(--text-1)', marginBottom: 16 }} />
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={handleSend} disabled={loading || !amount || amount === '0'}
            style={{ flex: 1, height: 42, borderRadius: 12, background: Number(amount) >= 0 ? '#d97706' : '#dc2626', color: 'white', border: 'none', fontWeight: 800, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            {loading ? <Loader2 size={14} className="animate-spin" /> : <><Coins size={14} /> שלח {amount > 0 ? '+' : ''}{amount || 0}</>}
          </button>
          <button onClick={onClose} style={{ height: 42, padding: '0 14px', borderRadius: 12, background: 'var(--surface-3)', color: 'var(--text-2)', border: '1px solid var(--border-1)', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
}

export default function UserRow({ user, onToggleBlock, onSetAgent, onSendCredits, isSelected, onToggleSelect, onAssignAgent, launchSettings }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showAgentModal, setShowAgentModal] = useState(false);
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();
  const isAgent = user.role === 'agent';
  // The user's REAL access, computed by the same rule the app enforces — so the
  // approve/revoke control can never contradict what the user is actually able
  // to do inside the app right now.
  const access = resolveUserAccess(user, launchSettings);

  const handleBlock = async (e) => {
    e.stopPropagation();
    setLoading(true);
    try {
      await onToggleBlock(user);
    } catch {}
    setLoading(false);
  };

  const handleCopyLink = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`${window.location.origin}/?ref=${user.agent_code}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
    <div style={{ background: user.is_blocked ? '#fef2f2' : isAgent ? '#f5f3ff' : 'var(--surface-2)', borderRadius: 14, border: `1px solid ${user.is_blocked ? '#fecaca' : isAgent ? '#ddd6fe' : 'var(--border-1)'}` , marginBottom: 8, overflow: 'hidden' }}>
      <div onClick={() => setOpen(v => !v)} style={{ padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
        <input type="checkbox" checked={!!isSelected} onClick={e => e.stopPropagation()} onChange={onToggleSelect} style={{ width: 18, height: 18, cursor: 'pointer', flexShrink: 0, accentColor: '#1a6fd4' }} />
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: isAgent ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : 'linear-gradient(135deg,#1a6fd4,#3b82f6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: 14, flexShrink: 0, overflow: 'hidden' }}>
          {user.profile_photo ? <img src={user.profile_photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : user.full_name?.[0] || '?'}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, color: 'var(--text-1)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
            {user.full_name}
            {isUserVerified(user) && hasSocialVerified(user) && <GoldBadge size="sm" />}
            {isUserVerified(user) && !hasSocialVerified(user) && <span title="מאומת" style={{ display: 'inline-flex', width: 14, height: 14, borderRadius: '50%', background: 'linear-gradient(135deg,#16a34a,#059669)', flexShrink: 0 }}><svg width="8" height="8" viewBox="0 0 10 10" fill="none" style={{ margin: 'auto' }}><path d="M2 5.5L4 7.5L8 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></span>}
            {isAgent && <span style={{ fontSize: 9, fontWeight: 800, background: '#7c3aed', color: 'white', padding: '1px 6px', borderRadius: 10 }}>סוכן</span>}
            {user.is_blocked && <span style={{ fontSize: 9, fontWeight: 800, background: '#dc2626', color: 'white', padding: '1px 6px', borderRadius: 10 }}>חסום</span>}
          </div>
          <div style={{ fontSize: 11, color: '#94a3b8', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span>{user.email} · {user.created_date ? format(new Date(user.created_date), 'dd/MM/yyyy') : ''}</span>
            {user.referred_by_agent_code ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 9, fontWeight: 700, background: 'rgba(124,58,237,0.1)', color: '#7c3aed', padding: '1px 6px', borderRadius: 6 }}>
                <Users size={8} /> סוכן: {user.referred_by_agent_code}
              </span>
            ) : (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 9, fontWeight: 700, background: 'var(--surface-3)', color: 'var(--text-3)', padding: '1px 6px', borderRadius: 6 }}>
                אורגני
              </span>
            )}
            {(() => {
              const plat = user.registration_platform || (user.registration_source === 'native' ? 'native' : 'web');
              const platMap = { ios: { label: '🍎', title: 'iOS' }, android: { label: '🤖', title: 'Android' }, native: { label: '📱', title: 'Native' }, web: { label: '🌐', title: 'Browser' } };
              const p = platMap[plat] || platMap.web;
              return <span title={p.title} style={{ fontSize: 10 }}>{p.label}</span>;
            })()}
          </div>
        </div>
        {user.rating > 0 && (
          <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: '#d97706', fontWeight: 700, flexShrink: 0 }}>
            <Star size={11} style={{ fill: '#fbbf24' }} /> {user.rating?.toFixed(1)}
          </span>
        )}
        <button onClick={e => { e.stopPropagation(); setShowAgentModal(true); }} style={{
          padding: '5px 10px', borderRadius: 10, cursor: 'pointer', fontSize: 11, fontWeight: 700,
          background: isAgent ? '#f5f3ff' : '#f0fdf4',
          color: isAgent ? '#7c3aed' : '#16a34a',
          display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
          border: `1px solid ${isAgent ? '#ddd6fe' : '#bbf7d0'}`,
        }}>
          <UserCheck size={11} /> {isAgent ? `${user.commission_rate}%` : 'סוכן'}
        </button>
        <button onClick={handleBlock} disabled={loading} style={{
          padding: '5px 10px', borderRadius: 10, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700,
          background: user.is_blocked ? '#dcfce7' : '#fef2f2',
          color: user.is_blocked ? '#16a34a' : '#dc2626',
          display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0,
        }}>
          {loading ? <Loader2 size={10} className="animate-spin" /> : user.is_blocked ? <><CheckCircle2 size={11} /> בטל חסימה</> : <><Ban size={11} /> חסום</>}
        </button>
        {open ? <ChevronUp size={14} color="#94a3b8" /> : <ChevronDown size={14} color="#94a3b8" />}
      </div>
      {open && (
        <div style={{ padding: '0 16px 14px', borderTop: '1px solid var(--border-1)', fontSize: 12, color: 'var(--text-2)', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/public-profile?id=${user.id}`); }}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, height: 36, borderRadius: 10, background: '#eff6ff', color: '#1a6fd4', border: '1px solid #bfdbfe', fontSize: 12, fontWeight: 800, cursor: 'pointer', marginTop: 8 }}
          >
            <ExternalLink size={13} /> פרופיל מלא באפליקציה
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
            {isUserVerified(user) ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: hasSocialVerified(user) ? '#fffbeb' : '#dcfce7', color: hasSocialVerified(user) ? '#92400e' : '#166534', border: `1px solid ${hasSocialVerified(user) ? '#fde68a' : '#bbf7d0'}` }}>
                {hasSocialVerified(user) ? <><Award size={12} /> מאומת זהב</> : <><ShieldCheck size={12} /> מאומת</>}
              </span>
            ) : (
              <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: '#f1f5f9', color: '#64748b' }}>
                לא מאומת
              </span>
            )}
            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: access.hasAccess ? '#dcfce7' : '#fef9c3', color: access.hasAccess ? '#166534' : '#854d0e' }}>
              {access.hasAccess ? '✓ מאושר' : '⏳ ממתין'}
            </span>
            {access.releasedByLaunch && (
              <span title="האפליקציה פתוחה לכולם בהגדרות ההשקה, ולכן כל משתמש רשום נכנס גם בלי אישור אישי" style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: '#eff6ff', color: '#1a6fd4', border: '1px solid #bfdbfe' }}>
                🔓 פתוח לכולם
              </span>
            )}
            {user.kyc_status && (
              <span style={{ fontSize: 10, fontWeight: 600, color: '#94a3b8' }}>KYC: {user.kyc_status}</span>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 4 }}>
            {user.phone && (
              <div style={{ background: 'var(--surface-3)', borderRadius: 8, padding: '6px 10px' }}>
                <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>טלפון</div>
                <a href={`tel:${user.phone}`} style={{ color: '#1a6fd4', textDecoration: 'none', fontWeight: 700 }}>{user.phone}</a>
              </div>
            )}
            {user.email && (
              <div style={{ background: 'var(--surface-3)', borderRadius: 8, padding: '6px 10px' }}>
                <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>אימייל</div>
                <div style={{ fontWeight: 700, fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis' }}>{user.email}</div>
              </div>
            )}
            {user.id_number && (
              <div style={{ background: 'var(--surface-3)', borderRadius: 8, padding: '6px 10px' }}>
                <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>ת.ז.</div>
                <div style={{ fontWeight: 700, letterSpacing: 1 }}>{user.id_number}</div>
              </div>
            )}
            {user.profession && (
              <div style={{ background: 'var(--surface-3)', borderRadius: 8, padding: '6px 10px' }}>
                <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>מקצוע</div>
                <div style={{ fontWeight: 700 }}>{user.profession}</div>
              </div>
            )}
          </div>

          {(user.instagram_username || user.facebook_username || user.tiktok_username) && (
            <div style={{ background: 'var(--surface-3)', borderRadius: 10, padding: '8px 10px', marginTop: 2 }}>
              <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                <ExternalLink size={11} /> רשתות חברתיות
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {user.instagram_username && (
                  <a href={`https://instagram.com/${user.instagram_username}`} target="_blank" rel="noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 8, background: 'white', border: `1px solid ${user.instagram_verified ? '#fde68a' : 'var(--border-1)'}`, textDecoration: 'none', fontSize: 11, fontWeight: 700, color: 'var(--text-1)' }}>
                    <Instagram size={12} color="#dc2743" />
                    @{user.instagram_username}
                    {user.instagram_verified && <Award size={10} color="#d97706" />}
                  </a>
                )}
                {user.facebook_username && (
                  <a href={`https://facebook.com/${user.facebook_username}`} target="_blank" rel="noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 8, background: 'white', border: `1px solid ${user.facebook_verified ? '#fde68a' : 'var(--border-1)'}`, textDecoration: 'none', fontSize: 11, fontWeight: 700, color: 'var(--text-1)' }}>
                    <Facebook size={12} color="#1877F2" />
                    @{user.facebook_username}
                    {user.facebook_verified && <Award size={10} color="#d97706" />}
                  </a>
                )}
                {user.tiktok_username && (
                  <a href={`https://tiktok.com/@${user.tiktok_username}`} target="_blank" rel="noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 8, background: 'white', border: `1px solid ${user.tiktok_verified ? '#fde68a' : 'var(--border-1)'}`, textDecoration: 'none', fontSize: 11, fontWeight: 700, color: 'var(--text-1)' }}>
                    <Music2 size={12} color="#000" />
                    @{user.tiktok_username}
                    {user.tiktok_verified && <Award size={10} color="#d97706" />}
                  </a>
                )}
              </div>
            </div>
          )}

          {user.bio && <div style={{ background: 'var(--surface-3)', borderRadius: 8, padding: '6px 10px' }}><strong>אודות:</strong> {user.bio}</div>}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginTop: 4 }}>
            <div style={{ background: 'var(--surface-3)', borderRadius: 8, padding: '6px 10px' }}>
              <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>מקור הרשמה</div>
              <div style={{ fontWeight: 700, color: 'var(--text-1)', fontSize: 12 }}>
                {user.referred_by_agent_code ? `סוכן: ${user.referred_by_agent_code}` : 'אורגני'}
              </div>
            </div>
            <div style={{ background: 'var(--surface-3)', borderRadius: 8, padding: '6px 10px' }}>
              <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600 }}>פלטפורמה</div>
              <div style={{ fontWeight: 700, color: 'var(--text-1)', fontSize: 12 }}>
                {(() => {
                  const plat = user.registration_platform || (user.registration_source === 'native' ? 'native' : 'web');
                  const map = { ios: 'Apple (iOS)', android: 'Android', native: 'נייטיב', web: 'דפדפן' };
                  return map[plat] || plat;
                })()}
              </div>
            </div>
          </div>

          {user.preferred_cities?.length > 0 && <div><strong>ערים:</strong> {user.preferred_cities.join(', ')}</div>}
          {user.preferred_categories?.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <strong>קטגוריות:</strong>
              {user.preferred_categories.map(c => (
                <span key={c} style={{ fontSize: 11, fontWeight: 600, color: '#1a6fd4', background: '#eff6ff', border: '1px solid #bfdbfe', padding: '1px 7px', borderRadius: 99 }}>
                  {getCategoryLabel(c)}
                </span>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-2)' }}>ג'ובות: <strong style={{ color: '#d97706' }}>{user.worker_credits ?? 0}</strong></span>
            <button
              onClick={(e) => { e.stopPropagation(); setShowCreditsModal(true); }}
              style={{ padding: '3px 10px', borderRadius: 10, background: '#fffbeb', color: '#d97706', border: '1px solid #fde68a', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <Coins size={11} /> שלח ג'ובות
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
            {/* Only the action that can actually change this user's access is
                offered: no "אשר גישה" for someone the app already lets in, and
                no "בטל גישה" where the grant does not come from an approval. */}
            {!access.hasAccess && (
              <button
                onClick={async (e) => { e.stopPropagation(); await onSetAgent(user, { is_approved: true }); }}
                style={{ padding: '3px 10px', borderRadius: 10, background: '#1a6fd4', color: 'white', border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
              >
                אשר גישה
              </button>
            )}
            {access.hasAccess && access.explicitlyApproved && (
              <button
                onClick={async (e) => { e.stopPropagation(); await onSetAgent(user, { is_approved: false }); }}
                style={{ padding: '3px 10px', borderRadius: 10, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}
              >
                בטל גישה
              </button>
            )}
            {access.releasedByLaunch && (
              <span style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, lineHeight: 1.4 }}>
                הגישה נובעת מכך שהאפליקציה פתוחה לכולם — אין כאן אישור אישי לבטל.
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2, flexWrap: 'wrap' }}>
            {user.referred_by_agent_code && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#7c3aed', background: '#f5f3ff', padding: '3px 8px', borderRadius: 8, fontWeight: 600 }}>
                שויך ל: {user.referred_by_agent_code}
              </span>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onAssignAgent(user); }}
              style={{ padding: '3px 10px', borderRadius: 10, background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              <UserCheck size={11} /> שייך לסוכן
            </button>
          </div>
          {isAgent && user.agent_code && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f5f3ff', borderRadius: 8, padding: '6px 10px', marginTop: 2 }}>
              <div style={{ flex: 1, fontSize: 11, color: '#7c3aed', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {window.location.origin}/?ref={user.agent_code}
              </div>
              <button onClick={handleCopyLink} style={{ background:!copied ? '#7c3aed' : '#16a34a', border: 'none', cursor: 'pointer', color: copied ? '#16a34a' : '#7c3aed', display: 'flex', padding: 2 }}>
                {copied ? <Check size={13} /> : <Copy size={13} />}
              </button>
            </div>
          )}
          {user.score_tasks > 0 && <div><strong>משימות הושלמו:</strong> {user.score_tasks}</div>}
          {user.rating_count > 0 && <div><strong>דירוגים שניתנו:</strong> {user.rating_count}</div>}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
              <span style={{ fontSize: 10, color: '#cbd5e1' }}>{user.created_date ? format(new Date(user.created_date), 'dd/MM/yyyy HH:mm') : ''}</span>
              {user.last_active_at && (() => {
                const daysSince = Math.floor((Date.now() - new Date(user.last_active_at).getTime()) / 86400000);
                if (daysSince <= 7) return <span style={{ fontSize: 9, color: '#16a34a', fontWeight: 600 }}>פעיל לאחרונה</span>;
                if (daysSince > 30) return <span style={{ fontSize: 9, color: '#dc2626', fontWeight: 600 }}>📱 לא פעיל {daysSince} ימים</span>;
                return <span style={{ fontSize: 9, color: '#d97706', fontWeight: 600 }}>לא פעיל {daysSince} ימים</span>;
              })()}
            </div>
            <CopyableId id={user.id} label="מזהה משתמש" />
          </div>
        </div>
      )}
    </div>
    {showAgentModal && <SetAgentModal user={user} onClose={() => setShowAgentModal(false)} onSave={onSetAgent} />}
    {showCreditsModal && <SendCreditsModal user={user} onClose={() => setShowCreditsModal(false)} onSave={onSendCredits} />}
    </>
  );
}