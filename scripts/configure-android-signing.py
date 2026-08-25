#!/usr/bin/env python3
"""
Configure the Capacitor Android build.gradle for release signing + versioning.

Reads keystore credentials from Codemagic environment variables (set them in the
Codemagic UI under the Android workflow's environment groups):

  ANDROID_KEYSTORE_PATH     – path to the .jks/.keystore file (Codemagic file-type var)
  ANDROID_KEYSTORE_PASSWORD – keystore password
  ANDROID_KEY_ALIAS         – key alias
  ANDROID_KEY_PASSWORD      – key password
  ANDROID_VERSION_NAME      – e.g. "1.0.0" (optional, default "1.0")
  ANDROID_VERSION_CODE      – integer, e.g. "2" (optional, default "1")

It injects a `signingConfigs.release` block referencing these env vars and wires
`buildTypes.release.signingConfig` to it, so `gradlew bundleRelease` produces a
signed AAB. Idempotent — safe to run on every build.

Run AFTER `npx cap add android`, BEFORE `cap sync android`.
"""
import os
import re
import sys
from pathlib import Path

GRADLE = Path("android/app/build.gradle")

SIGNING_BLOCK = """    signingConfigs {{
        release {{
            storeFile file("{store_file}")
            storePassword "{store_password}"
            keyAlias "{key_alias}"
            keyPassword "{key_password}"
        }}
    }}
"""

def main():
    if not GRADLE.exists():
        print(f"ERROR: {GRADLE} not found. Run `npx cap add android` first.")
        sys.exit(1)

    store_file = os.environ.get("ANDROID_KEYSTORE_PATH", "")
    store_password = os.environ.get("ANDROID_KEYSTORE_PASSWORD", "")
    key_alias = os.environ.get("ANDROID_KEY_ALIAS", "")
    key_password = os.environ.get("ANDROID_KEY_PASSWORD", "")
    version_name = os.environ.get("ANDROID_VERSION_NAME", "1.0")
    version_code = os.environ.get("ANDROID_VERSION_CODE", "1")

    if not (store_file and store_password and key_alias and key_password):
        print("[signing] WARNING: keystore env vars not set — AAB will be UNSIGNED.")
        print("[signing] Set ANDROID_KEYSTORE_PATH / _PASSWORD / _ALIAS / _KEY_PASSWORD in Codemagic.")
    else:
        print(f"[signing] using keystore: {store_file}, alias: {key_alias}")

    content = GRADLE.read_text()

    # 1) Inject signingConfigs block just before `android { ... buildTypes {`
    if "signingConfigs {" not in content:
        block = SIGNING_BLOCK.format(
            store_file=store_file or "release.keystore",
            store_password=store_password or "",
            key_alias=key_alias or "",
            key_password=key_password or "",
        )
        # Insert immediately before the `buildTypes {` line.
        content = re.sub(r"(    buildTypes \{)", block + r"\1", content, count=1)

    # 2) Wire release build type to the signing config (idempotent)
    if "release.signingConfig" not in content:
        content = re.sub(
            r"(    buildTypes \{\n        release \{)",
            r"\1\n            signingConfig signingConfigs.release",
            content,
            count=1,
        )

    # 3) Override versionCode / versionName in defaultConfig
    content = re.sub(
        r"versionCode \d+",
        f"versionCode {version_code}",
        content,
        count=1,
    )
    content = re.sub(
        r'versionName "[^"]*"',
        f'versionName "{version_name}"',
        content,
        count=1,
    )

    GRADLE.write_text(content)
    print(f"[signing] build.gradle configured: versionName={version_name}, versionCode={version_code}")

if __name__ == "__main__":
    main()