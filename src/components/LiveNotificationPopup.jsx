import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  X, MessageCircle, UserCheck, UserPlus, CheckCircle2, Send, XCircle,
  Car, MapPin, Star, Ban, Undo2, LogOut, AlertTriangle, Zap, PartyPopper,
} from 'lucide-react';
import { useLanguage } from '@/lib/LanguageContext';
import { useTaskSheet } from '@/lib/TaskSheetContext';

/**
 * LiveNotificationPopup — ONE notification banner.
 *
 * ── WHAT CHANGED AND WHY ────────────────────────────────────────────────────
 * This banner used to disappear by unmounting itself the instant its timer ran
 * out, so the exit was a hard cut — the card was there and then it was not. It
 * was also the only moving thing on screen with no counterpart: the entry was
 * animated and the exit was a deletion. The wrapper in GlobalPopups now owns
 * the exit through AnimatePresence, and this component simply stops existing
 * when its time is up, so the banner leaves as deliberately as it arrived.
 *
 * Three other things were doing the banner no favours:
 *
 * 1. Every type wore the same grey tile with a different emoji. Fifteen emoji
 *    in fifteen fonts is the single least designed-looking thing an app can
 *    put on screen. Each type now carries its own ACCENT and a line icon in
 *    that accent — green for a completed thing, blue for a conversation, red
 *    for a problem — so the colour alone tells the user what happened before
 *    they have read a word.
 * 2. The tap target and the drag target fought each other: a manual touchmove
 *    handler moved the card and a click handler fired underneath it. The card
 *    is now a real motion element with `drag="y"` and `onTap`, so a swipe
 *    dismisses and a tap opens, and neither one misfires as the other.
 * 3. The countdown bar sat on the card's top edge in the brand blue even on a
 *    red banner. It now carries the type's accent.
 *
 * The countdown is deliberately still visible: a banner that vanishes on its
 * own must show that it is about to.
 */
const DURATION = 6500;

export default function LiveNotificationPopup({ notification, onClose }) {
  const navigate = useNavigate();
  const { openTaskSheet } = useTaskSheet();
  const { t } = useLanguage();
  const [progress, setProgress] = useState(100);

  // ── THE TIMER MUST NOT RESTART WHEN A NEIGHBOUR ARRIVES ───────────────────
  // onClose is built fresh by GlobalPopups on every render, so putting it in the
  // effect's deps meant that every time a new banner was added, every banner
  // already on screen had its countdown reset — so a busy moment kept them all
  // alive indefinitely. The callback lives in a ref and the effect runs once.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const start = Date.now();
    const iv = setInterval(() => {
      setProgress(Math.max(0, 100 - ((Date.now() - start) / DURATION) * 100));
    }, 60);
    const timer = setTimeout(() => onCloseRef.current?.(), DURATION);
    return () => { clearInterval(iv); clearTimeout(timer); };
  }, []);

  const TYPES = {
    new_message:           { Icon: MessageCircle, accent: '#1a6fd4', title: (n) => `${t('notif_new_message')}${n.senderName || ''}`, body: (n) => n.preview || t('notif_preview'),                link: (n) => n.taskId ? `/chat/${n.taskId}${n.actorId ? `?with=${n.actorId}` : ''}` : null },
    task_taken:            { Icon: UserCheck,     accent: '#059669', title: ()  => t('notif_task_taken'),                               body: (n) => n.taskTitle ? `"${n.taskTitle}" — ${t('notif_click_approve')}` : t('notif_click_approve'), link: (n) => n.taskId ? `/task/${n.taskId}` : null },
    application_received:  { Icon: UserPlus,      accent: '#1a6fd4', title: ()  => t('notif_app_received'),                             body: (n) => n.taskTitle ? `"${n.taskTitle}" — ${t('notif_check')}` : t('notif_check'),  link: (n) => n.taskId ? `/task/${n.taskId}` : null },
    application_approved:  { Icon: CheckCircle2,  accent: '#059669', title: ()  => t('notif_app_approved'),                            body: (n) => n.taskTitle ? `"${n.taskTitle}" — ${t('notif_start')}` : t('notif_start'), link: (n) => n.taskId ? `/task/${n.taskId}` : null },
    application_sent:      { Icon: Send,          accent: '#64748b', title: ()  => t('notif_app_sent'),                                body: ()  => t('notif_waiting_publisher'),                     link: (n) => n.taskId ? `/task/${n.taskId}` : null },
    application_rejected:  { Icon: XCircle,       accent: '#dc2626', title: ()  => t('notif_app_rejected'),                            body: (n) => n.taskTitle ? `"${n.taskTitle}"` : t('notif_credits_returned'), link: (n) => n.taskId ? `/task/${n.taskId}` : null },
    worker_on_the_way:     { Icon: Car,           accent: '#0ea5e9', title: ()  => t('notif_on_the_way'),                              body: (n) => n.taskTitle ? `"${n.taskTitle}"` : t('notif_worker_coming'),  link: (n) => n.taskId ? `/task/${n.taskId}` : null },
    worker_arrived:        { Icon: MapPin,        accent: '#0ea5e9', title: ()  => t('notif_arrived'),                                 body: (n) => n.taskTitle ? `"${n.taskTitle}"` : t('notif_at_door'),           link: (n) => n.taskId ? `/task/${n.taskId}` : null },
    worker_done:           { Icon: CheckCircle2,  accent: '#059669', title: ()  => t('notif_done'),                                    body: (n) => n.taskTitle ? `"${n.taskTitle}" — ${t('notif_confirm_payment')}` : t('notif_confirm_payment'), link: (n) => n.taskId ? `/task/${n.taskId}` : null },
    new_review:            { Icon: Star,          accent: '#f59e0b', title: ()  => t('notif_new_review'),                              body: (n) => n.preview || t('notif_view_profile'),             link: () => null },
    task_cancelled_worker: { Icon: Ban,           accent: '#dc2626', title: ()  => t('notif_task_cancelled'),                          body: (n) => n.taskTitle ? `"${n.taskTitle}"` : '',            link: () => null },
    approval_revoked:      { Icon: Undo2,         accent: '#f97316', title: ()  => t('notif_approval_revoked'),                       body: (n) => n.taskTitle ? `"${n.taskTitle}" — ${t('notif_back_to_open')}` : '', link: (n) => n.taskId ? `/task/${n.taskId}` : null },
    worker_left_task:      { Icon: LogOut,        accent: '#f97316', title: (n) => `${n.workerName || ''} ${t('notif_worker_left')}`, body: (n) => n.taskTitle ? `"${n.taskTitle}"` : '',            link: (n) => n.taskId ? `/task/${n.taskId}` : null },
    no_show_reported:      { Icon: AlertTriangle, accent: '#dc2626', title: ()  => t('notif_no_show'),                                body: (n) => n.taskTitle ? `"${n.taskTitle}"` : t('notif_trust_updated'), link: () => null },
    boost_available:       { Icon: Zap,           accent: '#a855f7', title: ()  => t('notif_boost_available'),                        body: (n) => n.taskTitle ? `"${n.taskTitle}" — ${t('notif_boost_sub')}` : t('notif_boost_amplify'), link: (n) => n.taskId ? `/task/${n.taskId}` : null },
    task_completed_celebration: { Icon: PartyPopper, accent: '#ffffff', title: () => 'המשימה הושלמה! 🎉', body: (n) => n.taskTitle || n.task?.title || '', link: (n) => n.role === 'worker' ? '/earnings' : (n.taskId ? `/task/${n.taskId}` : null) },
  };

  const cfg = TYPES[notification.type] || TYPES.application_received;
  const link = cfg.link?.(notification);
  const isCelebration = notification.type === 'task_completed_celebration';
  const { Icon } = cfg;

  // The accent drives the icon, the tile tint and the countdown — one colour per
  // meaning, so the banner is readable at a glance and before it is read.
  const tileBg = isCelebration ? 'rgba(255,255,255,0.2)' : `${cfg.accent}14`;

  const handleClick = () => {
    if (!link) return;
    onClose?.();
    if (link.startsWith('/task/')) {
      openTaskSheet(link.replace('/task/', ''));
    } else {
      navigate(link);
    }
  };

  return (
    <motion.div
      // Swipe up to dismiss, tap to open. framer-motion tells the two apart on
      // its own, so a swipe never also fires the tap underneath it.
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={{ top: 0.55, bottom: 0 }}
      onDragEnd={(e, info) => { if (info.offset.y < -48) onClose?.(); }}
      onTap={() => { if (link) handleClick(); }}
      whileTap={link ? { scale: 0.985 } : undefined}
      style={{
        position: 'relative',
        background: isCelebration
          ? 'linear-gradient(135deg, #059669 0%, #047857 100%)'
          : 'var(--surface-2)',
        border: isCelebration ? '1px solid rgba(255,255,255,0.25)' : '1px solid var(--border-1)',
        borderRadius: 20,
        overflow: 'hidden',
        boxShadow: isCelebration
          ? '0 12px 40px rgba(5,150,105,0.42)'
          : '0 10px 30px rgba(15,40,107,0.14), 0 2px 6px rgba(15,40,107,0.05)',
        cursor: link ? 'pointer' : 'default',
      }}
    >
      {/* The countdown, in the notification's own colour. */}
      <div style={{ height: 3, background: isCelebration ? 'rgba(255,255,255,0.18)' : 'rgba(15,40,107,0.06)' }}>
        <div style={{ height: '100%', background: isCelebration ? 'rgba(255,255,255,0.85)' : cfg.accent, width: `${progress}%`, transition: 'width 0.06s linear' }} />
      </div>

      <div style={{ padding: '12px 12px 12px 14px', display: 'flex', alignItems: 'center', gap: 11 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 13,
          background: tileBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <Icon size={19} color={isCelebration ? '#ffffff' : cfg.accent} strokeWidth={2.2} />
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontWeight: 800, fontSize: 14.5, letterSpacing: -0.2,
            color: isCelebration ? '#ffffff' : 'var(--text-1)',
            marginBottom: 2, lineHeight: 1.3,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>
            {cfg.title(notification)}
          </div>
          <div style={{
            fontSize: 12.5, fontWeight: 500, lineHeight: 1.4,
            color: isCelebration ? 'rgba(255,255,255,0.88)' : 'var(--text-2)',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cfg.body(notification)}</span>
            {isCelebration && notification.role === 'worker' && (
              <span style={{ flexShrink: 0, fontSize: 10.5, fontWeight: 800, color: 'white', background: 'rgba(255,255,255,0.22)', padding: '2px 8px', borderRadius: 99, whiteSpace: 'nowrap' }}>ראה בדשבורד רווחים ←</span>
            )}
          </div>
        </div>

        <button
          onClick={(e) => { e.stopPropagation(); onClose?.(); }}
          className="j-icon-btn"
          aria-label="סגירה"
          style={{
            width: 30, height: 30, borderRadius: 10,
            background: isCelebration ? 'rgba(255,255,255,0.2)' : 'var(--surface-3)',
            border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', flexShrink: 0,
          }}
        >
          <X size={14} color={isCelebration ? 'white' : 'var(--text-3)'} />
        </button>
      </div>
    </motion.div>
  );
}