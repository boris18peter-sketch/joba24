package __PKG__;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.drawable.Drawable;
import android.graphics.drawable.Icon;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.widget.RemoteViews;

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
 *   iOS Lock Screen                       this notification
 *   ─────────────────────────────────     ───────────────────────────────────
 *   white card, 22pt radius, hairline     res/layout/joba_live_update_card.xml
 *   icon bubble (44 / radius 14)          the bubble + the tinted step glyph
 *   title, bold --text-1                  joba_card_title
 *   subtitle, --text-2, 2 lines           joba_card_subtitle
 *   "2/3" capsule                         joba_card_counter
 *   step rail, reached = brand blue       joba_card_segments (+ labels)
 *   one full-width green action           joba_card_action
 *   Hebrew, forced right-to-left          layoutDirection="rtl" + RTL strings
 *   brand blue / success green            the same two colours, from the palette
 *
 * The title / text / action this builder also sets are the FALLBACK a launcher
 * uses if it refuses a custom view (and what a heads-up peek shows) — not the
 * card. See `buildCardViews`.
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

    /**
     * ── THE CARD'S OWN GROUP ─────────────────────────────────────────────────
     * Android bundles every notification an app posts into one group, and a
     * GROUPED notification is drawn in its COLLAPSED, inset form — which is
     * exactly the "the widget is tiny and squashed" report: the card was being
     * rendered as a child of the "בקשה חדשה!" group, so the shade showed the
     * compact row squeezed into a child slot instead of the full card.
     *
     * Giving the card a group of its own keeps it out of that bundle. A group
     * with a single member is drawn at full width with its big content, which is
     * the card this class was built to draw.
     */
    private static final String GROUP_KEY = "joba24_live_card";
    private static final String CHANNEL_NAME = "עדכוני משימה";
    private static final String CHANNEL_DESCRIPTION = "כרטיס המשימה הפעילה — עדכון סטטוס בזמן אמת";
    private static final String TAG = "joba-live-update";

    /** The widget's own palette, unchanged. */
    private static final int BRAND = 0xFF1A6FD4;
    private static final int BRAND_LIGHT = 0xFFEFF6FF;
    private static final int SUCCESS = 0xFF059669;
    private static final int TEXT1 = 0xFF0D1E40;
    private static final int TEXT2 = 0xFF4B6083;
    private static final int TEXT3 = 0xFF94A3B8;
    private static final int BORDER = 0xFFE4EAF5;

    /**
     * The rail's four slots.
     *
     * Four is the SAME ceiling the iOS rail uses (`min(payload.total, 4)` when the
     * promoted style builds its segments), and it is fixed here because a
     * RemoteViews layout cannot add views at runtime: a flow longer than four
     * steps shows its first four positions rather than a rail that stops meaning
     * anything. `total` still drives the "2/3" capsule, so the number is never
     * wrong even when the rail is cropped.
     */
    private static final int[] SEGMENT_IDS = {
            R.id.joba_seg_1, R.id.joba_seg_2, R.id.joba_seg_3, R.id.joba_seg_4,
    };
    private static final int[] LABEL_IDS = {
            R.id.joba_label_1, R.id.joba_label_2, R.id.joba_label_3, R.id.joba_label_4,
    };

    /**
     * The rating ask's five taps — the same row the iOS card draws.
     *
     * A finished job's card has no flow action left, so the stars take the
     * button's place: one tap answers the card where it is, with no app launch.
     * Five fixed slots, for the same reason the rail has four: a RemoteViews
     * layout cannot add views at runtime.
     */
    private static final int[] STAR_IDS = {
            R.id.joba_star_1, R.id.joba_star_2, R.id.joba_star_3, R.id.joba_star_4, R.id.joba_star_5,
    };

    /** The accent gold the in-app star row and the iOS card both use (#fbbf24). */
    private static final int GOLD = 0xFFFBBF24;

    /**
     * The action id a star tap carries.
     *
     * Deliberately the literal string: the server's own constant lives in
     * `base44/shared/liveActivityRating.ts` (`RATING_ACTION_ID`) and this file is
     * compiled into the native project, so it cannot import it. The value is a
     * wire contract, not an internal name — it must not drift.
     */
    private static final String RATING_ACTION_ID = "rate_counterpart";

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
                    .setGroup(GROUP_KEY)
                    .setGroupSummary(false)
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

            // ── THE DESIGNED CARD, ON EVERY VERSION ──────────────────────────
            // This used to be conditional: a device that could build the progress
            // style got the platform's card, and only a device that could not got
            // ours. The reasoning was that a custom view replaces the system card
            // and its status-bar chip — but the assumption behind it was wrong.
            //
            // ProgressStyle being buildable says nothing about whether the card is
            // actually PROMOTED: the platform decides that itself (the user's Live
            // Update setting, the launcher, whether the notification qualifies).
            // On a phone where the style built and the promotion did not happen,
            // the result was a standard, compact system notification — two lines of
            // text and a chevron in the shade, which is exactly the "very small and
            // impossible to understand" card that was reported. Our card was
            // written, tested and then never drawn on that device.
            //
            // So the designed card is now ALWAYS attached. It is the same card on
            // every Android version: the icon bubble, the two lines, the flow
            // position, the step rail with its labels, and the full-width action.
            // A promoted notification still gets its platform treatment, and one
            // that is not promoted now shows a real card instead of a text row.
            RemoteViews card = buildCardViews(context, payload, openIntent, buttonIntent);
            if (card != null) {
                RemoteViews compact = buildCompactViews(context, payload, openIntent, buttonIntent);
                builder.setCustomContentView(compact != null ? compact : card);
                builder.setCustomBigContentView(card);
            }

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
                    .setGroup(GROUP_KEY)
                    .setGroupSummary(false)
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

            // ── THE CARD THE USER ACTUALLY SEES ───────────────────────────────
            // Everything above is the fallback: the title, the text and the action
            // are what a launcher draws if it refuses a custom view, and what a
            // heads-up peek shows. The designed card — the same blocks as the iOS
            // Lock Screen card — comes from the two RemoteViews layouts below, so
            // the shade shows a real card instead of a paragraph of text with a
            // progress bar underneath it.
            //
            // The collapsed slot gets its OWN layout: one tall card cannot serve a
            // 64dp row, so reusing it would clip the title under the button.
            RemoteViews card = buildCardViews(context, payload, openIntent, buttonIntent);
            if (card != null) {
                RemoteViews compact = buildCompactViews(context, payload, openIntent, buttonIntent);
                builder.setCustomContentView(compact != null ? compact : card);
                builder.setCustomBigContentView(card);
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
        // ── AN ACTIVITY, NOT A BROADCAST ─────────────────────────────────────
        // This used to be a broadcast to JobaLiveUpdateOpenReceiver, which then
        // called `startActivity` — and Android 10+ refuses a background activity
        // start from a receiver, so tapping the card did nothing at all. A
        // notification's own PendingIntent is the one launch the OS always
        // honours, so the tap goes straight to the activity, carrying the task id
        // as an extra the plugin reads on the way in.
        Intent intent = new Intent(context, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK
                | Intent.FLAG_ACTIVITY_SINGLE_TOP
                | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        intent.putExtra("joba_open_task", payload.taskId);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;
        return PendingIntent.getActivity(context, notificationId(payload.key()), intent, flags);
    }

    /**
     * The card's ONE action — and it now behaves the way the label promises.
     *
     * ── WHY A TAP USED TO DO NOTHING AT ALL ─────────────────────────────────
     * The button always broadcast to JobaLiveUpdateActionReceiver, and the
     * receiver could only act if the app had already minted this card a
     * capability. Without one it fell back to `startActivity` — and a broadcast
     * receiver has no visible UI, so Android 10+ blocks that background activity
     * start outright. The result was a tap that produced nothing whatsoever: no
     * request, no app, no explanation. That is exactly what "the buttons do not
     * respond" means at the OS level.
     *
     * The decision is therefore made HERE, where the card is drawn, and it is made
     * once for the whole life of this revision:
     *
     *   a capability exists → broadcast the action. It posts straight to the
     *     endpoint, the card is corrected from the server's own answer, and no app
     *     opens — the Lock Screen behaviour.
     *   no capability yet  → the receiver brings the app up on that task, where a
     *     fresh capability (and the action itself) lives.
     *
     * ── WHY THERE IS NO ACTIVITY PENDINGINTENT HERE ANY MORE ────────────────
     * The no-capability branch used to return `PendingIntent.getActivity(...)`
     * and pass the task id as an Intent extra that NOTHING on the Android side
     * ever read: MainActivity has no onNewIntent, and the store — the only thing
     * the web layer listens to — was never written. So the app opened on the feed
     * and the tap produced no action, no navigation and no error. That is the
     * report "the buttons in the card do not respond", and it could not be fixed
     * from the web layer, because the information died inside a launch Intent.
     *
     * Every tap now goes to the receiver, which records the task in the store the
     * app reads on launch/resume (JobaLiveUpdatePlugin), acts in place when it
     * holds a capability, and otherwise opens the app on that task. One path,
     * one place to be wrong, and it is the path the card body already uses.
     */
    private static PendingIntent buttonIntent(Context context, JobaLiveUpdatePayload payload) {
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;
        // A distinct request code from the open intent, or the two PendingIntents
        // would be the same object and the tap would do the wrong thing.
        int requestCode = notificationId(payload.key()) + 1;

        // ── CAN THIS CARD ACT FOR ITSELF, RIGHT NOW? ─────────────────────────
        // A capability is what lets the receiver post straight to the endpoint
        // without opening the app. It is minted by the app, so a card drawn by a
        // push while the app was closed has none — and that is the case the
        // buttons used to die in: the broadcast ran, could not act, tried to
        // start the activity from a receiver, and Android refused it. Silence.
        if (mayActInPlace(context, payload)) {
            Intent intent = new Intent(context, JobaLiveUpdateActionReceiver.class);
            intent.setAction(ACTION_BUTTON);
            intent.putExtra("task_id", payload.taskId);
            intent.putExtra("role", payload.role);
            intent.putExtra("action_id", payload.actionId);
            intent.putExtra("action_step", payload.actionStep);
            return PendingIntent.getBroadcast(context, requestCode, intent, flags);
        }

        // No capability: the tap opens the app on this task, where the same
        // action is one press away. A notification PendingIntent may launch an
        // activity on every Android version, so this tap can never be swallowed.
        return openTaskIntent(context, payload, requestCode);
    }

    /** True when a tap can be performed without bringing the app forward. */
    private static boolean mayActInPlace(Context context, JobaLiveUpdatePayload payload) {
        if (!payload.hasAction()) return false;
        try {
            JobaLiveUpdateStore store = new JobaLiveUpdateStore(context);
            String key = JobaLiveUpdateStore.keyOf(payload.taskId, payload.role);
            return store.canAct(key) || store.canActAsInstall();
        } catch (Throwable ignored) {
            return false;
        }
    }

    /** Open the app on this task — the tap that always lands somewhere. */
    private static PendingIntent openTaskIntent(Context context, JobaLiveUpdatePayload payload, int requestCode) {
        Intent intent = new Intent(context, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK
                | Intent.FLAG_ACTIVITY_SINGLE_TOP
                | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        intent.putExtra("joba_open_task", payload.taskId);
        intent.putExtra("joba_open_role", payload.role);
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;
        return PendingIntent.getActivity(context, requestCode, intent, flags);
    }

    /* ══════════════════════════════════════════════════════════════════════
       THE DESIGNED CARD
       ══════════════════════════════════════════════════════════════════════ */

    /**
     * The expanded card: bubble, title, subtitle, position capsule, step rail with
     * its labels, and the one action — the iOS card's own blocks, in its order.
     *
     * Every value is pushed through RemoteViews setters rather than baked into the
     * layout, because this view is re-bound on every revision and inflating a new
     * one per update is what makes a card flicker.
     */
    private static RemoteViews buildCardViews(
            Context context,
            JobaLiveUpdatePayload payload,
            PendingIntent openIntent,
            PendingIntent buttonIntent) {
        try {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.joba_live_update_card);

            Bitmap glyph = glyphBitmap(context, dpToPx(context, 22), colorFor(payload));
            if (glyph != null) views.setImageViewBitmap(R.id.joba_card_icon, glyph);

            views.setTextViewText(R.id.joba_card_title, orTitle(payload));
            String subtitle = JobaLiveUpdatePayload.rtl(payload.subtitle);
            if (subtitle.isEmpty()) {
                views.setViewVisibility(R.id.joba_card_subtitle, View.GONE);
            } else {
                views.setTextViewText(R.id.joba_card_subtitle, subtitle);
            }

            // The "1/3" the card shows beside the rail — the same value the
            // status-bar chip carries on Android 16.
            String counter = payload.progressText();
            if (counter.isEmpty()) {
                views.setViewVisibility(R.id.joba_card_counter, View.GONE);
            } else {
                views.setTextViewText(R.id.joba_card_counter, JobaLiveUpdatePayload.rtl(counter));
            }

            fillRail(views, payload);

            if (buttonIntent != null && payload.hasAction()) {
                views.setTextViewText(R.id.joba_card_action, JobaLiveUpdatePayload.rtl(payload.actionLabel));
                views.setViewVisibility(R.id.joba_card_action, View.VISIBLE);
                views.setOnClickPendingIntent(R.id.joba_card_action, buttonIntent);
            } else {
                views.setViewVisibility(R.id.joba_card_action, View.GONE);
            }

            fillStars(context, views, payload);

            views.setOnClickPendingIntent(R.id.joba_card_root, openIntent);
            return views;
        } catch (Throwable ignored) {
            // A launcher that refuses the layout falls back to the title/text/action
            // this notification already carries — never to an empty card.
            return null;
        }
    }

    /**
     * The stars, in the one place the card can offer an answer.
     *
     * ── ASKING VERSUS ANSWERED ───────────────────────────────────────────────
     * `ratingValue` is the star the server recorded: 0 while the card is ASKING.
     * Asking, every star is drawn in the rail's "not reached yet" grey and each
     * one is a control. Answered, the chosen stars take the accent gold and no
     * tap is bound at all — a card that has its answer must not invite a second
     * one (the server refuses it, and a dead tap is worse than no tap).
     *
     * A card with no rating at all hides the row entirely, so the ordinary
     * in-progress card is unchanged.
     */
    private static void fillStars(Context context, RemoteViews views, JobaLiveUpdatePayload payload) {
        boolean answered = payload.ratingValue > 0;
        boolean asking = payload.hasRatingAsk() && !answered;

        if (!asking && !answered) {
            views.setViewVisibility(R.id.joba_card_stars, View.GONE);
            return;
        }

        views.setViewVisibility(R.id.joba_card_stars, View.VISIBLE);
        for (int index = 0; index < STAR_IDS.length; index += 1) {
            int star = index + 1;
            boolean filled = answered && star <= payload.ratingValue;
            views.setTextColor(STAR_IDS[index], filled ? GOLD : BORDER);
            if (asking) {
                views.setOnClickPendingIntent(STAR_IDS[index], starIntent(context, payload, star));
            }
        }
    }

    /**
     * One star's tap.
     *
     * It goes to the SAME receiver the action button uses, because it is the same
     * kind of tap: a broadcast that posts to the capability endpoint without
     * opening the app, and falls back to opening the task when it cannot act. The
     * only difference is the body — `action_id: rate_counterpart` and the star.
     */
    private static PendingIntent starIntent(Context context, JobaLiveUpdatePayload payload, int stars) {
        int flags = PendingIntent.FLAG_UPDATE_CURRENT;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) flags |= PendingIntent.FLAG_IMMUTABLE;

        // A star can only be recorded by the server, so without a capability the
        // tap opens the task (where the same question is asked) instead of being
        // swallowed by a broadcast that has nothing to post.
        if (!mayActInPlace(context, payload)) {
            return openTaskIntent(context, payload, notificationId(payload.key()) + 10 + stars);
        }

        Intent intent = new Intent(context, JobaLiveUpdateActionReceiver.class);
        intent.setAction(ACTION_BUTTON);
        intent.putExtra("task_id", payload.taskId);
        intent.putExtra("role", payload.role);
        intent.putExtra("action_id", RATING_ACTION_ID);
        intent.putExtra("stars", stars);

        // One request code per star, offset past the open and action intents: with
        // a shared code the five PendingIntents would be the SAME object, and every
        // star would post whichever value was bound last.
        return PendingIntent.getBroadcast(
                context, notificationId(payload.key()) + 10 + stars, intent, flags);
    }

    /** The collapsed row: the bubble, the sentence and the position, nothing else. */
    private static RemoteViews buildCompactViews(
            Context context,
            JobaLiveUpdatePayload payload,
            PendingIntent openIntent,
            PendingIntent buttonIntent) {
        try {
            RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.joba_live_update_compact);

            Bitmap glyph = glyphBitmap(context, dpToPx(context, 18), colorFor(payload));
            if (glyph != null) views.setImageViewBitmap(R.id.joba_compact_icon, glyph);

            views.setTextViewText(R.id.joba_compact_title, orTitle(payload));
            String subtitle = JobaLiveUpdatePayload.rtl(payload.subtitle);
            views.setTextViewText(R.id.joba_compact_subtitle, subtitle.isEmpty()
                    ? JobaLiveUpdatePayload.rtl(payload.categoryLabel) : subtitle);

            String counter = payload.progressText();
            if (counter.isEmpty()) {
                views.setViewVisibility(R.id.joba_compact_counter, View.GONE);
            } else {
                views.setTextViewText(R.id.joba_compact_counter, JobaLiveUpdatePayload.rtl(counter));
            }

            // ── THE BUTTON EXISTS IN THE COLLAPSED ROW TOO ────────────────────
            // The collapsed row used to be read-only, so a card sitting in the
            // shade (or inside a group) offered nothing to press — the app looked
            // unresponsive because the control simply was not there. The action
            // is now a pill on this row as well, bound to the SAME intent the big
            // card uses, so one tap works without expanding the card first.
            if (buttonIntent != null && payload.hasAction()) {
                views.setTextViewText(R.id.joba_compact_action, JobaLiveUpdatePayload.rtl(payload.actionLabel));
                views.setViewVisibility(R.id.joba_compact_action, View.VISIBLE);
                views.setOnClickPendingIntent(R.id.joba_compact_action, buttonIntent);
            } else {
                views.setViewVisibility(R.id.joba_compact_action, View.GONE);
            }

            views.setOnClickPendingIntent(R.id.joba_compact_root, openIntent);
            return views;
        } catch (Throwable ignored) {
            return null;
        }
    }

    /**
     * The rail, filled the way the iOS one is.
     *
     * Three states per slot, the same three the Lock Screen draws:
     *   behind the work  → brand blue, label in --text-1;
     *   the current step → brand blue, label in brand blue and bold;
     *   still ahead      → border grey, label in --text-3.
     * A flow with no position yet (the OPEN phase) hides the rail and its labels
     * entirely rather than drawing a row of empty dashes.
     */
    private static void fillRail(RemoteViews views, JobaLiveUpdatePayload payload) {
        boolean show = payload.total > 0 && payload.step >= 0;
        views.setViewVisibility(R.id.joba_card_segments, show ? View.VISIBLE : View.GONE);
        views.setViewVisibility(R.id.joba_card_labels, show ? View.VISIBLE : View.GONE);
        if (!show) return;

        int slots = Math.min(payload.total, SEGMENT_IDS.length);
        int current = Math.min(Math.max(payload.step, 0), slots - 1);

        for (int index = 0; index < SEGMENT_IDS.length; index += 1) {
            boolean used = index < slots;
            views.setViewVisibility(SEGMENT_IDS[index], used ? View.VISIBLE : View.GONE);
            views.setViewVisibility(LABEL_IDS[index], used ? View.VISIBLE : View.GONE);
            if (!used) continue;

            views.setInt(SEGMENT_IDS[index], "setBackgroundResource",
                    index <= current
                            ? R.drawable.joba_live_segment_on
                            : R.drawable.joba_live_segment_off);

            String label = index < payload.stepLabels.size() ? payload.stepLabels.get(index) : "";
            views.setTextViewText(LABEL_IDS[index], JobaLiveUpdatePayload.rtl(label));
            views.setTextColor(LABEL_IDS[index],
                    index == current ? BRAND : (index < current ? TEXT1 : TEXT3));
            // `TextView.setPaintFlags` is reachable from RemoteViews, and it is the
            // only way to make ONE label heavier without a second layout: the step
            // the work is on is the only one that carries weight.
            views.setInt(LABEL_IDS[index], "setPaintFlags",
                    Paint.ANTI_ALIAS_FLAG | (index == current ? Paint.FAKE_BOLD_TEXT_FLAG : 0));
        }
    }

    /**
     * The app's own step glyph, tinted, as a bitmap.
     *
     * RemoteViews cannot tint a drawable, so the vector is drawn into a bitmap in
     * the card's colour once per revision. The bubble behind it is a shape
     * drawable in the layout, so only the glyph needs to be a bitmap.
     */
    private static Bitmap glyphBitmap(Context context, int sizePx, int color) {
        try {
            Drawable glyph = context.getDrawable(R.drawable.ic_joba_live);
            if (glyph == null || sizePx <= 0) return null;
            glyph = glyph.mutate();
            glyph.setTint(color);
            Bitmap bitmap = Bitmap.createBitmap(sizePx, sizePx, Bitmap.Config.ARGB_8888);
            Canvas canvas = new Canvas(bitmap);
            glyph.setBounds(0, 0, sizePx, sizePx);
            glyph.draw(canvas);
            return bitmap;
        } catch (Throwable ignored) {
            return null;
        }
    }

    private static int dpToPx(Context context, int dp) {
        return (int) (dp * context.getResources().getDisplayMetrics().density + 0.5f);
    }
}