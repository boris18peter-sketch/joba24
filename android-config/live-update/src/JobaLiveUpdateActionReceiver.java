package __PKG__;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;

import org.json.JSONObject;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * The card's ONE action button, without opening the app.
 *
 * ── THE SAME TAP iOS PERFORMS FROM THE LOCK SCREEN ──────────────────────────
 * The button posts to the app's existing `liveActivityAction` endpoint with the
 * capability the app minted for this exact card (JobaLiveUpdateStore keeps it),
 * and the body is identical to the one the iOS App Intent sends:
 *
 *     { token, action_id, expected_step, task_id, role }
 *
 * The server re-derives eligibility from the stored Task on every tap, so this
 * receiver cannot do anything the in-app flow could not — a stale card can only
 * ever get a refusal, never an approval of work that has moved on.
 *
 * ── WHY A BROADCAST RECEIVER AND NOT AN ACTIVITY ────────────────────────────
 * Opening the app to perform a step the user could have done from the Lock
 * Screen would be the one visible difference from iOS. A receiver can complete a
 * short HTTPS request on its own, so the button behaves the same on both
 * platforms. It is registered `exported="false"`: only this app can trigger it.
 */
public class JobaLiveUpdateActionReceiver extends BroadcastReceiver {

    private static final int CONNECT_TIMEOUT_MS = 8000;
    private static final int READ_TIMEOUT_MS = 10000;

    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) return;

        String taskId = intent.getStringExtra("task_id");
        String role = intent.getStringExtra("role");
        String actionId = intent.getStringExtra("action_id");
        String actionStep = intent.getStringExtra("action_step");
        // A star tap carries its value; every flow action carries none. 0 means
        // "this tap is not a rating", so the body stays exactly as it was.
        final int stars = intent.getIntExtra("stars", 0);
        if (taskId == null || taskId.isEmpty()) return;

        final Context appContext = context.getApplicationContext();
        final JobaLiveUpdateStore store = new JobaLiveUpdateStore(appContext);
        final String key = JobaLiveUpdateStore.keyOf(taskId, role);

        // ── RECORDED FIRST, WHATEVER HAPPENS NEXT ────────────────────────────
        // Every tap on the button arrives here (see buttonIntent). Writing the
        // task down before anything else is what makes a tap impossible to
        // ignore: if it cannot be performed in place — no capability, no network,
        // a refusal — the app still lands on that task the moment it opens.
        store.setPendingOpenTask(taskId);

        // ── WHICH CAPABILITY THIS TAP USES ───────────────────────────────────
        // The per-card one is always preferred: it is bound to this task, this
        // role and the actions that role may perform.
        //
        // The install-scoped one is the fallback, and it is not a convenience: a
        // card created by a PUSH was drawn while the app was closed, so there was
        // no session to mint a per-card capability. Without this fallback that
        // card's button could only ever open the app, while the identical iOS card
        // (Push-to-Start) acts in place. It names no task — the request carries the
        // task and role, and the server re-checks ownership on every tap.
        final String endpoint;
        final String token;
        if (actionId != null && !actionId.isEmpty() && store.canAct(key)) {
            endpoint = store.actionEndpoint(key);
            token = store.actionToken(key);
        } else if (actionId != null && !actionId.isEmpty() && store.canActAsInstall()) {
            endpoint = store.installEndpoint();
            token = store.installToken();
        } else {
            // Nothing may act for this card: open the task, where a fresh
            // capability (and the applicant list) exists. A tap that promised an
            // action must never end in silence.
            openTask(appContext, taskId);
            return;
        }

        // A receiver's work is cut off when onReceive returns, so the request runs
        // on a thread that holds the process alive until it is finished.
        final PendingResult pending = goAsync();
        new Thread(new Runnable() {
            @Override
            public void run() {
                boolean applied = false;
                try {
                    applied = post(appContext, endpoint, token, actionId, actionStep, taskId, role, stars);
                } catch (Throwable ignored) {
                    // Treated exactly like a refusal below: the tap still has to
                    // lead somewhere, so the app is opened on the task.
                }
                // ── A TAP THAT COULD NOT ACT OPENS THE TASK ──────────────────
                // Previously a failed request changed nothing at all: the card
                // stayed as it was and the user saw a button that had done
                // nothing. Opening the task is the honest outcome — the action is
                // one tap away, with a live session and a fresh capability.
                if (!applied) openTask(appContext, taskId);
                try { pending.finish(); } catch (Throwable ignored) { }
            }
        }).start();
    }

    /** Returns true only when the server accepted the action (2xx). */
    private boolean post(
            Context context,
            String endpoint,
            String token,
            String actionId,
            String actionStep,
            String taskId,
            String role,
            int stars) throws Exception {

        JSONObject body = new JSONObject();
        body.put("token", token);
        body.put("action_id", actionId);
        body.put("expected_step", actionStep == null ? "" : actionStep);
        // Only a star tap sends one, and only then does the server read it. The
        // value is clamped again on the server, so a malformed extra cannot
        // become a rating outside the 1…5 scale.
        if (stars > 0) body.put("stars", stars);
        body.put("task_id", taskId);
        body.put("role", role == null ? "publisher" : role);

        HttpURLConnection connection = null;
        try {
            connection = (HttpURLConnection) new URL(endpoint).openConnection();
            connection.setRequestMethod("POST");
            connection.setConnectTimeout(CONNECT_TIMEOUT_MS);
            connection.setReadTimeout(READ_TIMEOUT_MS);
            connection.setDoOutput(true);
            connection.setRequestProperty("Content-Type", "application/json; charset=utf-8");
            connection.setRequestProperty("Accept", "application/json");

            OutputStream out = connection.getOutputStream();
            out.write(body.toString().getBytes("UTF-8"));
            out.close();

            int status = connection.getResponseCode();
            InputStream stream = status >= 200 && status < 300
                    ? connection.getInputStream()
                    : connection.getErrorStream();
            String response = read(stream);

            // ── THE CARD SHOWS WHAT THE SERVER CONFIRMED ─────────────────────
            // iOS applies the response's own snapshot to the card, and this is the
            // same rule. It matters most on a REFUSAL: a refused tap changes no
            // Task, so no entity event follows and no push would ever correct the
            // card — it would keep offering an action that can no longer work.
            // The engine applies the same ordering rules as a push, so a snapshot
            // older than what is already on screen is refused, never drawn.
            if (status < 500) {
                applyOutcome(context, response, taskId, role);
            }

            // A refused capability must not be retried forever: drop it, so the
            // next tap opens the task instead of posting a token we know is dead.
            if (status == 401 || response.contains("expired") || response.contains("missing_token")) {
                new JobaLiveUpdateStore(context)
                        .putActionAuth(JobaLiveUpdateStore.keyOf(taskId, role), "", "", 0L);
            }

            // The caller opens the task when this is false, so only a real 2xx
            // counts as "the tap did what its label promised".
            return status >= 200 && status < 300;
        } finally {
            if (connection != null) connection.disconnect();
        }
    }

    /**
     * Apply the server's answer to the card, exactly as the App Intent does on
     * iOS.
     *
     * `terminal` means the card is finished and comes down; otherwise the
     * snapshot the server built for THIS caller is drawn. Nothing is guessed: an
     * answer without a snapshot leaves the card as it was, and the server's own
     * dispatch (which follows a successful transition) is still the authority.
     */
    private static void applyOutcome(Context context, String response, String taskId, String role) {
        if (response == null || response.isEmpty()) return;
        try {
            JSONObject body = new JSONObject(response);
            if (body.optBoolean("terminal", false)) {
                JobaLiveUpdateEngine.cancel(context, taskId, role);
                return;
            }
            JSONObject snapshot = body.optJSONObject("snapshot");
            if (snapshot == null) return;
            JobaLiveUpdatePayload payload = JobaLiveUpdatePayload.fromJson(snapshot.toString());
            if (payload == null) return;
            JobaLiveUpdateEngine.apply(context, payload);
        } catch (Throwable ignored) {
            // The card keeps what it had; the push that follows will correct it.
        }
    }

    private static String read(InputStream stream) {
        if (stream == null) return "";
        try {
            BufferedReader reader = new BufferedReader(new InputStreamReader(stream, "UTF-8"));
            StringBuilder text = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) text.append(line);
            reader.close();
            return text.toString();
        } catch (Throwable ignored) {
            return "";
        }
    }

    /** Open the app on the task — the fallback when a card cannot act for itself. */
    private static void openTask(Context context, String taskId) {
        new JobaLiveUpdateStore(context).setPendingOpenTask(taskId);
        Intent launch = new Intent(context, MainActivity.class);
        launch.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK
                | Intent.FLAG_ACTIVITY_SINGLE_TOP
                | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        launch.putExtra("joba_open_task", taskId);
        try {
            context.startActivity(launch);
        } catch (Throwable ignored) {
            // A background activity start can be refused by the OS; the pending
            // task id stays stored, so the next time the app opens it lands there.
        }
    }
}