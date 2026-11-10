package __PKG__;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.List;

/**
 * The Android half of the app's Live Activity bridge (`JobaLiveUpdate`).
 *
 * ── THE SAME SHAPE AS THE iOS PLUGIN ────────────────────────────────────────
 * The web layer talks to exactly one surface on both platforms
 * (src/lib/liveUpdateNative.js): availability, start/update, end, the list of
 * cards still showing, and the card's action capability. Nothing here decides
 * anything about a task: the content arrives already built by the same
 * presentation contract iOS uses, and the ordering rules are applied by
 * JobaLiveUpdateEngine.
 *
 * This is the FOREGROUND path. It exists so the card moves instantly while the
 * app is open — the revision still comes from the server (`liveActivityRealTask`
 * `begin`/`sync`), exactly as on iOS, so a pushed update and a local one can
 * never be out of sequence. When the app is closed, the MessagingService takes
 * over and applies the same rules.
 */
@CapacitorPlugin(name = "JobaLiveUpdate")
public class JobaLiveUpdatePlugin extends Plugin {

    @PluginMethod
    public void isSupported(PluginCall call) {
        JSObject result = new JSObject();
        // An ongoing notification is the floor, and it exists on every Android
        // version this app ships to. `promoted` says whether the OS can also show
        // it as an Android 16 Live Update, which is a property of the DEVICE.
        result.put("supported", true);
        result.put("platform", "android");
        result.put("promoted", android.os.Build.VERSION.SDK_INT >= 36);
        call.resolve(result);
    }

    @PluginMethod
    public void update(PluginCall call) {
        JSObject state = call.getObject("state");
        if (state == null) {
            JSObject rejected = new JSObject();
            rejected.put("updated", false);
            rejected.put("reason", "missing_state");
            call.resolve(rejected);
            return;
        }

        // The snapshot's own `id` is what the card is keyed on, so it is sent
        // through verbatim rather than re-assembled here.
        JobaLiveUpdatePayload payload = JobaLiveUpdatePayload.fromJson(state.toString());
        if (payload == null) {
            JSObject rejected = new JSObject();
            rejected.put("updated", false);
            rejected.put("reason", "bad_payload");
            call.resolve(rejected);
            return;
        }

        JobaLiveUpdateEngine.Result applied = JobaLiveUpdateEngine.apply(getContext(), payload);
        JSObject result = new JSObject();
        result.put("updated", applied.applied);
        result.put("ended", applied.ended);
        result.put("reason", applied.reason);
        result.put("count", applied.applied ? 1 : 0);
        call.resolve(result);
    }

    @PluginMethod
    public void end(PluginCall call) {
        String taskId = call.getString("taskId", "");
        String role = call.getString("role", "publisher");
        if (taskId == null || taskId.isEmpty()) {
            JSObject rejected = new JSObject();
            rejected.put("ended", false);
            rejected.put("reason", "missing_input");
            call.resolve(rejected);
            return;
        }

        JobaLiveUpdateEngine.Result result = JobaLiveUpdateEngine.cancel(getContext(), taskId, role);
        JSObject response = new JSObject();
        response.put("ended", true);
        response.put("count", 1);
        response.put("reason", result.reason);
        call.resolve(response);
    }

    /** Every card this device is still showing — the Android `activities` list. */
    @PluginMethod
    public void activeUpdates(PluginCall call) {
        JobaLiveUpdateStore store = new JobaLiveUpdateStore(getContext());
        List<String[]> running = store.runningKeys();
        JSArray activities = new JSArray();
        for (String[] row : running) {
            JSObject entry = new JSObject();
            entry.put("taskId", row[0]);
            entry.put("role", row[1]);
            // The iOS bridge reads ActivityKit's own state; here a stored card is
            // by definition the one on screen, so the vocabulary is the same one
            // planActivityStep already understands.
            entry.put("activityState", "active");
            activities.put(entry);
        }
        JSObject result = new JSObject();
        result.put("activities", activities);
        call.resolve(result);
    }

    /**
     * Store the capability the card's button uses.
     *
     * The web layer mints it (`issueLiveActivityActionToken`) exactly as on iOS;
     * this only remembers it for the receiver, which runs with no session. A token
     * is never placed in the notification, never logged and never leaves the
     * device except into the request the tap itself makes.
     */
    @PluginMethod
    public void setActionAuth(PluginCall call) {
        String taskId = call.getString("taskId", "");
        String role = call.getString("role", "publisher");
        if (taskId == null || taskId.isEmpty()) {
            JSObject rejected = new JSObject();
            rejected.put("stored", false);
            rejected.put("reason", "missing_task");
            call.resolve(rejected);
            return;
        }
        String key = JobaLiveUpdateStore.keyOf(taskId, role);
        Long expiresAt = call.getLong("expiresAtMs");
        new JobaLiveUpdateStore(getContext()).putActionAuth(
                key,
                call.getString("endpoint", ""),
                call.getString("token", ""),
                expiresAt == null ? 0L : expiresAt);
        JSObject result = new JSObject();
        result.put("stored", true);
        call.resolve(result);
    }

    /**
     * The install-scoped capability — the counterpart of `setUserActionAuth` on
     * iOS.
     *
     * A card created by a push appeared while the app was closed, so no per-card
     * capability could be minted for it. This is the narrow one the app mints on
     * the next launch, which the receiver falls back to so the button on such a
     * card still acts instead of merely opening the app.
     */
    @PluginMethod
    public void setInstallAuth(PluginCall call) {
        Long expiresAt = call.getLong("expiresAtMs");
        new JobaLiveUpdateStore(getContext()).putInstallAuth(
                call.getString("endpoint", ""),
                call.getString("token", ""),
                expiresAt == null ? 0L : expiresAt);
        JSObject result = new JSObject();
        result.put("stored", true);
        call.resolve(result);
    }

    /** Read (and clear) a task the card asked to open while the app was closed. */
    @PluginMethod
    public void consumePendingOpenTask(PluginCall call) {
        String taskId = new JobaLiveUpdateStore(getContext()).takePendingOpenTask();
        JSObject result = new JSObject();
        result.put("taskId", taskId == null ? "" : taskId);
        call.resolve(result);
    }

    /**
     * A tap while the app is already running.
     *
     * The open receiver stores the task and brings the app forward; by the time
     * the activity resumes, the web layer is mounted and listening, so the id is
     * announced instead of waiting to be polled. A cold start takes the other
     * path (`consumePendingOpenTask` on mount), and because the read CLEARS the
     * value, a task is never opened twice.
     */
    @Override
    protected void handleOnResume() {
        super.handleOnResume();
        try {
            // ── A COLD START RESUMES BEFORE THE WEB LAYER EXISTS ─────────────
            // The resume that follows a tap on the card happens at launch, when
            // no JS listener is registered yet. Taking the task id then consumed
            // it into an event nobody received, so the app opened on the feed and
            // the tap appeared to have done nothing — the exact symptom reported
            // for the card's buttons. Leaving the value in the store instead lets
            // consumePendingOpenTask pick it up on mount, so a cold start and a
            // warm resume now end in the same place.
            if (!hasListeners("openTask")) return;
            String taskId = new JobaLiveUpdateStore(getContext()).takePendingOpenTask();
            if (taskId == null || taskId.isEmpty()) return;
            JSObject event = new JSObject();
            event.put("taskId", taskId);
            notifyListeners("openTask", event);
        } catch (Throwable ignored) {
            // A resume must never be able to break the app.
        }
    }
}