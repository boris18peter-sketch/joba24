import { ShieldCheck, Link2, Star, MessageCircle, Award } from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';

// Compact "Why trust this user?" summary — only shows signals that actually exist.
// Lets a first-time viewer grasp credibility in 3-5 seconds.
export default function ProfileWhyTrust({ isVerified, hasSocial, rating, reviewCount, reliabilityPct, completedCount }) {
  const { t } = useLanguage();
  const r = Number(rating) || 0;
  const items = [];
  if (isVerified) items.push({ icon: <ShieldCheck size={15} color="#16a34a" />, color: '#16a34a', text: t('pr_identity_verified') });
  if (hasSocial) items.push({ icon: <Link2 size={15} color="#d97706" />, color: '#d97706', text: t('pr_social_connected') });
  if (r > 0 && reviewCount > 0) items.push({ icon: <Star size={15} color="#d97706" fill="#fbbf24" />, color: '#d97706', text: `${r.toFixed(1)} / 5` });
  if (reviewCount > 0) items.push({ icon: <MessageCircle size={15} color="#1a6fd4" />, color: '#1a6fd4', text: t('pr_reviews_count', { n: reviewCount }) });
  if (reliabilityPct > 0) items.push({ icon: <ShieldCheck size={15} color="#16a34a" />, color: '#16a34a', text: `${reliabilityPct}% ${t('pr_reliability')}` });
  if (completedCount > 0) items.push({ icon: <Award size={15} color="#7c3aed" />, color: '#7c3aed', text: `${completedCount} ${t('pr_tasks_done_long')}` });

  if (items.length === 0) return null;

  return (
    <div dir="rtl" style={{
      background: 'linear-gradient(135deg, #f8fafc, #eff6ff)',
      borderRadius: 18,
      border: '1px solid #dbeafe',
      padding: '16px 16px 12px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
        <span style={{ fontSize: 13 }}>🛡️</span>
        <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--text-1)' }}>{t('pr_why_trust')}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
        {items.map((it, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 9, background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: `1px solid ${it.color}30` }}>
              {it.icon}
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>{it.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}