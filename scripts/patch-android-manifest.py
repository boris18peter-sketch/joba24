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

    if 'android:scheme="joba24"' in content:
        print("[manifest] joba24:// intent-filter already present — skipping.")
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