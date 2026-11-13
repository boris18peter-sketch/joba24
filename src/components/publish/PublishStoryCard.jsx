import { Sparkles, Zap } from 'lucide-react';

/**
 * PublishStoryCard — the optional "post as a story" toggle of the publish form.
 *
 * Moved out of the form page unchanged: same look, same copy, same credit guard
 * (the story costs credits, so trying to switch it on without enough of them
 * raises the credits sheet through `onNeedCredits` instead of silently doing
 * nothing).
 */
export default function PublishStoryCard({ isStory, onToggle, onNeedCredits, credits = 0, t }) {
  return (
    <div
      onClick={() => {
        if (!isStory && credits < 10) {
          onNeedCredits?.();
          return;
        }
        onToggle?.();
      }}
      style={{
        background: isStory ? 'linear-gradient(135deg,#fdf4ff,#f3e8ff)' : 'var(--card-bg)',
        border: `2px solid ${isStory ? '#a855f7' : 'var(--border-1)'}`,
        borderRadius: 20, padding: '16px', cursor: 'pointer',
        boxShadow: isStory ? '0 4px 20px rgba(168,85,247,0.2)' : '0 2px 12px rgba(26,111,212,0.06)',
        transition: 'all 0.2s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <div style={{ width: 20, height: 20, borderRadius: 6, border: `2px solid ${isStory ? '#a855f7' : '#cbd5e1'}`, background: isStory ? '#a855f7' : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          {isStory && <span style={{ color: 'var(--brand-btn-primary-text, white)', fontSize: 11 }}>✓</span>}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: isStory ? '#7e22ce' : '#111', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Sparkles size={15} color="#a855f7" /> {t('ct_story')}
            <span style={{ fontSize: 10, fontWeight: 800, background: '#f59e0b', color: 'var(--brand-btn-primary-text, white)', padding: '2px 7px', borderRadius: 20, marginRight: 4 }}>{t('ct_recommended')}</span>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: isStory ? 'rgba(168,85,247,0.08)' : 'var(--surface-3)', borderRadius: 12, padding: '10px 12px' }}>
        <Zap size={18} color="#a855f7" />
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: isStory ? '#7e22ce' : 'var(--text-1)' }}>{t('ct_story_3x')}</div>
          <div style={{ fontSize: 11, color: '#888', marginTop: 1 }}>{t('ct_story_help')}</div>
        </div>
      </div>
    </div>
  );
}