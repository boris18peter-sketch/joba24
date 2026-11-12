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
  3. adds the Live Update service, the two receivers and the promoted-notification
     permission to AndroidManifest.xml, all as direct children of <application>;
  4. points the FCM event at OUR service (a subclass of the plugin's own, so no
     existing push behaviour changes — see the class comment) and removes the
     plugin's own declaration, so exactly one service claims it;
  5. registers the Capacitor plugin in MainActivity (BEFORE super.onCreate, which
     Capacitor requires).

WHERE THINGS GO IS DECIDED BY AN XML PARSER, NEVER BY STRING MATCHING
--------------------------------------------------------------------
The manifest is edited by OFFSET: expat reports the byte position and depth of
the root tag, of `<application>` and of its closing tag, and the components are
spliced in there. That is not stylistic. The previous version anchored on the
string "FCM_PLUGIN_ACTIVITY" and inserted after the nearest `</intent-filter>` —
but that filter lives INSIDE <activity>, so the service and both receivers were
written inside the activity element, and aapt2 refused to link the release:

    Unexpected <service> inside <manifest><application><activity>
    Unexpected <receiver> inside <manifest><application><activity>   (x2)

A parser knows the depth; a substring does not. Everything outside the spliced
offsets — MainActivity, the Firebase activity filter, permissions, <queries>,
indentation — is preserved byte for byte.

VALIDATION BEFORE GRADLE
------------------------
`validate_structure()` performs the checks aapt2 would only reach after Gradle
starts: components nested in the wrong parent, components declared twice, a
missing or duplicated MESSAGING_EVENT filter, the plugin's service not removed,
and a permission in the wrong parent. It runs on every patch (the script refuses
to write a manifest that would not link) and again under `--check`, which the
build runs as its own step — so this class of failure surfaces before the build,
not at step 25.

USAGE
-----
  patch-android-live-update.py                 # patch ./android
  patch-android-live-update.py --check         # verify only, write nothing
  patch-android-live-update.py --root <dir>    # another project root

It is idempotent: re-running it rewrites the injected block and changes nothing
else. `--check` exits non-zero when something the app depends on is missing or
misplaced.

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
"""

import argparse
import json
import re
import shutil
import subprocess
import sys
import xml.parsers.expat
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
    # The card's action button launches THIS, not a broadcast: a notification
    # PendingIntent that starts an activity is the one tap Android never drops,
    # and the activity draws nothing at all (translucent, no title, no recents).
    "JobaLiveUpdateActionActivity.java",
    "JobaLiveUpdateOpenReceiver.java",
    "JobaLiveUpdatePlugin.java",
]

DRAWABLES = [
    "ic_joba_live.xml",
    # The designed card's own surfaces: the white card with its hairline, the
    # icon bubble, the "2/3" capsule, the rail's two segment states and the
    # action button's green gradient.
    "joba_live_card_bg.xml",
    "joba_live_bubble.xml",
    "joba_live_chip.xml",
    "joba_live_segment_on.xml",
    "joba_live_segment_off.xml",
    "joba_live_button.xml",
]

# ── THE CARD ITSELF ─────────────────────────────────────────────────────────
# A RemoteViews layout is the only way an Android notification can be a designed
# card, so the Live Update ships two: the expanded card and the collapsed row.
# They are installed like any other resource — if they are missing the card
# silently degrades to a plain notification, which is the look this replaces.
LAYOUTS = [
    "joba_live_update_card.xml",
    "joba_live_update_compact.xml",
]

PLUGIN_SERVICE = "io.capawesome.capacitorjs.plugins.firebase.messaging.MessagingService"

BEGIN = "<!-- >>> joba24-live-update (generated - do not edit by hand) -->"
END = "<!-- <<< joba24-live-update -->"

TOOLS_NS = 'xmlns:tools="http://schemas.android.com/tools"'

PROMOTED_PERMISSION = (
    '    <uses-permission android:name="android.permission.POST_PROMOTED_NOTIFICATIONS" />\n'
)

# The components this script owns, and the element each one must be declared as.
LIVE_COMPONENTS = (
    ("service", "JobaLiveUpdateMessagingService"),
    ("receiver", "JobaLiveUpdateActionReceiver"),
    ("receiver", "JobaLiveUpdateOpenReceiver"),
    # The tap that performs the action. An activity, because a notification
    # PendingIntent that launches one is the only launch the OS always honours.
    ("activity", "JobaLiveUpdateActionActivity"),
)

MESSAGING_EVENT = 'name="com.google.firebase.MESSAGING_EVENT"'

# Where the app's identity actually lives in a modern Android project.
GRADLE_FILES = ("android/app/build.gradle", "android/app/build.gradle.kts")
VARIABLES_GRADLE = "android/variables.gradle"
CAPACITOR_CONFIG = "capacitor.config.json"

# ══════════════════════════════════════════════════════════════════════════
# THE DEPENDENCY THE INJECTED SOURCES COMPILE AGAINST
# ══════════════════════════════════════════════════════════════════════════
# `JobaLiveUpdateMessagingService extends io.capawesome...messaging.MessagingService`,
# and that class extends FirebaseMessagingService. The plugin declares
# firebase-messaging as `implementation`, which means it is NOT on the app
# module's compile classpath: a project dependency exposes its own classes, never
# its `implementation` dependencies. The plugin therefore compiles and the app
# does not — which is exactly how the third Codemagic build failed, at
# `:app:compileReleaseJavaWithJavac`:
#
#     package com.google.firebase.messaging does not exist
#     cannot find symbol: class FirebaseMessagingService
#     cannot find symbol: class RemoteMessage          (twice)
#     cannot find symbol: getApplicationContext()      (cascade: the superclass
#                                                       could not be resolved, so
#                                                       Service's own methods
#                                                       were unreachable)
#
# Declaring the SAME version the plugin already resolves changes nothing in the
# resolved dependency graph (Gradle resolves one version per coordinate) while
# putting the API on our compile classpath. The version is READ from the plugin
# rather than hard-coded, so an npm update cannot leave this pinned behind it.
APP_GRADLE = "android/app/build.gradle"
PLUGIN_GRADLE = "node_modules/@capacitor-firebase/messaging/android/build.gradle"
FIREBASE_MESSAGING_VERSION_FALLBACK = "25.0.1"
FIREBASE_MESSAGING_COORDINATE = "com.google.firebase:firebase-messaging"
GRADLE_BEGIN = "    // >>> joba24-live-update (generated - do not edit by hand)"
GRADLE_END = "    // <<< joba24-live-update"


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


# ══════════════════════════════════════════════════════════════════════════
# XML-AWARE MANIFEST ACCESS
#
# Every structural decision below comes from the parser, not from a substring:
# where the root tag is, where <application> opens, where it closes, and how
# deep each element sits. Splices happen at those offsets only.
# ══════════════════════════════════════════════════════════════════════════

def _char_offset(text, byte_index):
    """expat counts BYTES; Python slices characters."""
    return len(text.encode("utf-8")[:byte_index].decode("utf-8"))


def _tag_end(text, start):
    """Offset just past the '>' of the start tag that begins at `start`."""
    quote = None
    for index in range(start, len(text)):
        char = text[index]
        if quote:
            if char == quote:
                quote = None
        elif char in "\"'":
            quote = char
        elif char == ">":
            return index + 1
    fail("unterminated tag in AndroidManifest.xml")


def scan_manifest(text):
    """
    The manifest's structural layout.

    Returns:
      root_start, root_tag_end  — the <manifest ...> start tag
      application_start         — the <application ...> start tag
      application_end           — the </application> closing tag
      elements                  — [(path, depth)] for every element, so the
                                  validation below can prove WHERE a component
                                  ended up rather than merely that it exists.
    """
    parser = xml.parsers.expat.ParserCreate()
    stack = []
    found = {"elements": []}

    def start(name, _attributes):
        stack.append(name)
        found["elements"].append(("/".join(stack), len(stack)))
        if len(stack) == 1:
            found["root_start"] = _char_offset(text, parser.CurrentByteIndex)
        elif len(stack) == 2 and name == "application":
            found["application_start"] = _char_offset(text, parser.CurrentByteIndex)

    def end(name):
        if len(stack) == 2 and name == "application":
            found["application_end"] = _char_offset(text, parser.CurrentByteIndex)
        stack.pop()

    parser.StartElementHandler = start
    parser.EndElementHandler = end
    try:
        parser.Parse(text.encode("utf-8"), True)
    except xml.parsers.expat.ExpatError as error:
        fail("AndroidManifest.xml is not well-formed XML: %s" % error)

    if "root_start" not in found:
        fail("AndroidManifest.xml has no root element")
    if "application_start" not in found or "application_end" not in found:
        fail("AndroidManifest.xml declares no closed <application> element")
    if found["application_end"] <= found["application_start"]:
        fail("<application> is self-closing — Live Update components cannot be added")

    found["root_tag_end"] = _tag_end(text, found["root_start"])
    return found


def ensure_tools_namespace(text):
    """
    Declare `xmlns:tools` on the ROOT element, which is the only place XML
    allows a namespace declaration to apply to its whole document.

    Inserted inside the root start tag at the offset the parser reported, so the
    root's own attributes and formatting are left exactly as they were.
    """
    if "xmlns:tools=" in text:
        return text
    layout = scan_manifest(text)
    tag_end = layout["root_tag_end"]
    # Just before '>' (or '/>' for a self-closing root).
    insert_at = tag_end - (2 if text[:tag_end].endswith("/>") else 1)
    return text[:insert_at] + " " + TOOLS_NS + text[insert_at:]


def build_block(package):
    return f"""    {BEGIN}
    <!--
        THE LIVE UPDATE SURFACE (Joba24).

        Every element here is a DIRECT CHILD of <application>. The service below
        is OURS and extends the messaging plugin's own, so FCM keeps delivering
        ordinary Joba24 pushes exactly as before while a data-only Live Update
        message is intercepted and drawn as an ongoing notification. The plugin's
        declaration is removed so there is exactly one claimant of the FCM event.
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

    <!--
        THE CARD'S BUTTON TAP.

        An ACTIVITY, not a broadcast, and one that draws nothing: the theme is
        the platform's translucent no-title theme, there is no content view, no
        animation, no Recents entry, and it closes itself as soon as the tap has
        been resolved. A notification PendingIntent that launches an activity is
        the one launch Android always honours; the alternative — a broadcast that
        tried to bring the app up — is blocked on Android 10+ and banned as a
        trampoline on Android 12+, which is why a tap could do nothing at all.
    -->
    <activity
        android:name="{package}.JobaLiveUpdateActionActivity"
        android:exported="false"
        android:excludeFromRecents="true"
        android:taskAffinity=""
        android:noHistory="true"
        android:theme="@android:style/Theme.Translucent.NoTitleBar" />
    {END}"""


def validate_structure(text, package):
    """
    The checks aapt2 performs only after Gradle starts, performed before it.

    Returns a list of problems; an empty list means the manifest is valid for
    this script's purposes. The first check is the exact error from the release
    build: a component nested where the manifest schema has no room for it.
    """
    problems = []
    layout = scan_manifest(text)
    paths = [path for path, _ in layout["elements"]]

    for path in paths:
        parts = path.split("/")
        if len(parts) > 2 and parts[-1] in ("service", "receiver") and "activity" in parts[2:-1]:
            problems.append(
                "<%s> is nested inside <%s>, not directly inside <application>"
                % (parts[-1], parts[2:-1][-1])
            )

    for element, name in LIVE_COMPONENTS:
        if "manifest/application/%s" % element not in paths:
            problems.append("no <%s> directly under <application> for %s" % (element, name))
        declared = text.count("%s.%s" % (package, name))
        if declared != 1:
            problems.append("%s is declared %d times (expected 1)" % (name, declared))

    if 'tools:node="remove"' not in text:
        problems.append("the plugin's MessagingService declaration is not removed")

    filters = text.count('action android:name="com.google.firebase.MESSAGING_EVENT"')
    if filters != 1:
        problems.append("expected exactly one MESSAGING_EVENT filter, found %d" % filters)

    if "POST_PROMOTED_NOTIFICATIONS" not in text:
        problems.append("android.permission.POST_PROMOTED_NOTIFICATIONS is missing")
    if any(path.endswith("application/uses-permission") for path in paths):
        problems.append("<uses-permission> is nested inside <application>")

    return problems


def strip_block(text):
    """
    Remove a previously generated block, wherever it was written — including the
    broken placement the old string-based version produced. Starting from a clean
    manifest is what makes re-running this script idempotent.
    """
    while BEGIN in text:
        start = text.index(BEGIN)
        line_start = text.rfind("\n", 0, start) + 1
        end = text.index(END, start) + len(END)
        tail = text[end:]
        # The block owns its whole line, so its line is removed with it and the
        # newline that followed it — leaving the manifest byte-identical to what
        # it was before the block was inserted. That is what makes a
        # patch → check → patch cycle stable.
        if tail.startswith("\n"):
            tail = tail[1:]
        text = text[:line_start] + tail
    return text


def patch_manifest(path, package, check=False):
    """
    Put the Live Update components where the manifest schema allows them.

    `check=True` validates the file AS IT IS ON DISK and writes nothing, so a
    manifest left in a bad state by an earlier tool fails the build step instead
    of reaching Gradle.
    """
    text = path.read_text()

    if check:
        problems = validate_structure(text, package)
        if problems:
            fail("AndroidManifest.xml structure is invalid: " + "; ".join(problems))
        return text

    text = strip_block(text)
    text = ensure_tools_namespace(text)

    layout = scan_manifest(text)
    if "POST_PROMOTED_NOTIFICATIONS" not in text:
        # A <uses-permission> is a direct child of <manifest>, so it goes at the
        # START OF THE LINE that opens <application> — the parser gave us that
        # element's own offset, and the line's indentation stays intact.
        at = layout["application_start"]
        line_start = text.rfind("\n", 0, at) + 1
        at = line_start if not text[line_start:at].strip() else at
        text = text[:at] + PROMOTED_PERMISSION + text[at:]
        layout = scan_manifest(text)

    # ── THE ONLY INSERTION POINT FOR THE BLOCK ───────────────────────────────
    # Immediately before </application>, i.e. a direct child of <application>.
    # Never after an <intent-filter>: in a real Capacitor manifest that filter is
    # inside <activity>, and that is what produced "Unexpected <service> inside
    # <manifest><application><activity>".
    at = layout["application_end"]
    # Its own line is the natural home: the block takes a line of its own and the
    # closing tag keeps the indentation it already had.
    line_start = text.rfind("\n", 0, at) + 1
    if not text[line_start:at].strip():
        at = line_start
    lead = "\n" if at == layout["application_end"] and not text[:at].endswith("\n") else ""
    text = text[:at] + lead + build_block(package) + "\n" + text[at:]

    problems = validate_structure(text, package)
    if problems:
        fail("the patched AndroidManifest.xml would not link: " + "; ".join(problems))

    path.write_text(text)
    return text


def resolve_firebase_messaging_version(root):
    """
    The firebase-messaging version our sources must compile against.

    Read from the messaging plugin's own build.gradle, whose default is what the
    dependency graph already resolves. Returns (version, where it came from).
    """
    path = root / PLUGIN_GRADLE
    if path.exists():
        match = re.search(
            r"(?m)firebaseMessagingVersion\s*=.*?'([0-9][0-9A-Za-z.\-]*)'", path.read_text()
        )
        if match:
            return match.group(1), PLUGIN_GRADLE
    return FIREBASE_MESSAGING_VERSION_FALLBACK, "fallback (plugin not installed)"


def gradle_block(version):
    return (
        "%s\n"
        "    // The injected service EXTENDS the messaging plugin's own service, so\n"
        "    // Firebase's messaging API has to be on THIS module's compile classpath.\n"
        "    // The plugin declares it as `implementation`, which hides it from us; the\n"
        "    // same version is declared here so the resolved graph is unchanged.\n"
        '    implementation "%s:%s"\n'
        "%s"
        % (GRADLE_BEGIN, FIREBASE_MESSAGING_COORDINATE, version, GRADLE_END)
    )


def strip_gradle_block(text):
    """Remove a previously written block, so a re-run changes nothing."""
    while GRADLE_BEGIN in text:
        start = text.index(GRADLE_BEGIN)
        line_start = text.rfind("\n", 0, start) + 1
        end = text.index(GRADLE_END, start) + len(GRADLE_END)
        tail = text[end:]
        if tail.startswith("\n"):
            tail = tail[1:]
        text = text[:line_start] + tail
    return text


def dependencies_span(text):
    """(start, end) of the module's own `dependencies { ... }` block."""
    match = re.search(r"(?m)^dependencies\s*\{", text)
    if not match:
        fail(
            "%s declares no dependencies block — the Live Update cannot add "
            "firebase-messaging, and its service will not compile" % APP_GRADLE
        )
    depth = 0
    for index in range(match.end() - 1, len(text)):
        if text[index] == "{":
            depth += 1
        elif text[index] == "}":
            depth -= 1
            if depth == 0:
                return match.start(), index
    return match.start(), len(text)


def validate_gradle(text, version):
    """
    The checks Gradle would only reach after it starts, performed before it.

    A missing or misplaced dependency is a compile failure at
    `:app:compileReleaseJavaWithJavac`, so it is caught here instead.
    """
    problems = []
    declared = text.count(FIREBASE_MESSAGING_COORDINATE)
    if declared != 1:
        problems.append(
            "%s is declared %d times in %s (expected 1)"
            % (FIREBASE_MESSAGING_COORDINATE, declared, APP_GRADLE)
        )

    start, end = dependencies_span(text)
    at = text.find(FIREBASE_MESSAGING_COORDINATE)
    if at != -1 and not (start < at < end):
        problems.append("%s is declared outside the dependencies block" % FIREBASE_MESSAGING_COORDINATE)

    expected = "%s:%s" % (FIREBASE_MESSAGING_COORDINATE, version)
    if expected not in text:
        problems.append("expected %s (the version the messaging plugin resolves)" % expected)

    return problems


def patch_gradle(path, version, check=False):
    """
    Put firebase-messaging on the app module's compile classpath.

    `check=True` validates the file as it is on disk and writes nothing.
    """
    if not path.exists():
        fail("%s not found. Run `npx cap add android` first." % path)

    text = path.read_text()
    if check:
        problems = validate_gradle(text, version)
        if problems:
            fail("android/app/build.gradle does not compile the Live Update: " + "; ".join(problems))
        return text

    text = strip_gradle_block(text)
    start, _end = dependencies_span(text)
    # Right after the line that opens the block: a plain dependency line, which is
    # what every other entry in this file is.
    insert_at = text.index("\n", start) + 1
    text = text[:insert_at] + gradle_block(version) + "\n" + text[insert_at:]

    problems = validate_gradle(text, version)
    if problems:
        fail("the patched android/app/build.gradle would not compile the Live Update: " + "; ".join(problems))

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


def install_layouts(res_layout_dir):
    """The card's two RemoteViews layouts, and the ids the notifier binds."""
    res_layout_dir.mkdir(parents=True, exist_ok=True)
    written = []
    for name in LAYOUTS:
        source = RES_DIR / "layout" / name
        if not source.exists():
            fail("missing layout: %s" % source)
        shutil.copyfile(source, res_layout_dir / name)
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
    res_layout_dir = root / "android/app/src/main/res/layout"
    app_gradle = root / APP_GRADLE
    messaging_version, messaging_source = resolve_firebase_messaging_version(root)

    report = {
        "package": package,
        "package_source": package_source,
        "firebase_messaging_version": messaging_version,
        "firebase_messaging_source": messaging_source,
        "sources": [],
        "drawables": [],
        "layouts": [],
        "checks": {},
        "structure": [],
    }

    if args.check:
        for name in JAVA_FILES:
            if not (app_java_dir / name).exists():
                fail("%s/%s is missing — the Live Update is not installed" % (app_java_dir, name))
        # The card's layouts are resources, not code: without them the notifier
        # still compiles (it only references R.layout) and the notification then
        # degrades to plain text, which is a silent visual regression rather than
        # a build error. So the check is explicit.
        for name in LAYOUTS:
            if not (res_layout_dir / name).exists():
                fail("res/layout/%s is missing — the card would draw as plain text" % name)
        if BEGIN not in manifest.read_text():
            fail("AndroidManifest.xml has no Live Update block")
        # The generated manifest is validated BEFORE Gradle runs: a component in
        # the wrong parent is a resource-linking failure at the AAB step, so it is
        # caught here instead.
        patch_manifest(manifest, package, check=True)
        # …and so is a missing compile-time dependency: it fails the same Android
        # build one step later, in javac, where the message names Firebase classes
        # rather than the module that lacks them.
        patch_gradle(app_gradle, messaging_version, check=True)
    else:
        report["sources"] = install_sources(app_java_dir, package)
        report["drawables"] = install_drawables(res_drawable_dir)
        report["layouts"] = install_layouts(res_layout_dir)
        patch_manifest(manifest, package)
        report["gradle"] = bool(patch_gradle(app_gradle, messaging_version))
        report["plugin_registered"] = register_plugin(app_java_dir)

    text = manifest.read_text()
    gradle_text = app_gradle.read_text() if app_gradle.exists() else ""
    main_activity = app_java_dir / "MainActivity.java"
    activity_text = main_activity.read_text() if main_activity.exists() else ""
    layout = scan_manifest(text)
    paths = [path for path, _ in layout["elements"]]

    report["structure"] = validate_structure(text, package)
    report["checks"] = {
        "manifest_block": BEGIN in text,
        "plugin_service_removed": PLUGIN_SERVICE in text and 'tools:node="remove"' in text,
        "our_service": ("%s.JobaLiveUpdateMessagingService" % package) in text,
        "receivers": all(
            ("%s.%s" % (package, name)) in text
            for name in ("JobaLiveUpdateActionReceiver", "JobaLiveUpdateOpenReceiver")
        ),
        "components_direct_children": all(
            "manifest/application/%s" % element in paths
            for element, _name in LIVE_COMPONENTS
        ),
        "promoted_permission": "POST_PROMOTED_NOTIFICATIONS" in text,
        "firebase_messaging": (
            "%s:%s" % (FIREBASE_MESSAGING_COORDINATE, messaging_version) in gradle_text
        ),
        "plugin_registered": "JobaLiveUpdatePlugin" in activity_text,
        "sources": all((app_java_dir / name).exists() for name in JAVA_FILES),
        "card_layouts": all((res_layout_dir / name).exists() for name in LAYOUTS),
        "structure_valid": not report["structure"],
    }

    if args.json:
        print(json.dumps(report, indent=2))
    else:
        print("[live-update] package: %s (from %s)" % (package, package_source))
        print("[live-update] firebase-messaging: %s (from %s)" % (messaging_version, messaging_source))
        for key, ok in report["checks"].items():
            print("[live-update] %s %s" % ("OK  " if ok else "MISS", key))
        for problem in report["structure"]:
            print("[live-update] PROBLEM %s" % problem)
        if report["sources"]:
            print("[live-update] installed %d source files, %d drawables, %d layouts"
                  % (len(report["sources"]), len(report["drawables"]), len(report["layouts"])))

    missing = [key for key, ok in report["checks"].items() if not ok]
    if missing:
        fail("incomplete: " + ", ".join(missing))


if __name__ == "__main__":
    main()