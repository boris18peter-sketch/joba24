package __PKG__;

import android.os.Bundle;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

/**
 * One Live Update, exactly as the server's presentation contract defines it.
 *
 * ── THIS CLASS DECODES, IT NEVER DECIDES ────────────────────────────────────
 * `joba_snapshot` is the SAME object iOS decodes from `aps.content-state`
 * (base44/shared/taskActivitySnapshot.ts): same phase names, same title and
 * subtitle, same step progress, same single action, same rating ask. Nothing is
 * re-derived here, so the two platforms cannot disagree about what a task is
 * doing — and a new phase added on the server never needs a new Android class.
 *
 * Every field is read defensively, for the same reason the Swift decoder is:
 * a strict reader would have one failure mode that matters — a shape change on
 * the server throwing here and silently dropping the update, leaving a stale
 * card with no error anywhere. A missing subtitle must never cost the update.
 */
public final class JobaLiveUpdatePayload {

    /** The FCM data key. Mirrors LIVE_UPDATE_KEY in base44/shared/liveActivityFcm.ts. */
    public static final String DATA_KEY = "joba_live_update";

    /**
     * U+200F RIGHT-TO-LEFT MARK.
     *
     * ── WHY EVERY LINE IS WRAPPED ────────────────────────────────────────────
     * A notification is laid out by the system with the DEVICE locale's
     * direction, not the string's. On an English-locale phone a Hebrew sentence
     * that starts with a number ("3 מועמדויות · לחץ לצפייה ואישור") is laid out
     * left-to-right and the number jumps to the wrong end. iOS renders these
     * strings inside a view whose layoutDirection is forced to .rightToLeft; the
     * Android equivalent is to mark each string as right-to-left, which is what
     * the mark does. It is invisible, it is the standard fix, and it keeps the
     * text identical to the app's own copy.
     */
    public static final String RLM = "\u200F";

    public String taskId = "";
    public String role = "publisher";
    public String event = "update";
    public long revision = 0;
    public String updatedAt = "";
    public String phase = "";
    public String title = "";
    public String subtitle = "";
    public String categoryLabel = "";
    public String deepLink = "";
    public String iconKey = "";
    public String colorKey = "";
    public int step = -1;
    public int total = 0;
    public final List<String> stepLabels = new ArrayList<>();
    public final List<String> stepKeys = new ArrayList<>();
    public String actionId = "";
    public String actionStep = "";
    public String actionLabel = "";
    public String ratingPrompt = "";
    public int ratingValue = 0;
    public String raw = "";

    private JobaLiveUpdatePayload() {}

    /** The identity of this card: one notification per (task, role), like one card. */
    public String key() {
        return taskId + "|" + (role == null || role.isEmpty() ? "publisher" : role);
    }

    public boolean isEnd() {
        return "end".equals(event);
    }

    public boolean hasAction() {
        return !actionId.isEmpty() && !actionLabel.isEmpty();
    }

    public boolean hasRatingAsk() {
        return !ratingPrompt.isEmpty() || ratingValue > 0;
    }

    /** Right-to-left marked, or empty — never a stray mark on an empty line. */
    public static String rtl(String value) {
        String text = value == null ? "" : value.trim();
        if (text.isEmpty()) return "";
        return RLM + text;
    }

    /** "2/3" — the same counter the card draws beside its step row. */
    public String progressText() {
        if (total <= 0) return "";
        int current = Math.min(Math.max(step + 1, 0), total);
        return current + "/" + total;
    }

    /**
     * Everything the user can SEE, joined. Revision and timestamps are excluded
     * on purpose: two identical-looking snapshots differing only by revision are
     * not worth a re-render, and a snapshot that moved by revision alone must not
     * look like new content.
     */
    public String contentKey() {
        return String.join("|",
                title == null ? "" : title,
                subtitle == null ? "" : subtitle,
                phase == null ? "" : phase,
                String.valueOf(step),
                String.valueOf(total),
                String.join(",", stepLabels),
                categoryLabel == null ? "" : categoryLabel,
                actionId == null ? "" : actionId,
                actionLabel == null ? "" : actionLabel,
                colorKey == null ? "" : colorKey,
                ratingPrompt == null ? "" : ratingPrompt,
                String.valueOf(ratingValue));
    }

    /** From an FCM data map (the delivery path: app backgrounded or closed). */
    public static JobaLiveUpdatePayload fromData(java.util.Map<String, String> data) {
        if (data == null) return null;
        String json = data.get("joba_snapshot");
        JobaLiveUpdatePayload payload = fromJson(json);
        if (payload == null) return null;
        payload.event = "end".equals(data.get("joba_event")) ? "end" : "update";
        return payload;
    }

    /** From an FCM data Bundle (kept for older callers). */
    public static JobaLiveUpdatePayload fromBundle(Bundle data) {
        if (data == null) return null;
        String json = data.getString("joba_snapshot");
        JobaLiveUpdatePayload payload = fromJson(json);
        if (payload == null) return null;
        payload.event = "end".equals(data.getString("joba_event")) ? "end" : "update";
        return payload;
    }

    /** From the JSON the web layer hands the plugin (the foreground path). */
    public static JobaLiveUpdatePayload fromJson(String json) {
        if (json == null || json.trim().isEmpty()) return null;
        try {
            JSONObject body = new JSONObject(json);
            JobaLiveUpdatePayload p = new JobaLiveUpdatePayload();
            p.raw = json;
            p.taskId = body.optString("id", body.optString("taskId", ""));
            if (p.taskId.isEmpty()) return null;
            p.role = "worker".equals(body.optString("role", "")) ? "worker" : "publisher";
            p.revision = Math.max(1, body.optLong("revision", 1));
            p.updatedAt = body.optString("updatedAt", body.optString("updated_at", ""));
            p.phase = body.optString("phase", "");
            p.title = body.optString("title", "");
            p.subtitle = body.optString("subtitle", "");
            p.categoryLabel = body.optString("categoryLabel", "");
            p.deepLink = body.optString("deepLink", "");
            p.iconKey = body.optString("iconKey", "");
            p.colorKey = body.optString("colorKey", "");

            JSONObject progress = body.optJSONObject("progress");
            if (progress != null) {
                p.step = progress.optInt("step", -1);
                p.total = Math.max(0, progress.optInt("total", 0));
                JSONArray steps = progress.optJSONArray("steps");
                if (steps != null) {
                    for (int i = 0; i < steps.length(); i++) {
                        JSONObject row = steps.optJSONObject(i);
                        if (row == null) continue;
                        p.stepKeys.add(row.optString("key", ""));
                        p.stepLabels.add(row.optString("label", ""));
                    }
                }
            }

            JSONObject action = body.optJSONObject("action");
            if (action != null) {
                p.actionId = action.optString("id", "");
                p.actionStep = action.optString("step", "");
                p.actionLabel = action.optString("label", "");
            }

            JSONObject rating = body.optJSONObject("rating");
            if (rating != null) {
                p.ratingPrompt = rating.optString("prompt", "");
                p.ratingValue = rating.optInt("value", 0);
            }
            return p;
        } catch (Throwable ignored) {
            // A payload that cannot be parsed is not a reason to crash the FCM
            // service; it is one update that did not land, and the next revision does.
            return null;
        }
    }
}