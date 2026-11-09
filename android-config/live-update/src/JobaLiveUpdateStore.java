package __PKG__;

import android.content.Context;
import android.content.SharedPreferences;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * The device's own memory of the cards it is showing.
 *
 * ── WHY IT EXISTS AT ALL ────────────────────────────────────────────────────
 * The server owns the revision sequence (base44/shared/liveActivitySend.ts), and
 * the phone has to apply it the same way the iOS widget does — otherwise a
 * duplicate delivery, a delayed message or a message that arrives after the app
 * was killed could move the card BACKWARDS. That is what this store is for: it
 * holds the last revision applied per (task, role), plus the one terminal fact
 * that matters (this card was ended at revision N).
 *
 * It is SharedPreferences rather than memory because the process does not
 * survive: an FCM message is handled in a service that may be started while the
 * app is closed, and the app may be restarted between two revisions. In-memory
 * state would apply an old revision as if it were new on every cold start.
 *
 * ── THE THREE RULES, PORTED VERBATIM ────────────────────────────────────────
 * 1. A newer revision always wins.            (shouldApplySnapshot: nr > pr)
 * 2. Equal revision → newer updatedAt wins.    (shouldApplySnapshot tie-break)
 * 3. Equal pair → no-op.                       (a duplicate is harmless)
 * …plus the terminal rule the server already enforces for iOS: once a card has
 * been ENDED at revision N, nothing at or below N may bring it back. A later,
 * genuinely new start (a new task, a re-opened job) carries a higher revision and
 * is allowed — the same way the server refuses to start a pair twice.
 */
public final class JobaLiveUpdateStore {

    private static final String PREFS = "joba_live_update";
    private static final String KEY_INDEX = "__keys";
    private static final String PENDING_OPEN = "__pending_open_task";

    private final SharedPreferences prefs;

    public JobaLiveUpdateStore(Context context) {
        this.prefs = context.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    public static String keyOf(String taskId, String role) {
        return String.valueOf(taskId) + "|" + ("worker".equals(role) ? "worker" : "publisher");
    }

    /** The last revision this device applied for this card (0 = none). */
    public long revision(String key) {
        return prefs.getLong("rev:" + key, 0L);
    }

    private long endedRevision(String key) {
        return prefs.getLong("ended:" + key, 0L);
    }

    private long updatedAtMs(String key) {
        return prefs.getLong("upd:" + key, 0L);
    }

    public String contentKey(String key) {
        return prefs.getString("ck:" + key, "");
    }

    /**
     * May this payload be applied on top of what is already shown?
     * Rule-for-rule the same answer the widget gets from `shouldApplySnapshot`,
     * with the terminal rule on top.
     */
    public boolean shouldApply(JobaLiveUpdatePayload payload) {
        if (payload == null || payload.taskId.isEmpty()) return false;
        String key = payload.key();
        long ended = endedRevision(key);

        // An end is never subject to the ordering test: it is the same close
        // repeated, and re-closing what is already closed is a no-op, not an error.
        if (payload.isEnd()) return ended < payload.revision;

        if (ended >= payload.revision) return false;

        long previous = revision(key);
        if (payload.revision != previous) return payload.revision > previous;

        long previousUpdated = updatedAtMs(key);
        long nextUpdated = parseMs(payload.updatedAt);
        if (nextUpdated != previousUpdated) return nextUpdated > previousUpdated;
        return false;
    }

    /** Was the previous application of this card identical in every visible way? */
    public boolean isDuplicateContent(JobaLiveUpdatePayload payload) {
        if (payload == null) return true;
        return payload.contentKey().equals(contentKey(payload.key()));
    }

    public void commit(JobaLiveUpdatePayload payload) {
        if (payload == null) return;
        String key = payload.key();
        Set<String> keys = new HashSet<>(prefs.getStringSet(KEY_INDEX, new HashSet<String>()));
        keys.add(key);
        prefs.edit()
                .putLong("rev:" + key, payload.revision)
                .putLong("upd:" + key, parseMs(payload.updatedAt))
                .putString("ck:" + key, payload.contentKey())
                .putStringSet(KEY_INDEX, keys)
                .apply();
    }

    /** Mark the card closed at this revision. Nothing at or below it may reopen it. */
    public void markEnded(String key, long revision) {
        prefs.edit()
                .putLong("ended:" + key, Math.max(revision, endedRevision(key)))
                .putString("ck:" + key, "")
                .apply();
    }

    /**
     * The cards this device is still showing. Used by the app on launch/resume so
     * a notification that outlived the process is known, exactly as the iOS
     * bridge reads `Activity<T>.activities` instead of trusting a local flag.
     */
    public List<String[]> runningKeys() {
        List<String[]> running = new ArrayList<>();
        Set<String> keys = prefs.getStringSet(KEY_INDEX, new HashSet<String>());
        for (String key : keys) {
            long revision = revision(key);
            if (revision <= 0) continue;
            if (endedRevision(key) >= revision) continue;
            int split = key.lastIndexOf('|');
            if (split <= 0) continue;
            running.add(new String[] { key.substring(0, split), key.substring(split + 1) });
        }
        return running;
    }

    public void forget(String key) {
        Set<String> keys = new HashSet<>(prefs.getStringSet(KEY_INDEX, new HashSet<String>()));
        keys.remove(key);
        prefs.edit()
                .remove("rev:" + key)
                .remove("upd:" + key)
                .remove("ck:" + key)
                .remove("ended:" + key)
                .remove("auth:" + key + ":endpoint")
                .remove("auth:" + key + ":token")
                .remove("auth:" + key + ":exp")
                .putStringSet(KEY_INDEX, keys)
                .apply();
    }

    /* ── The Lock Screen button's capability ──────────────────────────────────
       Mirrors JobaActivityAuthStore on iOS: a token the app minted for THIS card,
       handed to the native side so a tap needs no session. It is never placed in
       the notification, never logged, and never leaves this store except into the
       request the tap itself makes. */

    public void putActionAuth(String key, String endpoint, String token, long expiresAtMs) {
        SharedPreferences.Editor editor = prefs.edit();
        if (token == null || token.isEmpty()) {
            editor.remove("auth:" + key + ":endpoint")
                    .remove("auth:" + key + ":token")
                    .remove("auth:" + key + ":exp");
        } else {
            editor.putString("auth:" + key + ":endpoint", endpoint == null ? "" : endpoint)
                    .putString("auth:" + key + ":token", token)
                    .putLong("auth:" + key + ":exp", expiresAtMs);
        }
        editor.apply();
    }

    public String actionEndpoint(String key) {
        return prefs.getString("auth:" + key + ":endpoint", "");
    }

    public String actionToken(String key) {
        return prefs.getString("auth:" + key + ":token", "");
    }

    /** Expiry, or 0 when unknown — 0 means "cannot act", the safe direction. */
    public long actionExpiresAt(String key) {
        return prefs.getLong("auth:" + key + ":exp", 0L);
    }

    public boolean canAct(String key) {
        String token = actionToken(key);
        String endpoint = actionEndpoint(key);
        if (token.isEmpty() || endpoint.isEmpty()) return false;
        long expiresAt = actionExpiresAt(key);
        return expiresAt > System.currentTimeMillis();
    }

    /* ── The INSTALL-scoped capability ────────────────────────────────────────
       A card created by a push appears while the app is closed, so there was no
       session to mint the per-card capability its button needs. On the next
       launch the app mints the narrow install-scoped one (`scope: 'user'`),
       exactly as iOS does for a Push-to-Start card, and the receiver falls back
       to it. It names no task: the tap carries the task and role, and the server
       re-checks ownership against the record on every request. */

    public void putInstallAuth(String endpoint, String token, long expiresAtMs) {
        SharedPreferences.Editor editor = prefs.edit();
        if (token == null || token.isEmpty()) {
            editor.remove("install:endpoint").remove("install:token").remove("install:exp");
        } else {
            editor.putString("install:endpoint", endpoint == null ? "" : endpoint)
                    .putString("install:token", token)
                    .putLong("install:exp", expiresAtMs);
        }
        editor.apply();
    }

    public String installEndpoint() {
        return prefs.getString("install:endpoint", "");
    }

    public String installToken() {
        return prefs.getString("install:token", "");
    }

    /** Same rule as a per-card capability: unknown expiry means "cannot act". */
    public boolean canActAsInstall() {
        String token = installToken();
        String endpoint = installEndpoint();
        if (token.isEmpty() || endpoint.isEmpty()) return false;
        return prefs.getLong("install:exp", 0L) > System.currentTimeMillis();
    }

    /* ── A tap that has to survive the launch ────────────────────────────────
       The notification's content intent starts the app; THIS is how the task id
       reaches the web layer, because the notification was posted by our own
       service and not by the FCM SDK (whose tap handling the app already has). */

    public void setPendingOpenTask(String taskId) {
        prefs.edit().putString(PENDING_OPEN, taskId == null ? "" : taskId).apply();
    }

    /** Read AND clear: one tap opens one task, even if the app resumes twice. */
    public String takePendingOpenTask() {
        String taskId = prefs.getString(PENDING_OPEN, "");
        if (taskId == null || taskId.isEmpty()) return "";
        prefs.edit().putString(PENDING_OPEN, "").apply();
        return taskId;
    }

    /** Every stored value, for the diagnostics screen. Never includes a token. */
    public Map<String, ?> snapshotValues() {
        return prefs.getAll();
    }

    private static long parseMs(String iso) {
        if (iso == null || iso.isEmpty()) return 0L;
        try {
            // The contract sends ISO-8601 with a trailing Z (e.g. 2026-11-09T12:00:00.000Z).
            java.text.SimpleDateFormat format =
                    new java.text.SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", java.util.Locale.US);
            format.setTimeZone(java.util.TimeZone.getTimeZone("UTC"));
            java.util.Date date = format.parse(iso);
            return date == null ? 0L : date.getTime();
        } catch (Throwable ignored) {
            return 0L;
        }
    }
}