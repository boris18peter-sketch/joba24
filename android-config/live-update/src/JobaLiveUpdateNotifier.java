package __PKG__;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.graphics.drawable.Icon;
import android.os.Build;
import android.os.Bundle;

import androidx.core.app.NotificationCompat;

import java.util.ArrayList;
import java.util.List;

/**
 * Draws the Joba24 card as an Android notification.
 *
 * ── WHAT "PARITY" MEANS HERE ────────────────────────────────────────────────
 * The card is not re-designed for Android; it is the SAME card, mapped onto what
 * a notification can actually do:
 *
 *   iOS Lock Screen                       Android notification
 *   ─────────────────────────────────     ───────────────────────────────────
 *   brand mark + app name                 large icon = the app's own icon
 *   title (the flow's own words)          content title
 *   subtitle (what to do next)            content text, wrapped in BigText
 *   step row with a tick per step          a segmented progress bar + "2/3"
 *   step labels                           the labels, in the expanded text
 *   one action button                     one action button
 *   Hebrew, forced right-to-left          the same strings, marked RTL
 *   brand blue / success green            the same two colours, from the palette
 *
 * The palette is copied verbatim from the widget (JobaPalette in
 * ios/App/JobaActivityWidget/JobaActivityWidgetBundle.swift) so the two surfaces
 * cannot drift apart: #1a6fd4, #059669, #fbbf24, #0d1e40, #4b6083, #e4eaf5.
 *
 * ── TWO BUILDERS, ONE CARD ──────────────────────────────────────────────────
 * From Android 16 (API 36) a notification can carry `Notification.ProgressStyle`
 * and ask to be PROMOTED to a Live Update — the status-bar chip and the
 * prominent Lock Screen placement, which is Android's answer to a Live Activity.
 * Below that, an ongoing notification with a progress bar is the honest
 * equivalent. The content is identical; only the bar's implementation differs.
 *
 * The API 36 classes are reached by REFLECTION on purpose: this file then
 * compiles against whatever `compileSdk` the generated Capacitor project
 * declares, so adding the card can never break the build on a project that has
 * not moved to SDK 36 yet. On a device that lacks them the calls are skipped and
 * the fallback path runs — which is exactly the "older Android" behaviour.
 */
public final class JobaLiveUpdateNotifier {

    public static final String CHANNEL_ID = "joba24_live_update";
    private static final String CHANNEL_NAME = "עדכוני משימה";
    private static final String CHANNEL_DESCRIPTION = "כרטיס המשימה הפעילה — עדכון סטטוס בזמן אמת";
    private static final String TAG = "joba-live-update";

    /** The widget's own palette, unchanged. */
    private static final int BRAND = 0xFF1A6FD4;
    private static final int BRAND_LIGHT = 0xFFEFF6FF;
    private static final int SUCCESS = 0xFF059669;
    private static final int TEXT1 = 0xFF0D1E40;
    private static final int TEXT2 = 0xFF4B6083;
    private static final int BORDER = 0xFFE4EAF5;

    /** The intent action the action button broadcasts. */
    public static final String ACTION_BUTTON = "__PKG__.LIVE_UPDATE_BUTTON";

    private JobaLiveUpdateNotifier() {}

    /** One notification identity per card: (task, role). Stable across restarts. */
    public static int notificationId(String key) {
        int hash = ("joba-live:" + key).hashCode();
        return 2000 + (Math.abs(hash) % 100000);
    }

    public static void ensureChannel(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) return;
        if (manager.getNotificationChannel(CHANNEL_ID) != null) return;

        NotificationChannel channel = new NotificationChannel(CHANNEL_ID, CHANNEL_NAME, NotificationManager.IMPORTANCE_DEFAULT);
        channel.setDescription(CHANNEL_DESCRIPTION);
        // A progress card is not a message: it must not buzz on every revision.
        // iOS updates a Live Activity silently, and this is the Android equivalent.
        channel.setShowBadge(false);
        channel.enableVibration(false);
        channel.setSound(null, null);
        channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
        manager.createNotificationChannel(channel);
    }

    public static boolean post(Context context, JobaLiveUpdatePayload payload) {
        if (payload == null) return false;
        ensureChannel(context);

        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null || !manager.areNotificationsEnabled()) return false;

        String key = payload.key();
        PendingIntent openIntent = openIntent(context, payload);
        PendingIntent buttonIntent = payload.hasAction() ? buttonIntent(context, payload) : null;

        Notification notification = Build.VERSION.SDK_INT >= 36
                ? buildPromoted(context, payload, openIntent, buttonIntent)
                : buildOngoing(context, payload, openIntent, buttonIntent);

        if (notification == null) {
            // The promoted build failed on a device that claims to support it —
            // fall back rather than show nothing at all.
            notification = buildOngoing(context, payload, openIntent, buttonIntent);
        }
        if (notification == null) return false;

        manager.notify(TAG, notificationId(key), notification);
        return true;
    }

    public static void cancel(Context context, String key) {
        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null) return;
        manager.cancel(TAG, notificationId(key));
    }

    /* ══════════════════════════════════════════════════════════════════════
       THE CARD ITSELF
       ══════════════════════════════════════════════════════════════════════ */

    /** Android 16+: progress segments, and a request to be promoted. */
    private static Notification buildPromoted(
            Context context,
            JobaLiveUpdatePayload payload,
            PendingIntent openIntent,
            PendingIntent buttonIntent) {
        try {
            Notification.Builder builder = new Notification.Builder(context, CHANNEL_ID)
                    .setSmallIcon(R.drawable.ic_joba_live)
                    .setColor(colorFor(payload))
                    .setContentTitle(orTitle(payload))
                    .setContentText(JobaLiveUpdatePayload.rtl(payload.subtitle))
                    .setSubText(subText(payload))
                    .setContentIntent(openIntent)
                    .setCategory(Notification.CATEGORY_PROGRESS)
                    .setVisibility(Notification.VISIBILITY_PUBLIC)
                    .setOngoing(true)
                    .setOnlyAlertOnce(true)
                    .setShowWhen(false)
                    .setAutoCancel(false)
                    // ── SILENCE, WITHOUT setSilent ────────────────────────────────
                    // `setSilent(boolean)` exists only on NotificationCompat's
                    // builder. This chain is the FRAMEWORK builder — it has to be,
                    // because the promoted style and its extras are framework
                    // types — and the framework has no such method: calling it
                    // here failed the release build at
                    // `:app:compileReleaseJavaWithJavac` with "cannot find symbol".
                    //
                    // androidx implements setSilent by clearing the sound and the
                    // vibration pattern and dropping those two default bits, so
                    // these two calls are the same instruction written out. Silence
                    // itself is owned by the notification channel above
                    // (no sound, no vibration, IMPORTANCE_DEFAULT), and this path
                    // only runs on Android 16+, where the channel is what decides.
                    .setSound(null)
                    .setVibrate(null);

            // The status-chip text: the same counter the card shows.
            String critical = payload.progressText();
            if (!critical.isEmpty()) invokeStringSetter(builder, "setShortCriticalText", JobaLiveUpdatePayload.rtl(critical));

            // The promotion request. `android.requestPromotedOngoing` is the extra
            // key the platform reads at compileSdk 36 (the typed setter arrived in
            // 36.1, so the extra is the portable form).
            Bundle extras = new Bundle();
            extras.putBoolean("android.requestPromotedOngoing", true);
            builder.addExtras(extras);

            Notification.Style style = progressStyle(payload);
            if (style != null) builder.setStyle(style);

            if (buttonIntent != null) {
                builder.addAction(new Notification.Action.Builder(
                        Icon.createWithResource(context, R.drawable.ic_joba_live),
                        JobaLiveUpdatePayload.rtl(payload.actionLabel),
                        buttonIntent).build());
            }

            applyLargeIcon(builder, context);
            return builder.build();
        } catch (Throwable ignored) {
            return null;
        }
    }

    /** Every Android version: one ongoing notification, updated in place. */
    private static Notification buildOngoing(
            Context context,
            JobaLiveUpdatePayload payload,
            PendingIntent openIntent,
            PendingIntent buttonIntent) {
        try {
            NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
                    .setSmallIcon(R.drawable.ic_joba_live)
                    .setColor(colorFor(payload))
                    .setContentTitle(orTitle(payload))
                    .setContentText(JobaLiveUpdatePayload.rtl(payload.subtitle))
                    .setSubText(subText(payload))
                    .setContentIntent(openIntent)
                    .setCategory(NotificationCompat.CATEGORY_PROGRESS)
                    .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
                    .setOngoing(true)
                    .setOnlyAlertOnce(true)
                    .setShowWhen(false)
                    .setAutoCancel(false)
                    .setSilent(true)
                    .setStyle(new NotificationCompat.BigTextStyle().bigText(bigText(payload)));

            if (payload.total > 0) {
                int max = payload.total;
                int current = Math.min(Math.max(payload.step + 1, 0), max);
                builder.setProgress(max, current, false);
            }

            // Where the platform supports promotion but not ProgressStyle, the
            // extra is still what asks for it; on older versions it is ignored.
            Bundle extras = new Bundle();
            extras.putBoolean("android.requestPromotedOngoing", true);
            builder.addExtras(extras);

            if (buttonIntent != null) {
                builder.addAction(new NotificationCompat.Action.Builder(
                        R.drawable.ic_joba_live,
                        JobaLiveUpdatePayload.rtl(payload.actionLabel),
                        buttonIntent).build());
            }

            try {
                builder.setLargeIcon(android.graphics.BitmapFactory.decodeResource(
                        context.getResources(), context.getApplicationInfo().icon));
            } catch (Throwable ignored) {
                // A missing launcher icon must never cost the card.
            }

            return builder.build();
        } catch (Throwable ignored) {
            return null;
        }
    }

    /**
     * The step row, as an Android progress bar.
     *
     * `Notification.ProgressStyle` is built through reflection so this class
     * compiles on every compileSdk: one segment per flow step, the bar drawn in
     * the same two colours the card uses, and the tracker at the current step.
     */
    private static Notification.Style progressStyle(JobaLiveUpdatePayload payload) {
        try {
            Class<?> styleClass = Class.forName("android.app.Notification$ProgressStyle");
            Object style = styleClass.getConstructor().newInstance();

            int steps = Math.min(Math.max(payload.total, 1), 4);
            int current = Math.min(Math.max(payload.step + 1, 0), steps);

            Class<?> segmentClass = Class.forName("android.app.Notification$ProgressStyle$Segment");
            java.lang.reflect.Method setColor = segmentClass.getMethod("setColor", int.class);
            java.lang.reflect.Method addSegment = styleClass.getMethod("addProgressSegment", segmentClass);

            for (int index = 0; index < steps; index += 1) {
                Object segment = segmentClass.getConstructor(int.class).newInstance(100);
                setColor.invoke(segment, index < current ? colorFor(payload) : BORDER);
                addSegment.invoke(style, segment);
            }

            styleClass.getMethod("setProgress", int.class).invoke(style, Math.max(0, current * 100));
            // Each segment keeps its own colour rather than being re-tinted by the
            // bar's fill — that is what draws "steps behind me" the same way the
            // card draws a ticked step.
            styleClass.getMethod("setStyledByProgress", boolean.class).invoke(style, false);
            return (Notification.Style) style;
        } catch (Throwable ignored) {
            return null;
        }
    }

    private static void invokeStringSetter(Object target, String method, String value) {
        try {
            target.getClass().getMethod(method, String.class).invoke(target, value);
        } catch (Throwable ignored) {
            // Not available on this version — the card simply has no chip text.
        }
    }

    private static void applyLargeIcon(Notification.Builder builder, Context context) {
        try {
            builder.setLargeIcon(Icon.createWithResource(context, context.getApplicationInfo().icon));
        } catch (Throwable ignored) {
            // See the compat path: a missing icon never costs the card.
        }
    }

    /* ══════════════════════════════════════════════════════════════════════
       CONTENT
       ══════════════════════════════════════════════════════════════════════ */

    private static CharSequence orTitle(JobaLiveUpdatePayload payload) {
        String title = JobaLiveUpdatePayload.rtl(payload.title);
        if (!title.isEmpty()) return title;
        return JobaLiveUpdatePayload.rtl(payload.categoryLabel);
    }

    private static String subText(JobaLiveUpdatePayload payload) {
        List<String> parts = new ArrayList<>();
        String progress = payload.progressText();
        if (!progress.isEmpty()) parts.add(progress);
        if (payload.categoryLabel != null && !payload.categoryLabel.isEmpty()) parts.add(payload.categoryLabel);
        return parts.isEmpty() ? "" : JobaLiveUpdatePayload.rtl(JobaLiveUpdatePayload.join(" · ", parts));
    }

    /** The expanded text: the subtitle, then the flow's own step labels. */
    private static CharSequence bigText(JobaLiveUpdatePayload payload) {
        StringBuilder builder = new StringBuilder();
        String subtitle = payload.subtitle == null ? "" : payload.subtitle.trim();
        if (!subtitle.isEmpty()) builder.append(JobaLiveUpdatePayload.RLM).append(subtitle);
        if (!payload.stepLabels.isEmpty()) {
            if (builder.length() > 0) builder.append('\n');
            List<String> labels = new ArrayList<>();
            for (int index = 0; index < payload.stepLabels.size(); index += 1) {
                String label = payload.stepLabels.get(index);
                if (label == null || label.trim().isEmpty()) continue;
                labels.add(index <= payload.step ? "✓ " + label.trim() : label.trim());
            }
            builder.append(JobaLiveUpdatePayload.RLM).append(JobaLiveUpdatePayload.join("  ·  ", labels));
        }
        if (payload.hasRatingAsk() && !payload.ratingPrompt.isEmpty()) {
            builder.append('\n').append(JobaLiveUpdatePayload.RLM).append(payload.ratingPrompt);
        }
        return builder.toString();
    }

    private static int colorFor(JobaLiveUpdatePayload payload) {
        if ("success".equals(payload.colorKey)) return SUCCESS;
        return BRAND;
    }

    /* ══════════════════════════════════════════════════════════════════════
       TAP TARGETS
       ══════════════════════════════════════════════════════════════════════ */

    /**
     * Tapping the card.
     *
     * A broadcast first, not the activity directly: the tap has to write the task
     * id down (so the web layer can open it after a cold start) and the app was
     * launched by OUR service rather than by the FCM SDK, so the SDK's own tap
     * plumbing never sees it. The receiver records the id and then starts the app.
     */
    private static PendingIntent openIntent(Context context, JobaLiveUpdatePayload payload) {
        Intent intent = new Intent(context, JobaLiveUpdateOpenReceiver.class);
        intent.setAction(JobaLiveUpdateOpenReceiver.ACTION_OPEN);
        intent.putExtra("task_id", payload.taskId);
        intent.putExtra("role", payload.role);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;
        return PendingIntent.getBroadcast(context, notificationId(payload.key()), intent, flags);
    }

    /** The card's ONE action — the same one the Lock Screen button performs. */
    private static PendingIntent buttonIntent(Context context, JobaLiveUpdatePayload payload) {
        Intent intent = new Intent(context, JobaLiveUpdateActionReceiver.class);
        intent.setAction(ACTION_BUTTON);
        intent.putExtra("task_id", payload.taskId);
        intent.putExtra("role", payload.role);
        intent.putExtra("action_id", payload.actionId);
        intent.putExtra("action_step", payload.actionStep);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;
        // A distinct request code from the open intent, or the two PendingIntents
        // would be the same object and the tap would do the wrong thing.
        return PendingIntent.getBroadcast(context, notificationId(payload.key()) + 1, intent, flags);
    }
}