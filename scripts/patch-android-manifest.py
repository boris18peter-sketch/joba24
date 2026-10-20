#!/usr/bin/env python3
"""
Inject the `joba24://auth-callback` deep-link intent-filter into the Capacitor
Android project's AndroidManifest.xml.

This is the Android equivalent of the iOS joba24:// URL scheme (Info.plist).
With it in place, the AuthCallback page's `intent://...scheme=joba24...` redirect
opens the app INSTANTLY after Google login — no manual "back" tap, no being
stuck in the browser. Capacitor's App plugin then fires `appUrlOpen`, which
NativeAuthListener picks up to complete the login.

Run AFTER `npx cap add android`, BEFORE `cap sync android`.
"""
import sys
from pathlib import Path

MANIFEST = Path("android/app/src/main/AndroidManifest.xml")
INTENT_FILTER = """        <intent-filter android:autoVerify="false">
            <action android:name="android.intent.action.VIEW" />
            <category android:name="android.intent.category.DEFAULT" />
            <category android:name="android.intent.category.BROWSABLE" />
            <data android:scheme="joba24" android:host="auth-callback" />
        </intent-filter>"""

def main():
    if not MANIFEST.exists():
        print(f"ERROR: {MANIFEST} not found. Run `npx cap add android` first.")
        sys.exit(1)

    content = MANIFEST.read_text()

    # Add location permissions if not already present
    if 'ACCESS_FINE_LOCATION' not in content:
        location_perms = """    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
"""
        content = content.replace('<application', location_perms + '<application', 1)
        print("[manifest] added ACCESS_FINE_LOCATION + ACCESS_COARSE_LOCATION permissions.")
    else:
        print("[manifest] location permissions already present — skipping.")

    # Add POST_NOTIFICATIONS permission (required since Android 13 / API 33)
    # Without this declared in the manifest, the OS will NEVER show the notification
    # permission popup, regardless of what the JS code calls.
    if 'POST_NOTIFICATIONS' not in content:
        notif_perm = '    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />\n'
        content = content.replace('<application', notif_perm + '<application', 1)
        print("[manifest] added POST_NOTIFICATIONS permission.")
    else:
        print("[manifest] POST_NOTIFICATIONS permission already present — skipping.")

    # Add CAMERA permission. Capacitor's BridgeWebChromeClient only offers the
    # "Take photo" option in a file chooser when this permission is DECLARED in
    # the manifest (isMediaCaptureSupported -> hasDefinedPermission(CAMERA)).
    # Without it, <input type="file" accept="image/*"> is gallery-only on Android.
    if 'android.permission.CAMERA' not in content:
        camera_perm = '    <uses-permission android:name="android.permission.CAMERA" />\n'
        content = content.replace('<application', camera_perm + '<application', 1)
        print("[manifest] added CAMERA permission.")
    else:
        print("[manifest] CAMERA permission already present — skipping.")

    # Add RECORD_AUDIO. The app records voice messages — in the task chat, the
    # support chat, the quick-chat drawer, and when describing a task — through
    # getUserMedia({ audio: true }) + MediaRecorder, five call sites in all.
    #
    # Android gates the microphone behind this permission, and the WebView asks
    # the OS for it ONLY when it is DECLARED in the manifest. Undeclared, the
    # request is refused before the user ever sees a prompt, so recording fails
    # silently and the mic button looks dead — the same class of failure as the
    # camera one above.
    # MODIFY_AUDIO_SETTINGS rides along with it: it is a NORMAL (non-runtime)
    # permission Chromium's WebRTC audio device module uses to switch the device
    # into the right audio mode while capturing. No prompt, no Play declaration.
    if 'android.permission.RECORD_AUDIO' not in content:
        audio_perms = ('    <uses-permission android:name="android.permission.RECORD_AUDIO" />\n'
                       '    <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />\n')
        content = content.replace('<application', audio_perms + '<application', 1)
        print("[manifest] added RECORD_AUDIO + MODIFY_AUDIO_SETTINGS permissions.")
    else:
        print("[manifest] RECORD_AUDIO permission already present — skipping.")
        if 'MODIFY_AUDIO_SETTINGS' not in content:
            modify_perm = '    <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />\n'
            content = content.replace('<application', modify_perm + '<application', 1)
            print("[manifest] added MODIFY_AUDIO_SETTINGS permission.")

    if 'android:scheme="joba24"' in content:
        # The permissions above are written even on this early exit. Returning
        # without writing would silently discard every permission this script
        # just ensured, on any re-run where the deep link already exists.
        MANIFEST.write_text(content)
        print("[manifest] joba24:// intent-filter already present — permissions written — skipping.")
        return

    idx = content.find('android:name=".MainActivity"')
    if idx == -1:
        print("ERROR: .MainActivity not found in AndroidManifest.xml")
        sys.exit(1)

    close = content.find("</activity>", idx)
    if close == -1:
        print("ERROR: closing </activity> for MainActivity not found")
        sys.exit(1)

    new_content = content[:close] + INTENT_FILTER + "\n        " + content[close:]
    MANIFEST.write_text(new_content)
    print("[manifest] injected joba24://auth-callback intent-filter into MainActivity.")

if __name__ == "__main__":
    main()