package __PKG__;

import android.content.Context;
import android.util.Log;

/**
 * The one place an incoming revision is APPLIED.
 *
 * ── WHY IT IS SHARED BY THREE CALLERS ──────────────────────────────────────
 * The same payload arrives from three directions, and all three must produce the
 * same result — exactly as the iOS side funnels start/update/end through one
 * bridge:
 *
 *   • JobaLiveUpdateMessagingService — an FCM data message, app backgrounded/closed;
 *   • JobaLiveUpdatePlugin          — the app is open and applied the state itself;
 *   • neither ever touches the Task — the payload is the whole input.
 *
 * So the ordering rules (revision, then updatedAt, then no-op on a duplicate) and
 * the terminal rule live HERE, once, and every path obeys them. A duplicate
 * delivery, a delayed message or a stale revision can therefore never move the
 * card backwards, whichever route it took.
 */
public final class JobaLiveUpdateEngine {

    private static final String TAG = "JobaLiveUpdate";

    public static final class Result {
        public final boolean applied;
        public final boolean ended;
        public final String reason;

        Result(boolean applied, boolean ended, String reason) {
            this.applied = applied;
            this.ended = ended;
            this.reason = reason;
        }
    }

    private JobaLiveUpdateEngine() {}

    /** Apply one payload: order it, draw it, remember it. */
    public static Result apply(Context context, JobaLiveUpdatePayload payload) {
        if (payload == null || payload.taskId.isEmpty()) return new Result(false, false, "bad_payload");

        JobaLiveUpdateStore store = new JobaLiveUpdateStore(context);
        String key = payload.key();

        if (!store.shouldApply(payload)) {
            // Two distinct answers, both useful in the diagnostics: an ENDED card
            // is final for that revision, everything else is simply older than
            // what is on screen.
            boolean endedAlready = store.revision(key) >= payload.revision;
            return new Result(false, false, endedAlready ? "stale_revision" : "refused");
        }

        if (payload.isEnd()) {
            // A finished job's card comes down — the same close the Lock Screen
            // performs, and the same one the server refuses to send twice.
            JobaLiveUpdateNotifier.cancel(context, key);
            store.markEnded(key, payload.revision);
            store.putActionAuth(key, "", "", 0L);
            Log.i(TAG, "ended " + key + " @" + payload.revision);
            return new Result(true, true, "ended");
        }

        // A revision whose visible content is identical is a duplicate: it is
        // acknowledged, never redrawn. Without this, two entity writes in the same
        // second (a status change plus an applicant projection) would re-post the
        // same card twice.
        if (store.isDuplicateContent(payload) && store.revision(key) == payload.revision) {
            return new Result(false, false, "duplicate");
        }

        boolean posted = JobaLiveUpdateNotifier.post(context, payload);
        if (!posted) {
            // Notifications are off, or the system refused the post. The revision
            // is deliberately NOT committed: the next attempt (the app's own pass
            // when it resumes, or the next revision) then renders the CURRENT state
            // instead of treating it as already applied.
            return new Result(false, false, "not_posted");
        }

        store.commit(payload);
        Log.i(TAG, "applied " + key + " @" + payload.revision + " phase=" + payload.phase);
        return new Result(true, false, "applied");
    }

    /** The app's own pass: the notification it already had no longer exists. */
    public static Result cancel(Context context, String taskId, String role) {
        JobaLiveUpdateStore store = new JobaLiveUpdateStore(context);
        String key = JobaLiveUpdateStore.keyOf(taskId, role);
        JobaLiveUpdateNotifier.cancel(context, key);
        store.markEnded(key, Math.max(store.revision(key), 1));
        store.putActionAuth(key, "", "", 0L);
        return new Result(true, true, "dismissed");
    }
}