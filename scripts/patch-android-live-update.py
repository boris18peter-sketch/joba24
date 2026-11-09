#!/usr/bin/env python3
"""
Install the Android Live Update (the Android equivalent of the iOS Live Activity).

WHAT IT DOES
------------
`npx cap add android` generates a stock Capacitor project, so every native piece
Joba24 adds has to be injected at build time — the same pattern
`patch-android-manifest.py` and the Meta/TikTok steps already use. This script:

  1. copies the Java sources from android-config/live-update/src/ into the
     generated app package, substituting the real package name — which is read
     from the project's Gradle configuration (`namespace` / `applicationId`),
     because a modern AndroidManifest.xml declares no package at all;
  2. places the notification's small-icon vector in res/drawable/;
  3. points the FCM event at OUR service (a subclass of the plugin's own, so no
     existing push behaviour changes — see the class comment);
  4. registers the two broadcast receivers the notification's tap and its action
     button use, plus the promoted-notification permission;
  5. registers the Capacitor plugin in MainActivity (BEFORE super.onCreate, which
     Capacitor requires).

It is idempotent: re-running it rewrites the injected block and changes nothing
else. `--check` verifies without writing, and exits non-zero when something the
app depends on is missing — that is what the build step runs after it.

WHY THE SERVICE REPLACEMENT IS SAFE
-----------------------------------
Android delivers FCM messages to whichever single service declares
`com.google.firebase.MESSAGING_EVENT`. @capacitor-firebase/messaging declares
`io.capawesome.capacitorjs.plugins.firebase.messaging.MessagingService`, and every
existing Joba24 notification goes through it. We therefore declare OUR service
with the same filter and REMOVE theirs from the merged manifest — ours extends
theirs, so ordinary messages reach `super.onMessageReceived(...)` and land in the
plugin exactly as before. Two sibling services would have made delivery
non-deterministic; a subclass cannot.

USAGE
-----
  patch-android-live-update.py                 # patch ./android
  patch-android-live-update.py --check         # verify only, write nothing
  patch-android-live-update.py --root <dir>    # another project root
"""

import argparse
import json
import re
import shutil
import subprocess
import sys
from pathlib import Path

SOURCE_DIR = Path("android-config/live-update/src")
RES_DIR = Path("android-config/live-update/res")

JAVA_FILES = [
    "JobaLiveUpdatePayload.java",
    "JobaLiveUpdateStore.java",
    "JobaLiveUpdateNotifier.java",
    "JobaLiveUpdateEngine.java",
    "JobaLiveUpdateMessagingService.java",
    "JobaLiveUpdateActionReceiver.java",
    "JobaLiveUpdateOpenReceiver.java",
    "JobaLiveUpdatePlugin.java",
]

DRAWABLES = ["ic_joba_live.xml"]

PLUGIN_SERVICE = "io.capawesome.capacitorjs.plugins.firebase.messaging.MessagingService"

BEGIN = "<!-- >>> joba24-live-update (generated - do not edit by hand) -->"
END = "<!-- <<< joba24-live-update -->"

TOOLS_NS = 'xmlns:tools="http://schemas.android.com/tools"'

# Where the app's identity actually lives in a modern Android project.
GRADLE_FILES = ("android/app/build.gradle", "android/app/build.gradle.kts")
VARIABLES_GRADLE = "android/variables.gradle"
CAPACITOR_CONFIG = "capacitor.config.json"


def fail(message):
    sys.exit("ERROR: " + message)


def gradle_value(text, key):
    """
    One declared value from a Gradle file: `key "x"` (Groovy), `key = "x"` (Kotlin).

    Anchored to the start of a line and to a quoted value, so a mention of the key
    in a comment or a variable reference (`applicationId APP_ID`) is not mistaken
    for the declaration itself.
    """
    match = re.search(
        r'(?m)^\s*%s\s*=?\s*["\']([A-Za-z0-9_.]+)["\']' % re.escape(key), text
    )
    return match.group(1) if match else None


def resolve_package(root, manifest_text):
    """
    The app's Java package, read from the project's Gradle configuration.

    ── WHY THIS IS NOT A MANIFEST LOOKUP ANY MORE ─────────────────────────────
    Since AGP 8 — and therefore every Capacitor 6+ project, including the one
    this app builds — AndroidManifest.xml carries NO `package` attribute. The
    identifier moved into the Gradle build file: `namespace` at the top level and
    `applicationId` under `defaultConfig`. Reading it from the manifest was what
    failed the first Android build at step 9: a completely standard, correct
    project was rejected as if it were malformed.

    `namespace` is preferred over `applicationId` because it is the package the
    app's own classes are compiled into — MainActivity's `package`, and the name
    every component declared in the manifest must resolve to. A Capacitor project
    sets the two to the same value; when a product flavour changes the
    applicationId they differ, and the class package is still the namespace.

    The manifest attribute is kept as a fallback for an older project, and
    capacitor.config.json as the last resort. Returns (package, where it came from).
    """
    for name in GRADLE_FILES:
        path = root / name
        if not path.exists():
            continue
        text = path.read_text()
        for key in ("namespace", "applicationId"):
            value = gradle_value(text, key)
            if value:
                return value, name

    # The oldest Capacitor template declared it once, in variables.gradle.
    variables = root / VARIABLES_GRADLE
    if variables.exists():
        value = gradle_value(variables.read_text(), "applicationId")
        if value:
            return value, VARIABLES_GRADLE

    match = re.search(r'(?m)^\s*package="([A-Za-z0-9_.]+)"', manifest_text)
    if match:
        return match.group(1), "AndroidManifest.xml"

    config = root / CAPACITOR_CONFIG
    if config.exists():
        try:
            value = json.loads(config.read_text()).get("appId")
        except json.JSONDecodeError:
            value = None
        if value:
            return value, CAPACITOR_CONFIG

    fail(
        "cannot resolve the app's package: %s declares no namespace/applicationId, "
        "AndroidManifest.xml has no package attribute and %s has no appId"
        % (" / ".join(GRADLE_FILES), CAPACITOR_CONFIG)
    )


def ensure_tools_namespace(manifest_text):
    if TOOLS_NS in manifest_text:
        return manifest_text
    return manifest_text.replace("<manifest ", "<manifest " + TOOLS_NS + " ", 1)


def build_block(package):
    return f"""{BEGIN}
    <!--
        THE LIVE UPDATE SURFACE (Joba24).

        The service below is OURS and extends the messaging plugin's own, so FCM
        keeps delivering ordinary Joba24 pushes exactly as before while a
        data-only Live Update message is intercepted and drawn as an ongoing
        notification. The plugin's declaration is removed so there is exactly one
        claimant of com.google.firebase.MESSAGING_EVENT.
    -->
    <service
        tools:node="remove"
        android:name="{PLUGIN_SERVICE}" />

    <service
        android:name="{package}.JobaLiveUpdateMessagingService"
        android:exported="false">
        <intent-filter>
            <action android:name="com.google.firebase.MESSAGING_EVENT" />
        </intent-filter>
    </service>

    <!-- The card's ONE action button: a short HTTPS request, no app launch. -->
    <receiver
        android:name="{package}.JobaLiveUpdateActionReceiver"
        android:exported="false" />

    <!-- A tap on the card: record the task, then bring the app forward. -->
    <receiver
        android:name="{package}.JobaLiveUpdateOpenReceiver"
        android:exported="false" />
{END}"""


def patch_manifest(path, package, check=False):
    text = path.read_text()

    if BEGIN in text and END in text:
        head, rest = text.split(BEGIN, 1)
        _, tail = rest.split(END, 1)
        text = head + build_block(package) + tail
    else:
        if "FCM_PLUGIN_ACTIVITY" in text:
            # Immediately after the FCM tap filter: the same neighbourhood as the
            # app's other notification wiring, so it stays easy to find.
            anchor = text.index("FCM_PLUGIN_ACTIVITY")
            close = text.index("</intent-filter>", anchor) + len("</intent-filter>")
            text = text[:close] + "\n\n" + build_block(package) + text[close:]
        else:
            anchor = text.rindex("</application>")
            text = text[:anchor] + build_block(package) + "\n" + text[anchor:]

    text = ensure_tools_namespace(text)

    if "POST_PROMOTED_NOTIFICATIONS" not in text:
        text = text.replace(
            "<application",
            '    <uses-permission android:name="android.permission.POST_PROMOTED_NOTIFICATIONS" />\n<application',
            1,
        )

    # ── THE SERVICE MUST BE OURS, AND ONLY OURS ─────────────────────────────
    # A merged manifest with both declarations leaves FCM with two candidates.
    # The removal marker is what guarantees a single one, so it is verified here
    # rather than trusted.
    if 'tools:node="remove"' not in text:
        fail("manifest does not remove the plugin's MessagingService declaration")

    if not check:
        path.write_text(text)
    return text


def install_sources(app_java_dir, package):
    app_java_dir.mkdir(parents=True, exist_ok=True)
    written = []
    for name in JAVA_FILES:
        source = SOURCE_DIR / name
        if not source.exists():
            fail("missing source file: %s" % source)
        body = source.read_text().replace("__PKG__", package)
        target = app_java_dir / name
        target.write_text(body)
        written.append(name)
    return written


def install_drawables(res_drawable_dir):
    res_drawable_dir.mkdir(parents=True, exist_ok=True)
    written = []
    for name in DRAWABLES:
        source = RES_DIR / "drawable" / name
        if not source.exists():
            fail("missing drawable: %s" % source)
        shutil.copyfile(source, res_drawable_dir / name)
        written.append(name)
    return written


def register_plugin(app_java_dir):
    """
    Register the Capacitor plugin in MainActivity.

    Delegated to `patch-android-mainactivity.py`, which already owns the hard part
    (the marker-delimited block, the merge that keeps the Meta and TikTok
    registrations, and the requirement that registration happens BEFORE
    `super.onCreate`). Duplicating that logic here would give the project two
    editors of the same file.

    Done HERE, and not left to a separate build step, so the script installs
    everything its own `--check` then verifies: a wiring step that can be
    forgotten is a wiring step that eventually is.
    """
    main_activity = app_java_dir / "MainActivity.java"
    helper = Path(__file__).with_name("patch-android-mainactivity.py")
    if not main_activity.exists():
        fail("%s not found — run `npx cap add android` first." % main_activity)
    if not helper.exists():
        fail("helper script missing: %s" % helper)

    result = subprocess.run(
        [
            sys.executable,
            str(helper),
            str(main_activity),
            "--before",
            "registerPlugin(JobaLiveUpdatePlugin.class);",
        ],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        fail("registering the plugin failed: %s %s" % (result.stdout.strip(), result.stderr.strip()))
    return True


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--root", default=".", help="project root (default: .)")
    parser.add_argument("--check", action="store_true", help="verify only, write nothing")
    parser.add_argument("--json", action="store_true", help="print a JSON report")
    args = parser.parse_args()

    root = Path(args.root)
    manifest = root / "android/app/src/main/AndroidManifest.xml"
    if not manifest.exists():
        fail("%s not found. Run `npx cap add android` first." % manifest)

    package, package_source = resolve_package(root, manifest.read_text())
    app_java_dir = root / "android/app/src/main/java" / Path(package.replace(".", "/"))

    # ── AND IF THE CLASSES LIVE SOMEWHERE ELSE, FOLLOW THEM ──────────────────
    # `namespace` and the folder MainActivity is generated into can disagree in a
    # project that was re-identified (a renamed appId). Our classes must sit in
    # the SAME package as MainActivity, because that is the package the manifest's
    # component names resolve against — so MainActivity's own `package` line is
    # the final authority when the derived folder does not hold it.
    if not (app_java_dir / "MainActivity.java").exists():
        for candidate in (root / "android/app/src/main/java").rglob("MainActivity.java"):
            declared = re.search(r'(?m)^\s*package\s+([A-Za-z0-9_.]+)\s*;', candidate.read_text())
            if declared:
                package = declared.group(1)
                app_java_dir = candidate.parent
                package_source += " (MainActivity package)"
                break

    res_drawable_dir = root / "android/app/src/main/res/drawable"

    report = {
        "package": package,
        "package_source": package_source,
        "sources": [],
        "drawables": [],
        "checks": {},
    }

    if args.check:
        for name in JAVA_FILES:
            if not (app_java_dir / name).exists():
                fail("%s/%s is missing — the Live Update is not installed" % (app_java_dir, name))
        if BEGIN not in manifest.read_text():
            fail("AndroidManifest.xml has no Live Update block")
    else:
        report["sources"] = install_sources(app_java_dir, package)
        report["drawables"] = install_drawables(res_drawable_dir)
        patch_manifest(manifest, package)
        report["plugin_registered"] = register_plugin(app_java_dir)

    text = manifest.read_text()
    main_activity = app_java_dir / "MainActivity.java"
    activity_text = main_activity.read_text() if main_activity.exists() else ""

    report["checks"] = {
        "manifest_block": BEGIN in text,
        "plugin_service_removed": PLUGIN_SERVICE in text and 'tools:node="remove"' in text,
        "our_service": ("%s.JobaLiveUpdateMessagingService" % package) in text,
        "receivers": all(
            ("%s.%s" % (package, name)) in text
            for name in ("JobaLiveUpdateActionReceiver", "JobaLiveUpdateOpenReceiver")
        ),
        "promoted_permission": "POST_PROMOTED_NOTIFICATIONS" in text,
        "plugin_registered": "JobaLiveUpdatePlugin" in activity_text,
        "sources": all((app_java_dir / name).exists() for name in JAVA_FILES),
    }

    if args.json:
        print(json.dumps(report, indent=2))
    else:
        print("[live-update] package: %s (from %s)" % (package, package_source))
        for key, ok in report["checks"].items():
            print("[live-update] %s %s" % ("OK  " if ok else "MISS", key))
        if report["sources"]:
            print("[live-update] installed %d source files, %d drawables"
                  % (len(report["sources"]), len(report["drawables"])))

    missing = [key for key, ok in report["checks"].items() if not ok]
    if missing:
        fail("incomplete: " + ", ".join(missing))


if __name__ == "__main__":
    main()