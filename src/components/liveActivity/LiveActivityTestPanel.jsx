import { useCallback, useEffect, useRef, useState } from 'react';
import {
  activeTaskActivities,
  attachActivityTokenListener,
  endTaskActivity,
  liveActivityAvailability,
  startTaskActivity,
  updateTaskActivity,
} from '@/lib/liveActivityNative';
import { LAST_TEST_STEP, TEST_TASK_ID, testSnapshot } from '@/lib/liveActivityTestState';

/**
 * LiveActivityTestPanel — the ONE safe way to see the widget on a device before
 * the bridge is wired to a real screen.
 *
 * Safety: it starts a LOCAL activity from a fixed fixture. It reads no task,
 * writes no task, and sends no push — production dispatch stays disabled. The
 * only server call it can make is the existing token registration, and only when
 * that button is pressed.
 */
export default function LiveActivityTestPanel() {
  const [availability, setAvailability] = useState(null);
  const [step, setStep] = useState(0);
  const [revision, setRevision] = useState(1);
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState([]);
  const [token, setToken] = useState('');
  const detachRef = useRef(null);

  const note = useCallback((line) => {
    setLog((current) => [`${new Date().toLocaleTimeString()} · ${line}`, ...current].slice(0, 8));
  }, []);

  useEffect(() => {
    liveActivityAvailability().then((result) => {
      setAvailability(result);
      note(`availability: ${result.available ? 'available' : `not available (${result.reason})`}`);
    });
    return () => {
      if (detachRef.current) detachRef.current();
    };
  }, [note]);

  // One action at a time: the plugin serialises activity changes per task/role.
  const run = async (label, action) => {
    setBusy(true);
    try {
      const result = await action();
      note(`${label}: ${JSON.stringify(result)}`);
    } finally {
      setBusy(false);
    }
  };

  const start = () => run('start', async () => {
    setStep(0);
    setRevision((r) => r + 1);
    return startTaskActivity({ taskId: TEST_TASK_ID, role: 'worker', state: testSnapshot(0, revision + 1) });
  });

  const advance = () => {
    const next = Math.min(step + 1, LAST_TEST_STEP);
    return run('update', async () => {
      setStep(next);
      setRevision((r) => r + 1);
      return updateTaskActivity({ taskId: TEST_TASK_ID, role: 'worker', state: testSnapshot(next, revision + 1) });
    });
  };

  const end = () => run('end', () => endTaskActivity({ taskId: TEST_TASK_ID, role: 'worker', state: testSnapshot(step, revision + 1) }));

  const list = () => run('active activities', async () => {
    const { activities } = await activeTaskActivities();
    return { count: activities.length, ids: activities.map((a) => a.activityId || a.id || '') };
  });

  const listenForToken = () => {
    if (detachRef.current) return;
    detachRef.current = attachActivityTokenListener((payload) => {
      setToken(payload?.token || '(empty)');
      note(`activity token received and forwarded for registration`);
    });
    note('listening for an ActivityKit push token');
  };

  return (
    <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--text-2)' }}>
        Local test only. This starts an activity on this device from a fixed example
        snapshot — no task is touched and nothing is pushed from the server.
      </div>

      <div style={{ fontSize: 13, color: 'var(--text-3)' }}>
        Status: {availability ? (availability.available ? 'ready' : `unavailable — ${availability.reason}`) : 'checking…'}
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        <button className="j-btn j-btn-primary" style={{ height: 44, padding: '0 16px' }} disabled={busy} onClick={start}>
          Start activity
        </button>
        <button className="j-btn j-btn-secondary" style={{ height: 44, padding: '0 16px' }} disabled={busy} onClick={advance}>
          Advance step
        </button>
        <button className="j-btn j-btn-secondary" style={{ height: 44, padding: '0 16px' }} disabled={busy} onClick={end}>
          End activity
        </button>
        <button className="j-btn j-btn-ghost" style={{ height: 44, padding: '0 16px' }} disabled={busy} onClick={list}>
          List activities
        </button>
      </div>

      <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
        Step {step + 1} of {LAST_TEST_STEP + 1} · revision {revision}
      </div>

      <div style={{ marginTop: 4, paddingTop: 10, borderTop: '1px solid var(--border-1)', display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-2)' }}>Optional: verify the token path</div>
        <button className="j-btn j-btn-ghost" style={{ height: 40, padding: '0 14px', alignSelf: 'flex-start' }} onClick={listenForToken}>
          Listen for push token
        </button>
        {token && <div style={{ fontSize: 11, color: 'var(--text-3)', wordBreak: 'break-all' }}>token: {token}</div>}
      </div>

      <div style={{ marginTop: 4 }}>
        {log.map((line, index) => (
          <div key={`${line}-${index}`} style={{ fontSize: 11, color: 'var(--text-3)', padding: '2px 0', wordBreak: 'break-word' }}>
            {line}
          </div>
        ))}
      </div>
    </div>
  );
}