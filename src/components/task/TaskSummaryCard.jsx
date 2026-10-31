import { MapPin, MoreVertical, Share, X, Play, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import TaskChip from '@/components/task/TaskChip';
import TaskImage from '@/components/TaskImage';
import UserBadge from '@/components/UserBadge';
import { isUserVerified, hasSocialVerified } from '@/lib/utils';
import { calculateCurrentPrice, formatHourlySublabel } from '@/lib/priceCalculator';
import { useLanguage } from '@/lib/LanguageContext';

/**
 * ZONE 1 — TASK SUMMARY.
 *
 * The four facts a visitor must read in the first second: what the task is,
 * where it is, who published it and how much it pays. Nothing else belongs
 * here: no second copy of the title, no statistics that another zone already
 * shows, no coloured hero. One surface, one hierarchy, for every status.
 */

const ICON_BTN = {
  width: 30, height: 30, borderRadius: 9,
  background: 'var(--surface-3)', border: 'none',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', color: 'var(--text-2)', flexShrink: 0,
};

export default function TaskSummaryCard({
  task, title, isTranslated, isTranslating, isOwner,
  statusLabel, statusTone, StatusIcon, distKm, agoLabel, clientUser,
  mediaIdx, onSetMediaIdx, onOpenMedia, onShare, onMenu, onClose, closable,
}) {
  const { t } = useLanguage();

  const allMedia = [
    ...(task.images || []).map(url => ({ type: 'image', url })),
    ...(task.video_url ? [{ type: 'video', url: task.video_url }] : []),
  ];
  const shownMedia = allMedia.length ? (allMedia[mediaIdx] || allMedia[0]) : null;
  const hourlySub = formatHourlySublabel(task);

  return (
    <div style={{
      background: 'var(--brand-card-bg, var(--surface-2))',
      border: '1px solid var(--border-1)',
      borderRadius: 'var(--r-lg)',
      boxShadow: 'var(--shadow-xs)',
      padding: '12px 14px 13px',
    }}>
      {/* Status + the task's own tools */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 9 }}>
        <TaskChip tone={statusTone} icon={StatusIcon ? <StatusIcon size={11} strokeWidth={2.4} /> : null}>
          {statusLabel}
        </TaskChip>
        <div style={{ flex: 1 }} />
        {isOwner && onMenu && (
          <button className="j-icon-btn" onClick={(e) => { e.stopPropagation(); onMenu(); }} aria-label="More" style={ICON_BTN}>
            <MoreVertical size={15} />
          </button>
        )}
        <button className="j-icon-btn" onClick={onShare} aria-label={t('share_task')} style={ICON_BTN}>
          <Share size={15} />
        </button>
        {closable && (
          <button className="j-icon-btn" onClick={onClose} aria-label="Close" style={ICON_BTN}>
            <X size={15} />
          </button>
        )}
      </div>

      {/* What the task is */}
      <div style={{ fontSize: 19, fontWeight: 900, color: 'var(--text-1)', lineHeight: 1.3, letterSpacing: -0.3 }}>
        {title}
        {isTranslating && <Loader2 size={13} className="animate-spin" style={{ display: 'inline-block', marginInlineStart: 6, verticalAlign: 'middle', opacity: 0.6 }} />}
      </div>
      {isTranslated && (
        <div style={{ marginTop: 6 }}>
          <TaskChip tone="brand">{t('translated_badge')}</TaskChip>
        </div>
      )}

      {/* Where, how far, how fresh */}
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 7, fontSize: 11.5, fontWeight: 600, color: 'var(--text-3)' }}>
        {task.location_name && (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: 'var(--text-2)' }}>
            <MapPin size={11} strokeWidth={2} />
            {task.location_name}
            {distKm != null && !isNaN(distKm) && ` · ${distKm < 1 ? `${Math.round(distKm * 1000)}${t('meters_short')}` : `${distKm.toFixed(1)}${t('km_short')}`}`}
          </span>
        )}
        {agoLabel && <span>· {agoLabel}</span>}
      </div>

      {/* Who is asking — the worker needs this; the publisher does not need
          their own name read back to them. */}
      {task.client_name && !isOwner && (
        <div style={{ marginTop: 9 }}>
          <UserBadge
            name={task.client_name}
            userId={task.client_id}
            verified={isUserVerified(clientUser) || task.client_verified}
            gold={hasSocialVerified(clientUser)}
            rating={task.client_rating}
            size="md"
          />
        </div>
      )}

      {/* How much it pays — the number the task is really about */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 10, marginTop: 11, paddingTop: 10, borderTop: '1px solid var(--border-1)' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 7, flexWrap: 'wrap', minWidth: 0 }}>
          <span style={{ fontSize: 24, fontWeight: 900, color: 'var(--text-1)', lineHeight: 1, letterSpacing: -0.6 }}>₪{Math.round(calculateCurrentPrice(task))}</span>
          {task.payment_method && (
            <span style={{ fontSize: 11.5, color: 'var(--text-3)', fontWeight: 600 }}>
              {task.payment_method === 'Cash' ? t('cash') : task.payment_method}
            </span>
          )}
          {hourlySub && <span style={{ fontSize: 10.5, color: 'var(--text-2)', fontWeight: 600 }}>{hourlySub}</span>}
        </div>

        {/* Media — one tile, opens the viewer */}
        {shownMedia && (
          <div style={{ flexShrink: 0, position: 'relative', width: 84, height: 68 }}>
            <button
              onClick={onOpenMedia}
              style={{ width: 84, height: 68, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border-1)', background: 'var(--surface-3)', padding: 0, cursor: 'pointer', display: 'block' }}
            >
              {shownMedia.type === 'image' ? (
                <TaskImage src={shownMedia.url} priority />
              ) : (
                <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                  <video src={shownMedia.url} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)' }}>
                    <Play size={16} color="white" fill="white" />
                  </div>
                </div>
              )}
            </button>
            {allMedia.length > 1 && (
              <div style={{ position: 'absolute', bottom: 4, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 3, pointerEvents: 'none' }}>
                {allMedia.length <= 5 ? allMedia.map((_, i) => (
                  <span key={i} style={{ width: i === mediaIdx ? 9 : 4, height: 4, borderRadius: 3, background: i === mediaIdx ? 'var(--brand-primary)' : 'var(--border-2)' }} />
                )) : (
                  <span style={{ fontSize: 9, color: 'var(--text-2)', fontWeight: 700, background: 'var(--surface-2)', borderRadius: 6, padding: '1px 5px' }}>{mediaIdx + 1}/{allMedia.length}</span>
                )}
              </div>
            )}
            {allMedia.length > 1 && (
              <>
                <button className="j-icon-btn" onClick={(e) => { e.stopPropagation(); onSetMediaIdx((mediaIdx - 1 + allMedia.length) % allMedia.length); }}
                  style={{ position: 'absolute', top: '50%', insetInlineStart: -6, transform: 'translateY(-50%)', width: 18, height: 18, borderRadius: '50%', background: 'var(--surface-2)', border: '1px solid var(--border-1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, zIndex: 2 }}>
                  <ChevronLeft size={10} color="var(--text-2)" strokeWidth={2.5} />
                </button>
                <button className="j-icon-btn" onClick={(e) => { e.stopPropagation(); onSetMediaIdx((mediaIdx + 1) % allMedia.length); }}
                  style={{ position: 'absolute', top: '50%', insetInlineEnd: -6, transform: 'translateY(-50%)', width: 18, height: 18, borderRadius: '50%', background: 'var(--surface-2)', border: '1px solid var(--border-1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0, zIndex: 2 }}>
                  <ChevronRight size={10} color="var(--text-2)" strokeWidth={2.5} />
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* The publisher's own reach — one quiet line, and the ONLY place these
          numbers appear in the sheet (the active panel no longer repeats them). */}
      {isOwner && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, paddingTop: 9, borderTop: '1px solid var(--border-1)' }}>
          {[
            { val: task.views_count || 0, label: t('views') },
            { val: task.clicks_count || 0, label: t('clicks') || t('entries') },
          ].map(({ val, label }, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 4, minWidth: 0 }}>
              <span style={{ fontSize: 12.5, fontWeight: 900, color: 'var(--text-2)' }}>{val}</span>
              <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>{label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}