import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { useTaskSheet } from '@/lib/TaskSheetContext';
import { MapPin, Zap, X } from 'lucide-react';
import { getCategoryLabel } from '@/lib/categories';
import { actionableCategoryKey, globalCategoryFor } from '@/lib/brand/categoryRegistry';
import { categoryMatches } from '@/lib/brand/categoryTree';
import { useGlobalCategories } from '@/lib/brand/globalCategories';
import { useBrand } from '@/lib/brand/BrandProvider';
import { useQuery } from '@tanstack/react-query';
import { myApplicationsQuery } from '@/lib/queries';
import { useLanguage } from '@/lib/LanguageContext';
import { useTaskTranslation } from '@/hooks/useTaskTranslation';

function getDistanceKm(lat1, lng1, lat2, lng2) {
  if (!lat1 || !lng1 || !lat2 || !lng2) return null;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const DURATION = 18;

// ── Relevance ────────────────────────────────────────────────────────────────
// A task we can already tell is farther than this is never relevant, whatever
// else about it matches.
const MAX_DISTANCE_KM = 20;
// "Close enough to be worth a look" for a worker whose category does not match.
const NEARBY_KM = 3;
// A guest has no profile at all, so proximity is the only signal we can trust.
const GUEST_NEARBY_KM = 5;

/**
 * Why this task might interest this worker — one clear yes/no, not a points
 * total.
 *
 * The old weighted score quietly failed for exactly the people it existed to
 * serve: a worker whose only signal was being 4 km away totalled 10 and was
 * dropped, and a worker with no resolved location — or a task with no
 * coordinates — totalled 0 and was dropped for good, however well the task
 * fitted. Relevance is now a plain fact: this task fits what you do, OR it is
 * close enough to be worth a look. Nothing arithmetic sits between a genuinely
 * relevant worker and the popup.
 *
 * Category matching also has to survive the global catalogue still loading: with
 * an empty map a broad ROOT preference cannot be resolved to the task's service,
 * which used to be indistinguishable from "no interest at all".
 */
function evaluateMatch({ task, currentUser, userLocation, myApplications, myCompletedTasks, activeCategory, categoryMap }) {
  const taskKey = actionableCategoryKey(task);
  const matches = (key) => !!key && (key === taskKey || categoryMatches(taskKey, key, categoryMap));

  const dist = userLocation && task.lat && task.lng
    ? getDistanceKm(userLocation.lat, userLocation.lng, task.lat, task.lng)
    : null;

  // Never surface a task we can already tell is far away.
  if (dist !== null && dist > MAX_DISTANCE_KM) return { relevant: false, dist, categoryMatch: false };

  const categoryMatch =
    (currentUser?.preferred_categories || []).some(matches) ||
    myApplications.map(a => a._category).some(matches) ||
    myCompletedTasks.map(t => actionableCategoryKey(t)).some(matches) ||
    matches(activeCategory);

  const nearby = dist !== null && dist <= NEARBY_KM;

  return { relevant: categoryMatch || nearby, dist, categoryMatch };
}

export default function InstantMatchPopup({ userLocation, currentUserId, activeCategory }) {
  const { t, isRTL } = useLanguage();
  const [popup, setPopup] = useState(null);
  const [countdown, setCountdown] = useState(DURATION);
  const timerRef = useRef(null);
  const navigate = useNavigate();
  const { openTaskSheet } = useTaskSheet();
  const { brandId, isPlatformBrand } = useBrand();
  const { map: categoryMap } = useGlobalCategories();
  // The popup shows a task the moment it is posted — i.e. in whatever language
  // its publisher wrote it in. The same auto-translation every other task
  // surface uses is applied here too, so the popup never shows a Hebrew title to
  // someone reading the app in another language.
  const { translatedTask } = useTaskTranslation(popup?.task);

  // Fetch current user profile + past activity for smart matching
  const { data: currentUser } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
    enabled: !!currentUserId,
    staleTime: 120000,
  });
  // The canonical applications list (@/lib/queries). It used to declare the same
  // key with NO queryFn, which meant it could only ever read a cache somebody
  // else happened to have filled — and if it mounted first, React Query had no
  // fetcher for the key at all.
  const { data: myApplications = [] } = useQuery(myApplicationsQuery(currentUserId));
  const { data: myCompletedTasks = [] } = useQuery({
    queryKey: ['myCompletedTasks', currentUserId],
    queryFn: () => base44.entities.Task.filter({ worker_id: currentUserId, status: 'COMPLETED' }, '-created_date', 30),
    enabled: !!currentUserId,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  // Is the taxonomy actually loaded? A root preference ("חשמל") can only be
  // resolved to the exact service a task asks for ("תיקון קצר") through this map,
  // so while it is empty every signed-in match evaluates to "not relevant".
  const catalogueReady = Object.keys(categoryMap || {}).length > 0;

  const matchInputsRef = useRef(null);
  useEffect(() => {
    matchInputsRef.current = { currentUser, myApplications, myCompletedTasks, activeCategory, userLocation, categoryMap, catalogueReady };
  });

  // Already-shown keys live in a ref, not inside the effect: the effect is torn
  // down and rebuilt whenever the resolved Brand changes, and a fresh Set each
  // time let the same task pop a second time.
  const shownRef = useRef(new Set());

  // Tasks that arrived BEFORE the catalogue did. Parked here and decided the
  // moment it lands, never dropped — see the subscription below.
  const pendingRef = useRef([]);

  // The decision for one task. Held in a ref so the subscription can stay mounted
  // across profile / catalogue changes (see the note on the effect below).
  const handleTaskRef = useRef(null);
  handleTaskRef.current = ({ task, isNewTask, isBoosted }) => {
    const { currentUser, myApplications, myCompletedTasks, activeCategory, userLocation, categoryMap } = matchInputsRef.current;

    // Deduplicate — don't show same task twice quickly
    const dedupKey = `${task.id}_${isNewTask ? 'new' : task.last_boost_at}`;
    if (shownRef.current.has(dedupKey)) return;
    shownRef.current.add(dedupKey);

    // A task the worker has already applied to is never news to them.
    if (myApplications.some(a => a.task_id === task.id)) return;

    if (!currentUserId) {
      // A guest has no profile to match against, so only proximity counts.
      // An unknown location used to mean "show everything", which is the
      // opposite of precise.
      const guestDist = userLocation && task.lat && task.lng
        ? getDistanceKm(userLocation.lat, userLocation.lng, task.lat, task.lng)
        : null;
      if (guestDist === null || guestDist > GUEST_NEARBY_KM) return;
      setPopup({ task, dist: guestDist, isBoosted });
      setCountdown(DURATION);
      return;
    }

    const { relevant, dist } = evaluateMatch({ task, currentUser, userLocation, myApplications, myCompletedTasks, activeCategory, categoryMap });

    // A boost is the publisher paying for reach, so it clears the category bar
    // — but it still never travels beyond MAX_DISTANCE_KM.
    if (!isBoosted && !relevant) return;

    // For boosted tasks — also persist to localStorage notifications
    if (isBoosted) {
      const stored = JSON.parse(localStorage.getItem('joba24_notifications') || '[]');
      const alreadyStored = stored.some(n => n.taskId === task.id && n.type === 'boost_signal' &&
        Math.abs(Date.now() - new Date(n.timestamp).getTime()) < 60000);
      if (!alreadyStored) {
        const notif = {
          type: 'boost_signal',
          taskId: task.id,
          taskTitle: task.title,
          preview: `${task.location_name ? task.location_name.split(',')[0] + ' · ' : ''}₪${Math.round(task.price || 0)}`,
          timestamp: new Date().toISOString(),
          read: false,
        };
        localStorage.setItem('joba24_notifications', JSON.stringify([notif, ...stored].slice(0, 50)));
        window.dispatchEvent(new Event('joba24_notif_update'));
      }
    }

    setPopup({ task, dist, isBoosted });
    setCountdown(DURATION);
  };

  // The subscription is created ONCE per user and never torn down while the
  // feed is mounted. Re-subscribing whenever a profile / application / completed
  // task refetch produced a new array opened a gap in which a brand-new task
  // event was simply lost — which is why a matching task sometimes produced no
  // popup at all, and other times popped long after it was posted. That is also
  // why the decision itself lives in handleTaskRef above: this effect must keep
  // its identity, so it reads the latest inputs and logic through refs instead.
  useEffect(() => {
    const unsub = base44.entities.Task.subscribe(event => {
      const task = event.data;
      if (!task || task.status !== 'OPEN') return;
      // The realtime stream is global — on the platform Brand (Joba24) every
      // Brand's Tasks may appear; any other Brand shows only its own.
      if (!isPlatformBrand && task.origin_brand_id && task.origin_brand_id !== brandId) return;
      if (task.client_id === currentUserId) return;

      const isNewTask = event.type === 'create';
      const isBoosted = event.type === 'update' && task.last_boost_at &&
        (Date.now() - new Date(task.last_boost_at).getTime()) < 15000; // boosted within last 15s

      if (!isNewTask && !isBoosted) return;

      // ── NEVER DECIDE BEFORE THE TAXONOMY IS THERE ──────────────────────────
      // A root preference ("חשמל") resolves to the exact service a task asks for
      // ("תיקון קצר") only through the catalogue map. While that map is still
      // loading it is empty, categoryMatches can only answer "no", and a genuinely
      // matching task was discarded for good — which is why the popup silently
      // never appeared for exactly the people it exists to serve. Park the event
      // instead: the effect below decides it the moment the catalogue lands.
      if (currentUserId && !matchInputsRef.current.catalogueReady) {
        pendingRef.current.push({ task, isNewTask, isBoosted });
        return;
      }

      handleTaskRef.current({ task, isNewTask, isBoosted });
    });
    return unsub;
  }, [currentUserId, brandId, isPlatformBrand]);

  // The catalogue arrived — decide everything that was parked.
  useEffect(() => {
    if (!catalogueReady || !pendingRef.current.length) return;
    const parked = pendingRef.current;
    pendingRef.current = [];
    parked.forEach((e) => handleTaskRef.current(e));
  }, [catalogueReady]);

  useEffect(() => {
    if (!popup) return;
    timerRef.current = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(timerRef.current); setPopup(null); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [popup]);

  if (!popup) return null;

  const { task, dist, isBoosted } = popup;
  const progress = (countdown / DURATION) * 100;
  const isUrgent = countdown <= 6;

  return (
    <div style={{ position: 'fixed', bottom: 'calc(80px + max(0px, env(safe-area-inset-bottom)) + 12px)', left: 12, right: 12, zIndex: 100000 }} dir={isRTL ? 'rtl' : 'ltr'}>
      <style>{`
        @keyframes slideUpPop {
          from { opacity: 0; transform: translateY(40px) scale(0.94); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
      <div className="j-modal-surface" style={{
        background: 'var(--brand-modal-bg, var(--surface-2))',
        borderRadius: 22,
        overflow: 'hidden',
        boxShadow: '0 16px 60px rgba(0,0,0,0.2)',
        border: isUrgent ? '2px solid #ef4444' : '1.5px solid var(--border-1)',
        animation: 'slideUpPop 0.38s cubic-bezier(0.32, 1.2, 0.64, 1)',
        transition: 'border 0.3s',
      }}>
        {/* Progress bar */}
        <div style={{ height: 3, background: 'var(--surface-3)' }}>
          <div style={{
            height: '100%',
            background: isUrgent ? '#ef4444' : '#f59e0b',
            width: `${progress}%`,
            transition: 'width 1s linear, background 0.3s',
            borderRadius: 2,
          }} />
        </div>

        {/* Content */}
        <div style={{ padding: '14px 16px 16px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          {/* Left: icon */}
          <div style={{
            width: 48,
            height: 48,
            borderRadius: 14,
            background: isUrgent ? 'var(--color-danger-bg)' : 'var(--color-warning-bg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
            flexShrink: 0,
          }}>
            ⚡
          </div>

          {/* Middle: info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: isUrgent ? '#ef4444' : isBoosted ? '#7c3aed' : '#f59e0b', marginBottom: 3 }}>
              {isBoosted ? t('match_boost_title') : t('match_new_title')} • {countdown}s
            </div>
            <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--brand-modal-title, var(--text-1))', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4 }}>
              {translatedTask?.title || task.title}
            </div>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 16, fontWeight: 900, color: 'var(--text-1)' }}>₪{task.price}</span>
              {dist !== null && (
                <span style={{ fontSize: 12, color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: 3 }}>
                  <MapPin size={11} />
                  {dist < 1 ? `${Math.round(dist * 1000)}${t('meters_short')}` : `${dist.toFixed(1)}${t('km_short')}`}
                </span>
              )}
              {task.category && (
                <span style={{ fontSize: 11, background: 'var(--surface-3)', color: 'var(--text-2)', padding: '2px 7px', borderRadius: 20, fontWeight: 600 }}>
                  {globalCategoryFor(actionableCategoryKey(task))?.label || getCategoryLabel(actionableCategoryKey(task), t)}
                </span>
              )}
            </div>
          </div>

          {/* Close */}
          <button
            onClick={() => setPopup(null)}
            className="j-icon-btn"
            style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--surface-3)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
          >
            <X size={16} color="var(--text-3)" />
          </button>
        </div>

        {/* CTA */}
        <div style={{ padding: '0 16px 14px' }}>
          <button
            onClick={() => { openTaskSheet(task.id); setPopup(null); }}
            style={{
              width: '100%',
              height: 48,
              borderRadius: 14,
              background: `linear-gradient(135deg, var(--brand-modal-cta-bg, ${isUrgent ? '#ef4444' : '#f59e0b'}), var(--brand-modal-cta-bg, ${isUrgent ? '#dc2626' : '#d97706'}))`,
              color: 'var(--brand-modal-cta-text, white)',
              fontWeight: 900,
              fontSize: 15,
              border: 'none',
              cursor: 'pointer',
              boxShadow: isUrgent ? '0 4px 16px rgba(239,68,68,0.35)' : '0 4px 16px rgba(245,158,11,0.35)',
            }}
          >
            {isUrgent ? t('match_take_now') : t('match_view_now')}
          </button>
        </div>
      </div>
    </div>
  );
}