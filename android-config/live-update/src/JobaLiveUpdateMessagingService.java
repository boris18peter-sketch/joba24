package __PKG__;

import androidx.annotation.NonNull;

import com.google.firebase.messaging.RemoteMessage;

import java.util.Map;

import io.capawesome.capacitorjs.plugins.firebase.messaging.MessagingService;

/**
 * The Android half of "the card must keep moving while the app is closed".
 *
 * ── WHY A SUBCLASS, AND NOT A SECOND SERVICE ────────────────────────────────
 * Android delivers FCM messages to ONE service per app: the one declaring the
 * `com.google.firebase.MESSAGING_EVENT` intent filter. @capacitor-firebase/
 * messaging declares that service (MessagingService) and the whole app's push
 * pipeline — including every existing Joba24 notification — depends on it.
 *
 * Declaring a second service would leave two claimants to the same event, and
 * whichever the system picked, the other side of the app would silently lose its
 * pushes. So this class EXTENDS the plugin's service: ordinary messages are
 * handed straight to `super`, which is byte-for-byte the behaviour the app had
 * before; only a message carrying our own data key is intercepted.
 *
 * ── WHY A KILLED APP STILL UPDATES ──────────────────────────────────────────
 * This is the piece iOS gets from an APNs Live Activity push. A data-only FCM
 * message wakes this service even with the app backgrounded or swept away, the
 * payload is applied against the on-device store (same ordering rules), and the
 * SAME ongoing notification is updated in place. Nothing here needs the WebView,
 * a session, or the app to be running.
 */
public class JobaLiveUpdateMessagingService extends MessagingService {

    @Override
    public void onMessageReceived(@NonNull RemoteMessage remoteMessage) {
        Map<String, String> data = remoteMessage.getData();

        if (data != null && "1".equals(data.get(JobaLiveUpdatePayload.DATA_KEY))) {
            JobaLiveUpdatePayload payload = JobaLiveUpdatePayload.fromData(data);
            if (payload != null) {
                JobaLiveUpdateEngine.apply(getApplicationContext(), payload);
                // Deliberately NOT forwarded to the web layer: the notification is
                // already drawn, and a second, JS-driven render would race it.
                return;
            }
        }

        // Everything else is the app's existing push behaviour, untouched.
        super.onMessageReceived(remoteMessage);
    }
}