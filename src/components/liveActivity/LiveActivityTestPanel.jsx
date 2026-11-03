import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useLanguage } from '@/lib/LanguageContext';
import { useGlobalCategories } from '@/lib/brand/globalCategories';
import { useJobaSettings } from '@/hooks/useJobaSettings';
import {
  activeTaskActivities,
  attachActivityTokenListener,
  endAllActivities,
  endTaskActivity,
  liveActivityAvailability,
  startTaskActivity,
  updateTaskActivity,
} from '@/lib/liveActivityNative';
import {
  TEST_TASK_ID,
  buildTestSnapshot,
  firstAssignedStage,
  stagesForRole,
} from '@/lib/liveActivityTestState';
import TestSnapshotCard from '@/components/liveActivity/TestSnapshotCard';
import TestStageControls from '@/components/liveActivity/TestStageControls';
import TestDiagnostics from '@/components/liveActivity/TestDiagnostics';

/** Every reason the bridge can return, said in plain Hebrew. */
const REASON = {
  not_native: 'הבדיקה פועלת רק באפליקציית iOS',
  unsupported_ios: 'נדרש iOS 16.2 ומעלה',
  activities_disabled: 'Live Activities כבויות בהגדרות המכשיר',
  plugin_unavailable: 'שכבת הנייטיב לא נטענה',
  missing_input: 'חסר מידע לביצוע הפעולה',
  plugin_error: 'הקריאה ל-ActivityKit נכשלה',
  no_activity: 'לא נמצאה פעילות פעילה במכשיר',
  stale_revision: 'העדכון נדחה — הגרסה נמוכה מזו שמוצגת',
};

const explain = (reason, fallback) => REASON[reason] || fallback;

/**
 * LiveActivityTestPanel — the local, admin-only check for the native widget.
 *
 * It starts and drives a REAL ActivityKit activity, but with a snapshot built
 * from an in-memory task: no task is read, created or changed, and nothing is
 * pushed from the server. Production dispatch stays disabled.
 *
 * Every action reports what iOS answered, and the active-activity list is
 * re-read from ActivityKit afterwards, so the screen can never claim success the
 * device did not deliver.
 */
export default function LiveActivityTestPanel() {
  const { t } = useLanguage();
  const { rows: catRows } = useGlobalCategories();
  const { settings } = useJobaSettings();

  const [me, setMe] = useState(null);
  const [role, setRole] = useState('publisher');
  const [stage, setStage] = useState(() => firstAssignedStage('publisher'));
  const [revision, setRevision] = useState(1);
  const [busy, setBusy] = useState(false);
  const [availability, setAvailability] = useState(null);
  const [activities, setActivities] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [log, setLog] = useState([]);
  const [token, setToken] = useState('');

  const revisionRef = useRef(1);
  const detachRef = useRef(null);

  const note = useCallback((line) => {
    setLog((current) => [`${new Date().toLocaleTimeString('he-IL')} · ${line}`, ...current].slice(0, 12));
  }, []);

  useEffect(() => {
    base44.auth.me().then((user) => setMe(user || null)).catch(() => setMe(null));
  }, []);

  // One token listener for the whole screen. The bridge forwards what iOS issued;
  // the value is only ever shown masked, in the diagnostics section.
  useEffect(() => {
    detachRef.current = attachActivityTokenListener((payload) => {
      if (payload?.token) {
        setToken(payload.token);
        note('התקבל טוקן דחיפה מהמכשיר');
      }
    });
    return () => {
      if (detachRef.current) detachRef.current();
    };
  }, [note]);

  /** Re-read the truth from ActivityKit — the list, not a local guess. */
  const refresh = useCallback(async () => {
    const [list, avail] = await Promise.all([activeTaskActivities(), liveActivityAvailability()]);
    setActivities(list.activities);
    setAvailability(avail);
    return list.activities;
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // A stage that does not exist for this role (OPEN for a worker) must not stay
  // selected: it would build no snapshot and look like a broken control.
  useEffect(() => {
    const allowed = stagesForRole(role).map((s) => s.key);
    if (!allowed.includes(stage)) setStage(firstAssignedStage(role));
  }, [role, stage]);

  const snapshot = useMemo(() => {
    if (!me?.id) return null;
    return buildTestSnapshot({ stage, role, revision, userId: me.id, t, catRows, settings });
  }, [me?.id, stage, role, revision, t, catRows, settings]);

  const stages = useMemo(() => stagesForRole(role), [role]);
  const running = activities.some((a) => a.taskId === TEST_TASK_ID && a.role === role);

  const flash = (ok, text) => setFeedback({ ok, text });

  /** Bump the monotonic revision the activity is allowed to move to. */
  const nextRevision = () => revisionRef.current + 1;

  const handleStart = async () => {
    if (!me?.id) return;
    setBusy(true);
    setFeedback(null);
    const rev = nextRevision();
    const state = buildTestSnapshot({ stage, role, revision: rev, userId: me.id, t, catRows, settings });
    if (!state) {
      flash(false, 'אין תצוגה זמינה לשלב הזה');
      setBusy(false);
      return;
    }
    const result = await startTaskActivity({ taskId: TEST_TASK_ID, role, state });
    note(`start → ${JSON.stringify(result)}`);
    if (result.started) {
      revisionRef.current = rev;
      setRevision(rev);
      flash(true, `הפעילות נוצרה על המכשיר · גרסה ${rev}`);
    } else {
      flash(false, explain(result.reason, 'לא ניתן היה ליצור פעילות'));
    }
    await refresh();
    setBusy(false);
  };

  const handleAdvance = async () => {
    if (!me?.id) return;
    const list = stagesForRole(role);
    const index = list.findIndex((s) => s.key === stage);
    const next = list[index + 1];
    if (!next) {
      flash(false, 'זהו השלב האחרון — אפשר לסיים את הפעילות');
      return;
    }

    setBusy(true);
    setFeedback(null);
    const rev = nextRevision();
    const state = buildTestSnapshot({ stage: next.key, role, revision: rev, userId: me.id, t, catRows, settings });
    if (!state) {
      flash(false, 'אין תצוגה זמינה לשלב הזה');
      setBusy(false);
      return;
    }

    const result = await updateTaskActivity({ taskId: TEST_TASK_ID, role, state });
    note(`update → ${next.key} → ${JSON.stringify(result)}`);
    if (result.updated) {
      revisionRef.current = rev;
      setRevision(rev);
      setStage(next.key);
      flash(true, `התצוגה עודכנה · ${next.label} · גרסה ${rev}`);
    } else if (result.reason === 'no_activity') {
      flash(false, 'אין פעילות פעילה לעדכון — התחל פעילות קודם');
    } else {
      flash(false, explain(result.reason, 'העדכון לא בוצע'));
    }
    await refresh();
    setBusy(false);
  };

  const handleEnd = async () => {
    setBusy(true);
    setFeedback(null);
    const result = await endTaskActivity({ taskId: TEST_TASK_ID, role, dismissAfter: 0 });
    note(`end → ${JSON.stringify(result)}`);

    // The list is the proof: the same role must not still be reported active.
    const remaining = await refresh();
    const stillMine = remaining.filter((a) => a.taskId === TEST_TASK_ID && a.role === role);

    if (!result.ended) {
      flash(false, explain(result.reason, 'לא נמצאה פעילות פעילה לסיום'));
    } else if (stillMine.length > 0) {
      flash(false, `הסתיימה, אך ${stillMine.length} פעילויות עדיין מדווחות פעילות במכשיר`);
    } else {
      flash(true, `הפעילות הסתיימה (${result.count}) והמסך שוחרר · נותרו ${result.remaining} פעילויות במכשיר`);
    }

    // The screen returns to its starting state: nothing is running, the next
    // start begins a fresh revision sequence.
    revisionRef.current = 1;
    setRevision(1);
    setStage(firstAssignedStage(role));
    setBusy(false);
  };

  const handleEndAll = async () => {
    setBusy(true);
    setFeedback(null);
    const result = await endAllActivities();
    note(`end all → ${JSON.stringify(result)}`);
    const remaining = await refresh();
    if (result.ended) {
      flash(true, `סיום כולל: ${result.count} פעילויות · נותרו ${remaining.length} במכשיר`);
    } else {
      flash(false, explain(result.reason, 'לא היו פעילויות לסיום'));
    }
    revisionRef.current = 1;
    setRevision(1);
    setBusy(false);
  };

  const handleRefresh = async () => {
    setBusy(true);
    const list = await refresh();
    note(`refresh → ${list.length} פעילויות`);
    flash(true, list.length === 0 ? 'אין פעילות פעילה במכשיר' : `${list.length} פעילויות פעילות במכשיר`);
    setBusy(false);
  };

  return (
    <div
      dir="rtl"
      style={{ padding: '6px 16px 30px', display: 'flex', flexDirection: 'column', gap: 14 }}
    >
      <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6, color: 'var(--text-2)' }}>
        בדיקה מקומית בלבד. הפעילות נוצרת על המכשיר הזה מתצוגה אמיתית של מסך המשימה —
        בלי לקרוא, ליצור או לשנות משימה, ובלי לשלוח התראה מהשרת.
      </p>

      <TestStageControls
        role={role}
        stages={stages}
        stage={stage}
        onRole={setRole}
        onStage={setStage}
        onStart={handleStart}
        onAdvance={handleAdvance}
        onEnd={handleEnd}
        onEndAll={handleEndAll}
        onRefresh={handleRefresh}
        busy={busy}
        feedback={feedback}
        startable={!!snapshot}
        running={running}
      />

      <TestSnapshotCard
        snapshot={snapshot}
        availability={availability}
        activities={activities}
        role={role}
        revision={revision}
      />

      <TestDiagnostics log={log} token={token} />
    </div>
  );
}