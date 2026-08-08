import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { calculateTrustScore, getTrustLevel, getCompletedCount, getTrustLevelLabel } from '@/lib/trustScore';
import { isUserVerified } from '@/lib/utils';
import { Star, X, Shield, Briefcase, TrendingUp } from 'lucide-react';
import VerifyModal from '@/components/VerifyModal';
import { useLanguage } from '@/lib/LanguageContext';

// A single clean metric row for the trust breakdown.
function MetricRow({ icon, label, points, max, color, status, done }) {
  const pct = Math.round((points / max) * 100);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '4px 0' }}>
      <div style={{
        width: 34, height: 34, borderRadius: 10,
        background: done ? '#f0fdf4' : `${color}14`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)' }}>{label}</span>
          <span style={{ fontSize: 12, fontWeight: 800, color: done ? '#059669' : 'var(--text-2)' }}>{points}/{max}{done ? ' ✓' : ''}</span>
        </div>
        <div style={{ height: 6, background: 'var(--surface-3)', borderRadius: 99, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${pct}%`, background: done ? '#10b981' : color, borderRadius: 99, transition: 'width 0.5s ease' }} />
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 4, lineHeight: 1.4 }}>{status}</div>
      </div>
    </div>
  );
}

function NextStep({ user, completedCount, trustScore, onVerify, color }) {
  const { t } = useLanguage();
  const verified = isUserVerified(user);
  const tasksToMax = Math.max(0, 20 - completedCount);

  let step = null;
  if (!verified) {
    step = {
      icon: <Shield size={15} color="#1a6fd4" />,
      title: t('tc_verify_identity'),
      desc: t('tc_verify_desc'),
      ctaLabel: t('tc_verify_now'),
      cta: onVerify,
      color: '#1a6fd4',
    };
  } else if (tasksToMax > 0) {
    step = {
      icon: <Briefcase size={15} color="#059669" />,
      title: t('tc_do_more_tasks', { n: tasksToMax }),
      desc: t('tc_task_points'),
      color: '#059669',
    };
  } else {
    step = {
      icon: <TrendingUp size={15} color="#059669" />,
      title: t('tc_max_score'),
      desc: t('tc_keep_going'),
      color: '#059669',
    };
  }

  return (
    <div
      onClick={step.cta}
      style={{
        marginTop: 14,
        display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 14,
        background: step.color + '12', border: `1px solid ${step.color}30`,
        cursor: step.cta ? 'pointer' : 'default',
      }}
    >
      <div style={{ width: 30, height: 30, borderRadius: 9, background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        {step.icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 800, color: step.color }}>{step.title}</div>
        <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 1, lineHeight: 1.4 }}>{step.desc}</div>
      </div>
      {step.ctaLabel && (
        <span style={{ fontSize: 11, fontWeight: 800, color: step.color, background: 'white', padding: '4px 10px', borderRadius: 8, border: `1px solid ${step.color}30`, flexShrink: 0 }}>{step.ctaLabel}</span>
      )}
    </div>
  );
}

function DetailsPopup({ user, reviews, tasks, trustScore, trustLevel, mainColor, onClose, isPublic }) {
  const { t, isRTL } = useLanguage();
  const [showVerify, setShowVerify] = useState(false);
  const completedCount = getCompletedCount(tasks, user);
  const verified = isUserVerified(user);

  const rating = user?.rating || 0;
  const ratingCount = user?.rating_count || (Array.isArray(reviews) ? reviews.length : 0);
  const ratingPoints = (rating > 0 && ratingCount >= 1) ? Math.round((rating / 5) * 30) : 0;
  const taskPoints = Math.min(Math.round(completedCount * 1.5), 30);

  return createPortal(
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(10,20,50,0.45)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', animation: 'tcFadeIn 0.18s ease' }}>
      <style>{`
        @keyframes tcSlideUp { from { transform: translateY(24px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes tcFadeIn { from { opacity: 0; } to { opacity: 1; } }
      `}</style>
      <div
        dir={isRTL ? 'rtl' : 'ltr'}
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--surface-2)', borderRadius: '22px 22px 0 0',
          width: '100%', maxWidth: 480,
          padding: '20px 20px max(24px, env(safe-area-inset-bottom))',
          animation: 'tcSlideUp 0.22s cubic-bezier(0.34,1.4,0.64,1)',
          boxShadow: '0 -12px 40px rgba(0,0,0,0.18)',
          maxHeight: '90dvh', overflowY: 'auto',
        }}
      >
        {/* Drag handle */}
        <div style={{ width: 36, height: 4, background: 'var(--border-1)', borderRadius: 99, margin: '0 auto 18px' }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-1)' }}>{t('tc_trust_meter')}</div>
            <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 2 }}>{t('tc_what_builds')}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ fontSize: 24, fontWeight: 900, color: trustLevel.color, lineHeight: 1 }}>{trustScore}%</div>
            <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: 10, background: 'var(--surface-3)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <X size={14} color="var(--text-3)" />
            </button>
          </div>
        </div>

        {/* Score summary bar */}
        <div style={{ height: 12, background: 'var(--surface-3)', borderRadius: 99, overflow: 'hidden', marginBottom: 4 }}>
          <div style={{ height: '100%', width: `${trustScore}%`, background: mainColor, borderRadius: 99, boxShadow: `0 0 10px ${mainColor}80`, transition: 'width 0.6s ease' }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: mainColor }}>✨ {getTrustLevelLabel(trustLevel, t)}</span>
          <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{t('tc_out_of_100')}</span>
        </div>

        {/* Breakdown */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 16, borderTop: '1px solid var(--border-1)' }}>
          <MetricRow
            icon={<Shield size={16} color={verified ? '#059669' : '#94a3b8'} />}
            label={t('tc_identity_verify')}
            points={verified ? 40 : 0}
            max={40}
            color="#1a6fd4"
            done={verified}
            status={verified ? t('tc_identity_verified') : t('tc_identity_pending')}
          />
          <MetricRow
            icon={<Star size={16} color="#d97706" fill="#fbbf24" />}
            label={`${t('tc_rating_label')}${rating > 0 ? ` · ${rating.toFixed(1)}★` : ''}`}
            points={ratingPoints}
            max={30}
            color="#d97706"
            done={ratingPoints >= 30}
            status={ratingCount > 0 ? t('tc_rating_status', { n: ratingCount }) : t('tc_rating_empty')}
          />
          <MetricRow
            icon={<Briefcase size={16} color="#7c3aed" />}
            label={t('tc_exp_label', { n: completedCount })}
            points={taskPoints}
            max={30}
            color="#7c3aed"
            done={taskPoints >= 30}
            status={taskPoints >= 30 ? t('tc_exp_max') : t('tc_exp_progress')}
          />
        </div>

        {/* Single next step — hidden on public profiles (improvement guidance is private) */}
        {!isPublic && (
          <NextStep
            user={user}
            completedCount={completedCount}
            trustScore={trustScore}
            onVerify={() => setShowVerify(true)}
            color={mainColor}
          />
        )}

        {!isPublic && showVerify && (
          <VerifyModal onClose={() => { setShowVerify(false); onClose(); }} onSuccess={() => setShowVerify(false)} />
        )}
      </div>
    </div>,
    document.body
  );
}

// Color that transitions red→orange→yellow→green based on progress 0-100
function getBarColor(w) {
  if (w < 25) return '#ef4444';
  if (w < 45) return '#f97316';
  if (w < 65) return '#eab308';
  if (w < 82) return '#84cc16';
  return '#16a34a';
}

export default function TrustCard({ user, reviews = [], tasks = [], isPublic = false }) {
  const { t, isRTL } = useLanguage();
  const [open, setOpen] = useState(false);
  const [displayWidth, setDisplayWidth] = useState(0);
  const animRef = useRef(null);

  const trustScore = calculateTrustScore(user, { tasks, reviews });
  const trustLevel = getTrustLevel(trustScore);

  useEffect(() => {
    if (!user || trustScore === 0) return;
    const target = trustScore;
    const startTime = performance.now();
    const animate = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / 1200, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayWidth(Math.round(eased * target));
      if (progress < 1) animRef.current = requestAnimationFrame(animate);
    };
    const t = setTimeout(() => { animRef.current = requestAnimationFrame(animate); }, 150);
    return () => { clearTimeout(t); if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [trustScore, user]);

  if (!user || trustScore === 0) return null;

  const barColor = getBarColor(displayWidth);

  return (
    <>
      <div
        dir={isRTL ? 'rtl' : 'ltr'}
        onClick={() => setOpen(true)}
        style={{ background: 'var(--surface-2)', border: '1px solid var(--border-1)', borderRadius: 14, padding: '12px 14px', cursor: 'pointer', userSelect: 'none' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 18, fontWeight: 900, color: barColor, letterSpacing: -0.5, transition: 'color 0.15s' }}>{displayWidth}%</span>
          </div>
          <span style={{ fontSize: 11, fontWeight: 700, color: barColor, transition: 'color 0.15s' }}>{t('tc_trust_meter')}</span>
        </div>
        <div style={{ height: 10, background: '#e8f5e9', borderRadius: 99, overflow: 'hidden', marginBottom: 8 }}>
          <div style={{ height: '100%', width: `${displayWidth}%`, borderRadius: 99, background: barColor, boxShadow: `0 0 10px ${barColor}80`, transition: 'background-color 0.1s, box-shadow 0.1s' }} />
        </div>
        <div style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: barColor, transition: 'color 0.15s' }}>✨ {getTrustLevelLabel(trustLevel, t)}</div>
      </div>

      {open && (
        <DetailsPopup user={user} reviews={reviews} tasks={tasks} trustScore={trustScore} trustLevel={trustLevel} mainColor={barColor} onClose={() => setOpen(false)} isPublic={isPublic} />
      )}
    </>
  );
}