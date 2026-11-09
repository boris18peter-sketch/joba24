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
        if (taskId == null || taskId.isEmpty() || actionId == null || actionId.isEmpty()) return;

        final Context appContext = context.getApplicationContext();
        final JobaLiveUpdateStore store = new JobaLiveUpdateStore(appContext);
        final String key = JobaLiveUpdateStore.keyOf(taskId, role);

        // The capability cannot outlive the card, and it cannot be used after the
        // horizon the server gave it. When it is gone the tap opens the task
        // instead — where a fresh capability (and the applicant list) exists.
        if (!store.canAct(key)) {
            openTask(appContext, taskId);
            return;
        }

        final String endpoint = store.actionEndpoint(key);
        final String token = store.actionToken(key);

        // A receiver's work is cut off when onReceive returns, so the request runs
        // on a thread that holds the process alive until it is finished.
        final PendingResult pending = goAsync();
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    post(appContext, endpoint, token, actionId, actionStep, taskId, role);
                } catch (Throwable ignored) {
                    // A tap that cannot reach the server leaves the card exactly as
                    // it was: the button stays, so the user can retry or open the app.
                } finally {
                    try { pending.finish(); } catch (Throwable ignored) { }
                }
            }
        }).start();
    }

    private void post(
            Context context,
            String endpoint,
            String token,
            String actionId,
            String actionStep,
            String taskId,
            String role) throws Exception {

        JSONObject body = new JSONObject();
        body.put("token", token);
        body.put("action_id", actionId);
        body.put("expected_step", actionStep == null ? "" : actionStep);
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

            if (status >= 200 && status < 300) {
                // The server has already moved the task. Its own dispatch carries
                // the new revision to this device, which repaints the card — so the
                // receiver deliberately does not guess the new state here.
                return;
            }

            // A refused capability must not be retried forever: drop it, so the
            // next tap opens the task instead of posting a token we know is dead.
            if (status == 401 || response.contains("expired") || response.contains("missing_token")) {
                new JobaLiveUpdateStore(context)
                        .putActionAuth(JobaLiveUpdateStore.keyOf(taskId, role), "", "", 0L);
            }
        } finally {
            if (connection != null) connection.disconnect();
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