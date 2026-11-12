package __PKG__;

import android.app.Activity;
import android.content.Intent;
import android.os.Bundle;

/**
 * THE CARD'S ACTION, AS THE ONE KIND OF LAUNCH ANDROID NEVER REFUSES.
 *
 * ── WHY THIS ACTIVITY EXISTS ─────────────────────────────────────────────────
 * The card's button was a broadcast to JobaLiveUpdateActionReceiver. A broadcast
 * is the tidier mechanism, and it works in isolation — but it gave us exactly
 * two outcomes to depend on, and the tap died in both:
 *
 *   · the POST failed (a refused or expired capability, a redirect the HTTP
 *     stack would not follow, a plain HTML answer) — and
 *   · the fallback then tried to start the app FROM THE RECEIVER, which
 *     Android 10+ blocks outright (and Android 12+ bans as a "notification
 *     trampoline").
 *
 * Nothing was drawn, nothing was sent, nothing opened. A button that does not
 * respond is the worst failure a notification can have, because it looks alive.
 *
 * A notification's PendingIntent that launches an ACTIVITY is the one launch the
 * operating system always honours, on every version. So the tap now always lands
 * right here — in a window that shows nothing: translucent, no title, no
 * animation, no entry in Recents, closed the instant the work is done. The
 * publisher never leaves what they were looking at, and the action still runs.
 *
 * Everything the tap does is the receiver's own code (runAction), so there is
 * one implementation and no second place to be wrong: act in place when a
 * capability exists, otherwise open the app on that task — from a foreground
 * activity, which is allowed, instead of from a receiver, which is not.
 */
public class JobaLiveUpdateActionActivity extends Activity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        // No content view and no layout: this window exists only to run the tap.
        overridePendingTransition(0, 0);

        final Intent intent = getIntent();
        JobaLiveUpdateActionReceiver.runAction(this, intent, new Runnable() {
            @Override
            public void run() {
                // Back to whatever was on screen, without a transition.
                runOnUiThread(new Runnable() {
                    @Override
                    public void run() {
                        finish();
                        overridePendingTransition(0, 0);
                    }
                });
            }
        });
    }

    /** A tap that arrives while this window is up must not stack another one. */
    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
    }
}